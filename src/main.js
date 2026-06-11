// OpenCode Free Proxy - Dashboard
const { invoke, listen } = window.__TAURI__.core;

// State
const testingModels = new Set();
let isRefreshing = false;
const resultsCache = {};
let dragSrcId = null;

// Init
document.addEventListener('DOMContentLoaded', () => { refreshStatus(); });

// Toast
function showToast(msg) {
  const el = document.getElementById('toast');
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
  try { await navigator.clipboard.writeText(text); showToast('Copied'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied');
  }
}

// Refresh
async function refreshStatus() {
  if (isRefreshing) return;
  isRefreshing = true;
  const btn = document.getElementById('refreshBtn');
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (btn) btn.disabled = true;
  dot.className = 'status-dot';
  text.textContent = 'Loading...';
  try {
    const status = await invoke('get_status');
    updateStatusUI(status);
    await loadPool();
  } catch (e) {
    dot.className = 'status-dot offline';
    text.textContent = 'Failed: ' + e;
  } finally {
    isRefreshing = false;
    if (btn) btn.disabled = false;
  }
}

function updateStatusUI(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (status.running) {
    dot.className = 'status-dot online';
    text.textContent = 'Running on port ' + status.port;
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Stopped';
  }
  document.getElementById('keyCount').textContent = status.keys.length;
  const kl = document.getElementById('keyList');
  kl.innerHTML = '';
  for (const k of status.keys) {
    kl.innerHTML +=
      '<div class="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface2 border border-border">' +
        '<div class="flex flex-col gap-0.5 min-w-0">' +
          '<span class="text-[11px] font-semibold text-muted uppercase">' + esc(k.name) + '</span>' +
          '<span class="text-sm text-white font-mono break-all">' + esc(k.key) + '</span>' +
        '</div>' +
        '<button onclick="copyText(\'' + esc(k.key) + '\')" class="text-base p-1 rounded hover:bg-white/10 cursor-pointer">Copy</button>' +
      '</div>';
  }
}

// Pool
async function loadPool() {
  try {
    const pool = await invoke('get_model_pool');
    document.getElementById('modelCount').textContent = pool.entries.length;
    renderPool(pool.entries);
    return pool.entries;
  } catch (e) {
    document.getElementById('modelList').innerHTML = '<div class="text-center py-5 text-muted text-sm">Load failed: ' + e + '</div>';
    return null;
  }
}

function displayResultHTML(result) {
  if (!result || !result.success) {
    return '<span class="text-red-400">Failed: ' + esc(result?.error || 'unknown') + '</span>';
  }
  return '<span>Latency: <strong>' + result.latency_ms + 'ms</strong></span> ' +
    '<span>Speed: <strong>' + result.tokens_per_sec.toFixed(1) + '</strong> tok/s</span>';
}

function renderPool(entries) {
  const container = document.getElementById('modelList');
  if (!entries || !entries.length) {
    container.innerHTML = '<div class="text-center py-5 text-muted text-sm">No models. Click + Add</div>';
    return;
  }
  const sorted = entries.slice().sort((a, b) => a.priority - b.priority);
  let html = '';
  for (const e of sorted) {
    const isOpen = e.provider_type === 'opencode';
    const tag = isOpen
      ? '<span class="text-[10px] px-1.5 py-0.5 rounded" style="background:#6c8cff;color:white">Free</span>'
      : '<span class="text-[10px] px-1.5 py-0.5 rounded" style="background:#fb923c;color:white">Custom</span>';
    const res = resultsCache[e.name] ? displayResultHTML(resultsCache[e.name]) : '<span>No data</span>';
    const dim = e.enabled ? '' : ' style="opacity:0.5"';
    html +=
      '<div draggable="true" data-id="' + esc(e.id) + '"' + dim + ' class="flex items-center px-3 py-2 rounded-md bg-surface2 border border-border cursor-default" ondragstart="ds(event)" ondragover="dov(event)" ondrop="drop(event)" ondragend="de(event)">' +
        '<span class="drag-h text-muted cursor-grab mr-2 text-sm select-none">⠿</span>' +
        '<div class="flex items-center gap-2 flex-1 min-w-0">' +
          '<button onclick="tog(\'' + esc(e.id) + '\')" class="flex-shrink-0 w-7 h-4 rounded-full relative" style="background:' + (e.enabled ? '#6c8cff' : '#2a2d3e') + '">' +
            '<div class="absolute top-0.5 w-3 h-3 rounded-full bg-white" style="left:' + (e.enabled ? '14px' : '2px') + '"></div>' +
          '</button>' +
          '<div class="flex flex-col gap-0.5 min-w-0 flex-1">' +
            '<div class="flex items-center gap-1.5">' +
              '<span class="text-sm font-medium text-white">' + esc(e.name) + '</span>' +
              tag +
              '<span class="text-[10px] text-muted">#' + e.priority + '</span>' +
            '</div>' +
            '<div id="r-' + esc(e.name) + '" class="flex items-center gap-3 text-xs text-muted">' + res + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-1 flex-shrink-0">' +
          '<div class="relative" id="im-' + esc(e.name) + '">' +
            '<button onclick="togImp(\'' + esc(e.name) + '\')" class="px-2 py-1 rounded text-xs text-white" style="background:#2a2d3e;cursor:pointer">Import</button>' +
            '<div id="impd-' + esc(e.name) + '" class="hidden" style="position:absolute;right:0;top:100%;margin-top:4px;z-index:10;background:#1e2030;border:1px solid #2a2d3e;border-radius:8px;padding:4px 0;min-width:120px">' +
              '<button onclick="impM(\'' + esc(e.name) + "','claude" + "')\" class='block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10' style='cursor:pointer;background:none;border:none'>Claude</button>" +
              '<button onclick="impM(\'' + esc(e.name) + "','codex" + "')\" class='block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10' style='cursor:pointer;background:none;border:none'>Codex</button>" +
              '<button onclick="impM(\'' + esc(e.name) + "','ccswitch" + "')\" class='block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10' style='cursor:pointer;background:none;border:none'>CCSwitch</button>" +
            '</div>' +
          '</div>' +
          (!isOpen ? '<button onclick="remP(\'' + esc(e.id) + "')\" class='px-2 py-1 rounded text-xs' style='color:#f87171;background:rgba(248,113,113,0.1);cursor:pointer;border:none'>X</button>" : '') +
        '</div>' +
      '</div>';
  }
  container.innerHTML = html;
}

// Drag & Drop
function ds(e) { dragSrcId = e.currentTarget.dataset.id; e.currentTarget.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; }
function dov(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const el = e.currentTarget; if (el.dataset.id !== dragSrcId) { el.style.borderColor = '#6c8cff'; el.style.background = 'rgba(108,140,255,0.08)'; } }
function drop(e) {
  e.preventDefault();
  const tgt = e.currentTarget.dataset.id;
  if (!dragSrcId || dragSrcId === tgt) return;
  const els = document.querySelectorAll('#modelList [draggable="true"]');
  const ids = Array.from(els).map(el => el.dataset.id);
  const si = ids.indexOf(dragSrcId), ti = ids.indexOf(tgt);
  if (si < 0 || ti < 0) return;
  ids.splice(ti, 0, ids.splice(si, 1)[0]);
  saveReorder(ids);
}
function de(e) { e.currentTarget.style.opacity = ''; e.currentTarget.style.borderColor = ''; document.querySelectorAll('#modelList [draggable="true"]').forEach(el => { el.style.borderColor = ''; el.style.background = ''; }); dragSrcId = null; }

async function saveReorder(ids) {
  try { await invoke('reorder_pool', { ids }); await loadPool(); showToast('Saved order'); }
  catch (e) { showToast('Error: ' + e); }
}

// Pool actions
async function tog(id) { try { await invoke('toggle_pool_entry', { id }); await loadPool(); } catch (e) { showToast('Error: ' + e); } }
async function remP(id) { try { await invoke('remove_pool_entry', { id }); showToast('Removed'); await loadPool(); } catch (e) { showToast('Error: ' + e); } }

// Speed test
async function batchTestAll() {
  if (isRefreshing) return;
  isRefreshing = true;
  const btn = document.getElementById('batchTestBtn');
  if (btn) btn.disabled = true;
  try {
    resultsCache = {};
    const entries = await loadPool();
    if (entries && entries.length > 0) {
      showToast('Testing ' + entries.length + ' models...');
      for (const e of entries) await testOne(e.name);
      showToast('Done');
    } else { showToast('No models'); }
  } catch (e) { showToast('Error: ' + e); }
  finally { isRefreshing = false; if (btn) btn.disabled = false; }
}

async function testOne(name) {
  if (testingModels.has(name)) return;
  testingModels.add(name);
  const el = document.getElementById('r-' + name);
  if (el) el.innerHTML = '<span>Testing...</span>';
  try {
    const r = await invoke('run_speed_test_cmd', { req: { model: name } });
    resultsCache[name] = r;
    const el2 = document.getElementById('r-' + name);
    if (el2) el2.innerHTML = displayResultHTML(r);
  } catch (e) {
    const el2 = document.getElementById('r-' + name);
    if (el2) el2.innerHTML = '<span class="text-red-400">Error</span>';
  } finally { testingModels.delete(name); }
}

try { listen('speed-test-complete', (e) => { const r = e.payload; resultsCache[r.model] = r; const el = document.getElementById('r-' + r.model); if (el) el.innerHTML = displayResultHTML(r); }); } catch(ex) {}

// Import dropdown
function togImp(name) {
  document.querySelectorAll('[id^="impd-"]').forEach(el => el.classList.add('hidden'));
  const d = document.getElementById('impd-' + name);
  if (d) d.classList.toggle('hidden');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('[id^="im-"]')) document.querySelectorAll('[id^="impd-"]').forEach(el => el.classList.add('hidden'));
});

