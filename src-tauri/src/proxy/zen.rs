use rand::RngCore;
use reqwest::{Client, Response};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const OC_VERSION: &str = "1.15.0";
const ZEN_URL: &str = "https://opencode.ai/zen/v1/chat/completions";
const TIMEOUT_SECS: u64 = 120;
const SESSION_ROTATION_MS: u64 = 30 * 60 * 1000;

pub struct ZenClient {
    client: Client,
}

impl ZenClient {
    pub fn new() -> Result<Self, reqwest::Error> {
        let client = Client::builder()
            .timeout(Duration::from_secs(TIMEOUT_SECS))
            .user_agent(format!(
                "opencode/{OC_VERSION} ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.13"
            ))
            .build()?;
        Ok(ZenClient { client })
    }

    pub fn build_headers(session_id: &str) -> reqwest::header::HeaderMap {
        use reqwest::header::*;
        let mut headers = HeaderMap::new();
        headers.insert(
            CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        headers.insert(AUTHORIZATION, "Bearer public".parse().unwrap());
        headers.insert(
            HeaderName::from_static("x-opencode-client"),
            "cli".parse().unwrap(),
        );
        headers.insert(
            HeaderName::from_static("x-opencode-project"),
            "global".parse().unwrap(),
        );
        headers.insert(
            HeaderName::from_static("x-opencode-request"),
            format!("msg_{:x}", rand::random::<u64>())
                .parse()
                .unwrap(),
        );
        headers.insert(
            HeaderName::from_static("x-opencode-session"),
            session_id.parse().unwrap(),
        );
        headers
    }

    pub fn build_request_body(
        model: &str,
        messages: &serde_json::Value,
        stream: bool,
        tools: Option<&serde_json::Value>,
    ) -> (serde_json::Value, String) {
        let mut body = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": stream,
        });

        if let Some(tools) = tools {
            if let Some(arr) = tools.as_array() {
                if !arr.is_empty() {
                    body["tools"] = tools.clone();
                }
            }
        }

        let body_str = serde_json::to_string(&body).unwrap_or_default();
        (body, body_str)
    }

    pub async fn send_streaming(
        &self,
        body_str: String,
        session_id: &str,
    ) -> Result<Response, reqwest::Error> {
        let headers = Self::build_headers(session_id);
        self.client
            .post(ZEN_URL)
            .headers(headers)
            .body(body_str)
            .send()
            .await
    }

    pub async fn send_non_streaming(
        &self,
        body_str: String,
        session_id: &str,
    ) -> Result<(reqwest::StatusCode, serde_json::Value), reqwest::Error> {
        let headers = Self::build_headers(session_id);
        let response = self
            .client
            .post(ZEN_URL)
            .headers(headers)
            .body(body_str)
            .timeout(Duration::from_secs(TIMEOUT_SECS))
            .send()
            .await?;

        let status = response.status();
        let body: serde_json::Value =
            response.json().await.unwrap_or(serde_json::json!({}));
        Ok((status, body))
    }

    pub fn is_error(body: &serde_json::Value) -> bool {
        body.get("error").is_some()
            || body
                .get("type")
                .and_then(|t| t.as_str())
                == Some("error")
    }

    pub fn extract_error(body: &serde_json::Value) -> String {
        body.pointer("/error/message")
            .and_then(|m| m.as_str())
            .or_else(|| body.get("message").and_then(|m| m.as_str()))
            .unwrap_or("Unknown error")
            .to_string()
    }
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, (String, u64)>>,
}

impl SessionManager {
    pub fn new() -> Self {
        SessionManager {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_session(&self, user: &str) -> String {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let mut sessions = self.sessions.lock().unwrap();

        if let Some((session_id, ts)) = sessions.get(user) {
            if now - *ts < SESSION_ROTATION_MS {
                return session_id.clone();
            }
        }

        let ts_hex = format!("{:x}", now);
        let mut rnd_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut rnd_bytes);
        let rnd: String = rnd_bytes.iter().map(|b| format!("{:02x}", b)).collect();
        let session_id = format!("ses_{}{}", ts_hex, rnd);

        sessions.insert(user.to_string(), (session_id.clone(), now));
        session_id
    }
}
