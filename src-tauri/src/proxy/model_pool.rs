use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A single entry in the model pool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPoolEntry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub model_name: String,
    pub priority: u32,
    pub enabled: bool,
    pub builtin: bool,
    #[serde(default = "default_provider_type")]
    pub provider_type: String,
}

fn default_provider_type() -> String {
    "opencode".into()
}

/// The full model pool configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPool {
    pub pool_mode: bool,
    pub entries: Vec<ModelPoolEntry>,
}

impl ModelPool {
    pub fn new() -> Self {
        ModelPool {
            pool_mode: false,
            entries: Vec::new(),
        }
    }

    /// Load or initialize the pool from disk.
    pub fn load(path: &PathBuf) -> Self {
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(pool) = serde_json::from_str::<ModelPool>(&content) {
                return pool;
            }
        }
        Self::new()
    }

    /// Save to disk.
    pub fn save(&self, path: &PathBuf) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(content) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(path, content);
        }
    }

    /// Get all enabled entries sorted by priority (ascending).
    pub fn get_enabled(&self) -> Vec<&ModelPoolEntry> {
        let mut enabled: Vec<&ModelPoolEntry> = self.entries.iter().filter(|e| e.enabled).collect();
        enabled.sort_by_key(|e| e.priority);
        enabled
    }

    /// Find entry by ID.
    pub fn get_by_id(&self, id: &str) -> Option<&ModelPoolEntry> {
        self.entries.iter().find(|e| e.id == id)
    }

    /// Find entry by model name (for mapping request model to pool entry).
    pub fn get_by_name(&self, name: &str) -> Option<&ModelPoolEntry> {
        self.entries.iter().find(|e| e.name == name || e.model_name == name)
    }

    /// Find index of entry by ID.
    fn index_by_id(&self, id: &str) -> Option<usize> {
        self.entries.iter().position(|e| e.id == id)
    }

    /// Add or update an entry.
    pub fn upsert(&mut self, entry: ModelPoolEntry) {
        if let Some(idx) = self.index_by_id(&entry.id) {
            self.entries[idx] = entry;
        } else {
            self.entries.push(entry);
        }
    }

    /// Remove an entry by ID.
    pub fn remove(&mut self, id: &str) {
        self.entries.retain(|e| e.id != id);
    }

    /// Toggle enable/disable for an entry.
    pub fn toggle_enabled(&mut self, id: &str) -> bool {
        if let Some(idx) = self.index_by_id(id) {
            self.entries[idx].enabled = !self.entries[idx].enabled;
            self.entries[idx].enabled
        } else {
            false
        }
    }

    /// Set priority for an entry.
    pub fn set_priority(&mut self, id: &str, priority: u32) {
        if let Some(idx) = self.index_by_id(id) {
            self.entries[idx].priority = priority;
        }
    }

    /// Initialize built-in OpenCode models (replaces all opencode entries).
    pub fn init_builtins(&mut self, model_names: &[&str]) {
        // Remove existing opencode entries
        self.entries.retain(|e| e.provider_type != "opencode");

        for (i, name) in model_names.iter().enumerate() {
            self.entries.push(ModelPoolEntry {
                id: format!("opencode-{}", name),
                name: name.to_string(),
                base_url: String::new(),
                api_key: String::new(),
                model_name: name.to_string(),
                priority: (i + 1) as u32,
                enabled: true,
                builtin: true,
                provider_type: "opencode".into(),
            });
        }
    }
}
