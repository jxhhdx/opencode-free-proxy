use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Simple in-memory ring buffer log for the app.
pub struct AppLog {
    entries: Mutex<Vec<LogEntry>>,
    max: usize,
}

#[derive(Clone, serde::Serialize)]
pub struct LogEntry {
    pub level: String,
    pub msg: String,
    pub time: String,
}

impl AppLog {
    pub fn new(max: usize) -> Self {
        AppLog { entries: Mutex::new(Vec::new()), max }
    }

    fn fmt_time() -> String {
        let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
        let secs = d.as_secs() % 86400;
        let h = secs / 3600;
        let m = (secs % 3600) / 60;
        let s = secs % 60;
        format!("{:02}:{:02}:{:02}", h, m, s)
    }

    pub fn info(&self, msg: String) { self.push("INFO", msg); }
    pub fn warn(&self, msg: String) { self.push("WARN", msg); }
    pub fn error(&self, msg: String) { self.push("ERROR", msg); }

    fn push(&self, level: &str, msg: String) {
        let time = Self::fmt_time();
        let mut entries = self.entries.lock().unwrap();
        entries.push(LogEntry { level: level.into(), msg, time });
        while entries.len() > self.max { entries.remove(0); }
    }

    pub fn get_all(&self) -> Vec<LogEntry> {
        self.entries.lock().unwrap().clone()
    }
}
