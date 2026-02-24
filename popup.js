document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const els = {
    enableToggle: $('enableToggle'),
    uiToggle: $('uiToggle'),
    hiddenCount: $('hiddenCount'),
    resetBtn: $('resetBtn'),
    blacklistInput: $('blacklistInput'),
    saveBlacklist: $('saveBlacklist'),
    apiProvider: $('apiProvider'),
    apiKeyInput: $('geminiApiKeyInput'),
    apiEndpoint: $('apiEndpoint'),
    saveApiKey: $('saveApiKey'),
    testApiKey: $('testApiKey'),
    apiTestResult: $('apiTestResult')
  };

  let state = { isEnabled: true, hideUI: true, hiddenCount: 0, customBlacklist: [], apiKey: '', provider: 'gemini', endpoint: '' };

  async function load() {
    const r = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist', 'geminiApiKey', 'apiProvider', 'customEndpoint', 'hideUI']);
    state = { 
      isEnabled: r.isEnabled !== false, 
      hideUI: r.hideUI !== false,
      hiddenCount: r.hiddenCount || 0, 
      customBlacklist: r.customBlacklist || [], 
      apiKey: r.geminiApiKey || '', 
      provider: r.apiProvider || 'gemini', 
      endpoint: r.customEndpoint || '' 
    };
    updateUI();
  }

  function updateUI() {
    els.enableToggle.checked = state.isEnabled;
    els.uiToggle && (els.uiToggle.checked = state.hideUI);
    els.hiddenCount.textContent = state.hiddenCount;
    els.blacklistInput.value = state.customBlacklist.join('\n');
    els.apiKeyInput.value = state.apiKey;
    els.apiProvider.value = state.provider;
    els.apiEndpoint.value = state.endpoint;
    els.apiEndpoint.style.display = state.provider === 'custom' ? 'block' : 'none';
    updateStatusBadge(state.isEnabled);
  }

  function updateStatusBadge(enabled) {
    const badge = document.querySelector('.status-text');
    const dot = document.querySelector('.status-dot');
    if (badge && dot) {
      badge.textContent = enabled ? 'Active' : 'Off';
      dot.style.background = enabled ? '#fff' : '#737373';
    }
  }

  async function save() {
    await chrome.storage.local.set({ isEnabled: state.isEnabled, hideUI: state.hideUI, hiddenCount: state.hiddenCount, customBlacklist: state.customBlacklist, geminiApiKey: state.apiKey, apiProvider: state.provider, customEndpoint: state.endpoint });
  }

  els.enableToggle.onchange = async () => {
    state.isEnabled = els.enableToggle.checked;
    updateStatusBadge(state.isEnabled);
    await save();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab?.id && chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled', enabled: state.isEnabled });
    } catch (e) {}
  };

  els.uiToggle.onchange = async () => {
    state.hideUI = els.uiToggle.checked;
    await save();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab?.id && chrome.tabs.sendMessage(tab.id, { action: 'toggleUI', enabled: state.hideUI });
    } catch (e) {}
  };

  els.resetBtn.onclick = async () => {
    state.hiddenCount = 0;
    els.hiddenCount.textContent = '0';
    els.hiddenCount.style.transform = 'scale(1.15)';
    setTimeout(() => els.hiddenCount.style.transform = 'scale(1)', 120);
    await save();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab?.id && chrome.tabs.sendMessage(tab.id, { action: 'resetCount' });
    } catch (e) {}
  };

  els.saveBlacklist.onclick = async () => {
    state.customBlacklist = els.blacklistInput.value.split('\n').map(k => k.trim()).filter(k => k);
    await save();
    els.saveBlacklist.textContent = 'Saved!';
    setTimeout(() => els.saveBlacklist.textContent = 'Save Keywords', 1000);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab?.id && chrome.tabs.sendMessage(tab.id, { action: 'updateBlacklist', blacklist: state.customBlacklist });
    } catch (e) {}
  };

  els.apiProvider.onchange = () => {
    state.provider = els.apiProvider.value;
    els.apiEndpoint.style.display = state.provider === 'custom' ? 'block' : 'none';
    save();
    try { chrome.runtime.sendMessage({ action: 'updateApiConfig', apiKey: state.apiKey, provider: state.provider, endpoint: state.endpoint }); } catch (e) {}
  };

  els.apiEndpoint.oninput = () => {
    state.endpoint = els.apiEndpoint.value.trim();
    save();
  };

  els.saveApiKey.onclick = async () => {
    state.apiKey = els.apiKeyInput.value.trim();
    state.provider = els.apiProvider.value;
    state.endpoint = els.apiEndpoint.value.trim();
    await save();
    els.saveApiKey.textContent = 'Saved!';
    setTimeout(() => els.saveApiKey.textContent = 'Save', 1000);
    try { chrome.runtime.sendMessage({ action: 'updateApiConfig', apiKey: state.apiKey, provider: state.provider, endpoint: state.endpoint }); } catch (e) {}
  };

  els.testApiKey.onclick = async () => {
    const key = els.apiKeyInput.value.trim();
    if (!key) { showResult('Enter an API key first', 'error'); return; }
    
    els.testApiKey.textContent = 'Testing...';
    els.testApiKey.disabled = true;
    showResult('Testing...', '');

    try {
      const res = await chrome.runtime.sendMessage({ action: 'testApiKey', apiKey: key, provider: els.apiProvider.value, endpoint: els.apiEndpoint.value.trim() });
      els.testApiKey.textContent = 'Test';
      els.testApiKey.disabled = false;
      if (res?.success) { showResult('API Key is working!', 'success'); }
      else { showResult('Error: ' + (res?.error || 'Invalid key').slice(0, 60), 'error'); }
    } catch (e) {
      els.testApiKey.textContent = 'Test';
      els.testApiKey.disabled = false;
      showResult('Error: ' + e.message, 'error');
    }
  };

  function showResult(msg, type) {
    els.apiTestResult.textContent = msg;
    els.apiTestResult.className = 'api-result show ' + type;
  }

  setInterval(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const res = await chrome.tabs.sendMessage(tab.id, { action: 'getStats' });
        if (res?.hiddenCount !== undefined) {
          state.hiddenCount = res.hiddenCount;
          els.hiddenCount.textContent = state.hiddenCount;
        }
      }
    } catch (e) {}
  }, 2000);

  await load();
});