async function impM(name, tool) {
  document.querySelectorAll('[id^="impd-"]').forEach(el => el.classList.add('hidden'));
  try {
    const status = await invoke('get_status');
    const key = status.keys[0]?.key;
    if (!key) { showToast('No API key'); return; }
    const r = await invoke('import_to_tool', { req: { model: name, model_name: name, api_key: key, tool } });
    showToast(r);
  } catch (e) { showToast('Error: ' + e); }
}

// Pool import
function togPImp() { const d = document.getElementById('import-pool-dropdown'); if (d) d.classList.toggle('hidden'); }
async function impPool(tool) {
  document.getElementById('import-pool-dropdown')?.classList.add('hidden');
  try {
    const status = await invoke('get_status');
    const key = status.keys[0]?.key;
    if (!key) { showToast('No API key'); return; }
    const r = await invoke('import_to_tool', { req: { model: 'ModelPool', model_name: '', api_key: key, tool } });
    showToast(r);
  } catch (e) { showToast('Error: ' + e); }
}

// Add provider dialog
function showAddDialog() {
  document.getElementById('addDialog').classList.remove('hidden');
  document.getElementById('dlgName').value = '';
  document.getElementById('dlgModel').value = '';
  document.getElementById('dlgUrl').value = '';
  document.getElementById('dlgKey').value = '';
  setTimeout(() => document.getElementById('dlgName').focus(), 100);
}
function hideAddDialog() { document.getElementById('addDialog').classList.add('hidden'); }

async function confirmAddProvider() {
  const name = document.getElementById('dlgName').value.trim();
  const model_name = document.getElementById('dlgModel').value.trim() || name;
  const base_url = document.getElementById('dlgUrl').value.trim();
  const api_key = document.getElementById('dlgKey').value.trim();
  const api_format = document.querySelector('input[name="apiFormat"]:checked')?.value || 'openai';
  if (!name) { showToast('Enter name'); return; }
  try {
    await invoke('upsert_pool_entry', { req: { id: null, name, base_url, api_key, model_name, priority: 999, enabled: true, builtin: false, provider_type: base_url ? 'custom' : 'opencode', api_format } });
    hideAddDialog();
    showToast('Added: ' + name);
    await loadPool();
  } catch (e) { showToast('Error: ' + e); }
}

// Escaping
function esc(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
