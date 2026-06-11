// ═══════════════════════════════════════════════
// OpenCode Free Proxy - Dashboard
// ═══════════════════════════════════════════════

const { invoke, listen } = window.__TAURI__.core;

// ── State ──────────────────────────────────────
let testingModels = new Set();
let isRefreshing = false;
let resultsCache = {};

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  refreshStatus();
});

// ── Toast ──────────────────────────────────────
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  setTimeout(() => {
    el.classList.remove('opacity-100');
    el.classList.add('opacity-0');
  }, 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ 已复制到剪贴板');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('✓ 已复制到剪贴板');
  }
}

// ── Refresh Status ─────────────────────────────
async function refreshStatus() {
  if (isRefreshing) return;
  isRefreshing = true;

  const refreshBtn = document.getElementById('refreshBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (refreshBtn) refreshBtn.disabled = true;
  statusDot.className = 'status-dot';
  statusText.textContent = '加载中...';

  try {
    const status = await invoke('get_status');
    updateStatusUI(status);
    await loadPool();
  } catch (e) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = '连接失败: ' + e;
  } finally {
    isRefreshing = false;
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function updateStatusUI(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const keyCount = document.getElementById('keyCount');

  if (status.running) {
    dot.className = 'status-dot online';
    text.textContent = '运行中 · 端口 ' + status.port;
  } else {
    dot.className = 'status-dot offline';
    text.textContent = '已停止';
  }

  keyCount.textContent = status.keys.length;
  const keyList = document.getElementById('keyList');
  keyList.innerHTML = status.keys.map(k => `
    <div class="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface2 border border-border">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-[11px] font-semibold text-muted uppercase tracking-wide">${escapeHtml(k.name)}</span>
        <span class="text-sm text-white font-mono break-all">${escapeHtml(k.key)}</span>
      </div>
      <button onclick="copyText('${escapeHtml(k.key)}')" class="flex-shrink-0 text-base p-1 rounded hover:bg-white/10 transition-colors cursor-pointer" title="复制 Key">📋</button>
    </div>
  `).join('');
}

// ── Pool Mode Toggle ──────────────────────────
async function togglePoolMode() {
  const input = document.getElementById('poolModeInput');
  const newMode = input.checked;
  try {
    await invoke('set_pool_mode', { req: { pool_mode: newMode } });
    updatePoolToggleUI(newMode);
    showToast(newMode ? '🔀 号池模式已开启' : '🔀 号池模式已关闭');
  } catch (e) {
    input.checked = !newMode;
    showToast('❌ ' + e);
  }
}

function updatePoolToggleUI(enabled) {
  const toggle = document.getElementById('poolToggle');
  const dot = document.getElementById('poolToggleDot');
  const label = document.getElementById('poolModeLabel');
  if (enabled) {
    toggle.classList.remove('bg-[#2a2d3e]');
    toggle.classList.add('bg-[#6c8cff]');
    dot.classList.remove('bg-muted', 'left-0.5');
    dot.classList.add('bg-white', 'left-[18px]');
    label.textContent = '号池开';
  } else {
    toggle.classList.add('bg-[#2a2d3e]');
    toggle.classList.remove('bg-[#6c8cff]');
    dot.classList.add('bg-muted', 'left-0.5');
    dot.classList.remove('bg-white', 'left-[18px]');
    label.textContent = '号池关';
  }
}

// ── Model Pool ─────────────────────────────────
async function loadPool() {
  try {
    const pool = await invoke('get_model_pool');
    document.getElementById('modelCount').textContent = pool.entries.length;
    document.getElementById('poolModeInput').checked = pool.pool_mode;
    updatePoolToggleUI(pool.pool_mode);
    renderPool(pool.entries);
    return pool.entries;
  } catch (e) {
    document.getElementById('modelList').innerHTML =
      `<div class="text-center py-5 text-muted text-sm">加载失败: ${e}</div>`;
    return null;
  }
}

function renderPool(entries) {
  const container = document.getElementById('modelList');
  if (!entries || !entries.length) {
    container.innerHTML = `<div class="text-center py-5 text-muted text-sm">暂无模型，点击上方按钮添加</div>`;
    return;
  }

  // Sort by priority
  const sorted = [...entries].sort((a, b) => a.priority - b.priority);

  container.innerHTML = sorted.map(e => {
    const isOpenCode = e.provider_type === 'opencode';
    return `
    <div class="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface2 border border-border ${!e.enabled ? 'opacity-50' : ''}">
      <div class="flex items-center gap-2 min-w-0">
        <!-- Toggle -->
        <button onclick="toggleEntry('${escapeHtml(e.id)}')" class="flex-shrink-0 w-7 h-4 rounded-full transition-colors ${e.enabled ? 'bg-[#6c8cff]' : 'bg-[#2a2d3e]'} relative cursor-pointer">
          <div class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${e.enabled ? 'left-[14px]' : 'left-0.5'}"></div>
        </button>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium text-white">${escapeHtml(e.name)}</span>
            ${isOpenCode
              ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-[#6c8cff] text-white font-semibold leading-none">免费</span>`
              : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-[#fb923c] text-white font-semibold leading-none">自定义</span>`}
            <span class="text-[10px] text-muted">#${e.priority}</span>
          </div>
          <div class="model-results flex items-center gap-3 text-xs text-muted" id="results-${escapeHtml(e.name)}">
            ${resultsCache[e.name] ? '' : '<span>等待测速</span>'}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <div class="relative" id="import-menu-${escapeHtml(e.name)}">
          <button onclick="toggleImportMenu('${escapeHtml(e.name)}')" class="px-2 py-1 rounded text-xs text-white bg-[#2a2d3e] hover:bg-[#3a3d4e] transition-all cursor-pointer whitespace-nowrap">导入</button>
          <div id="import-dropdown-${escapeHtml(e.name)}" class="hidden absolute right-0 top-full mt-1 z-10 bg-surface2 border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
            <button onclick="importModel('${escapeHtml(e.name)}', 'claude')" class="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer">🤖 Claude Code</button>
            <button onclick="importModel('${escapeHtml(e.name)}', 'codex')" class="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer">△ Codex</button>
            <button onclick="importModel('${escapeHtml(e.name)}', 'ccswitch')" class="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer">🔄 CCSwitch</button>
          </div>
        </div>
        ${!isOpenCode
          ? `<button onclick="removeProvider('${escapeHtml(e.id)}')" class="flex-shrink-0 px-2 py-1 rounded text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all cursor-pointer">✕</button>`
          : ''}
      </div>
    </div>
  `}).join('');

  // Re-apply cached results
  for (const [name, result] of Object.entries(resultsCache)) {
    displayTestResult(name, result);
  }
}

// ── Pool Management ───────────────────────────
async function toggleEntry(id) {
  try {
    await invoke('toggle_pool_entry', { id });
    await loadPool();
  } catch (e) {
    showToast('❌ ' + e);
  }
}

async function removeProvider(id) {
  try {
    await invoke('remove_pool_entry', { id });
    showToast('已移除');
    await loadPool();
  } catch (e) {
    showToast('❌ ' + e);
  }
}

async function addCustomProvider() {
  const name = document.getElementById('customModelInput').value.trim();
  const base_url = document.getElementById('customUrlInput').value.trim();
  const api_key = document.getElementById('customKeyInput').value.trim();
  if (!name) { showToast('请输入模型名称'); return; }

  try {
    const req = {
      id: null,
      name: name,
      base_url: base_url,
      api_key: api_key,
      model_name: name,
      priority: 999,
      enabled: true,
      builtin: false,
      provider_type: base_url ? 'custom' : 'opencode',
    };
    await invoke('upsert_pool_entry', { req });
    document.getElementById('customModelInput').value = '';
    document.getElementById('customUrlInput').value = '';
    document.getElementById('customKeyInput').value = '';
    showToast('✓ 已添加: ' + name);
    await loadPool();
  } catch (e) {
    showToast('❌ ' + e);
  }
}

// ── Batch Speed Test ──────────────────────────
async function batchTestAll() {
  if (isRefreshing) return;
  isRefreshing = true;

  const btn = document.getElementById('batchTestBtn');
  if (btn) btn.disabled = true;

  try {
    resultsCache = {};
    const entries = await loadPool();
    if (entries && entries.length > 0) {
      showToast(`⏳ 一键测速 ${entries.length} 个模型...`);
      for (const e of entries) {
        await testModel(e.name);
      }
      showToast('✅ 测速完成');
    } else {
      showToast('暂无模型可测速');
    }
  } catch (e) {
    showToast('❌ 测速出错: ' + e);
  } finally {
    isRefreshing = false;
    if (btn) btn.disabled = false;
  }
}

async function testModel(modelName) {
  if (testingModels.has(modelName)) return;
  testingModels.add(modelName);

  const results = document.getElementById('results-' + modelName);
  if (results) results.innerHTML = `<span class="text-xs text-muted">⏳ 测试中...</span>`;

  try {
    const result = await invoke('run_speed_test_cmd', { req: { model: modelName } });
    displayTestResult(modelName, result);
  } catch (e) {
    const results = document.getElementById('results-' + modelName);
    if (results) results.innerHTML = `<span class="text-xs text-red-400">❌ ${escapeHtml(String(e))}</span>`;
  } finally {
    testingModels.delete(modelName);
  }
}

function displayTestResult(modelName, result) {
  resultsCache[modelName] = result;
  const results = document.getElementById('results-' + modelName);
  if (!results) return;

  if (result.success) {
    const tokensPerSec = result.tokens_per_sec.toFixed(1);
    const latency = result.latency_ms;
    const preview = escapeHtml(result.response_preview.substring(0, 30));
    results.innerHTML = `
      <span>⏱ <strong class="text-white">${latency}ms</strong></span>
      <span>⚡ <strong class="text-white">${tokensPerSec}</strong> tok/s</span>
      <span class="hidden sm:inline">📝 <strong class="text-white">${result.total_tokens}</strong> tokens</span>
    `;
  } else {
    results.innerHTML = `<span class="text-red-400">❌ ${escapeHtml(result.error || '测试失败')}</span>`;
  }
}

// Listen for speed test completion
try {
  listen('speed-test-complete', (event) => {
    const r = event.payload;
    displayTestResult(r.model, r);
  });
} catch(e) {}

// ── Import to Tool ──────────────────────────
function toggleImportMenu(modelName) {
  const dropdown = document.getElementById('import-dropdown-' + modelName);
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.querySelectorAll('[id^="import-dropdown-"]').forEach(el => el.classList.add('hidden'));
  if (isHidden) dropdown.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[id^="import-menu-"]')) {
    document.querySelectorAll('[id^="import-dropdown-"]').forEach(el => el.classList.add('hidden'));
  }
});

async function importModel(modelName, tool) {
  const dropdown = document.getElementById('import-dropdown-' + modelName);
  if (dropdown) dropdown.classList.add('hidden');
  try {
    const status = await invoke('get_status');
    const apiKey = status.keys.length > 0 ? status.keys[0].key : '';
    if (!apiKey) { showToast('❌ 没有可用的 API Key'); return; }
    const result = await invoke('import_to_tool', { req: { model: modelName, api_key: apiKey, tool } });
    showToast(result);
  } catch (e) { showToast('❌ ' + e); }
}

// ── Legacy: still exported for backward compat ──
async function addCustomModel() { addCustomProvider(); }
async function removeCustomModel(name) {
  // Find entry by name and remove it
  try {
    const pool = await invoke('get_model_pool');
    const entry = pool.entries.find(e => e.name === name);
    if (entry) await removeProvider(entry.id);
  } catch(e) { showToast('❌ ' + e); }
}
async function loadModels() { return loadPool(); }

// ── Utilities ──────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
