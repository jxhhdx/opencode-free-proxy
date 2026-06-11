use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyEntry {
    pub name: String,
    pub key: String,
}

pub struct AuthManager {
    keys: HashMap<String, String>,
    keys_path: PathBuf,
}

impl AuthManager {
    pub fn new(keys_path: PathBuf) -> Self {
        let mut manager = AuthManager {
            keys: HashMap::new(),
            keys_path,
        };
        manager.load_or_generate();
        manager
    }

    fn load_or_generate(&mut self) {
        if let Ok(content) = std::fs::read_to_string(&self.keys_path) {
            if let Ok(keys) = serde_json::from_str::<HashMap<String, String>>(&content) {
                if !keys.is_empty() {
                    self.keys = keys;
                    return;
                }
            }
        }

        let admin_key = format!("oc-{}", Self::random_hex(20));
        let user_key = format!("oc-{}", Self::random_hex(20));
        self.keys
            .insert("admin".to_string(), admin_key);
        self.keys
            .insert("user-default".to_string(), user_key);
        self.save();
    }

    fn random_hex(len: usize) -> String {
        let mut bytes = vec![0u8; len];
        rand::thread_rng().fill_bytes(&mut bytes);
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }

    pub fn save(&self) {
        if let Some(parent) = self.keys_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        if let Ok(content) = serde_json::to_string_pretty(&self.keys) {
            std::fs::write(&self.keys_path, content).ok();
        }
    }

    pub fn authenticate(&self, auth_header: Option<&str>) -> Option<String> {
        let header = auth_header?;
        let token = if header.starts_with("Bearer ") {
            &header[7..]
        } else {
            header
        };

        for (name, key) in &self.keys {
            if token == key {
                return Some(name.clone());
            }
        }
        None
    }

    pub fn get_keys(&self) -> Vec<ApiKeyEntry> {
        let mut entries: Vec<ApiKeyEntry> = self
            .keys
            .iter()
            .map(|(name, key)| ApiKeyEntry {
                name: name.clone(),
                key: key.clone(),
            })
            .collect();
        entries.sort_by(|a, b| a.name.cmp(&b.name));
        entries
    }
}
