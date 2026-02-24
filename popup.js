document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const hiddenCountEl = document.getElementById('hiddenCount');
  const resetBtn = document.getElementById('resetBtn');
  const blacklistInput = document.getElementById('blacklistInput');
  const saveBlacklistBtn = document.getElementById('saveBlacklist');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const testApiKeyBtn = document.getElementById('testApiKey');
  const apiTestResult = document.getElementById('apiTestResult');
  const apiProvider = document.getElementById('apiProvider');
  const apiEndpoint = document.getElementById('apiEndpoint');

  let isEnabled = true;
  let hiddenCount = 0;
  let customBlacklist = [];
  let geminiApiKey = '';
  let selectedProvider = 'gemini';
  let customEndpoint = '';

  async function loadState() {
    const result = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist', 'geminiApiKey', 'apiProvider', 'customEndpoint']);
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    hiddenCount = result.hiddenCount || 0;
    customBlacklist = result.customBlacklist || [];
    geminiApiKey = result.geminiApiKey || '';
    selectedProvider = result.apiProvider || 'gemini';
    customEndpoint = result.customEndpoint || '';
    updateUI();
  }

  function updateUI() {
    enableToggle.checked = isEnabled;
    hiddenCountEl.textContent = hiddenCount;
    blacklistInput.value = customBlacklist.join('\n');
    geminiApiKeyInput.value = geminiApiKey;
    apiProvider.value = selectedProvider;
    apiEndpoint.value = customEndpoint;
    apiEndpoint.style.display = selectedProvider === 'custom' ? 'block' : 'none';
  }

  async function saveState() {
    await chrome.storage.local.set({ isEnabled, hiddenCount, customBlacklist, geminiApiKey, apiProvider: selectedProvider, customEndpoint });
  }

  enableToggle.addEventListener('change', async () => {
    isEnabled = enableToggle.checked;
    await saveState();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleEnabled', enabled: isEnabled });
      }
    } catch (error) {}
  });

  resetBtn.addEventListener('click', async () => {
    hiddenCount = 0;
    await saveState();
    hiddenCountEl.textContent = '0';
    hiddenCountEl.style.transform = 'scale(1.2)';
    setTimeout(() => hiddenCountEl.style.transform = 'scale(1)', 150);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'resetCount' });
      }
    } catch (error) {}
  });

  saveBlacklistBtn.addEventListener('click', async () => {
    customBlacklist = blacklistInput.value.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    await saveState();
    saveBlacklistBtn.textContent = 'Saved!';
    saveBlacklistBtn.style.opacity = '0.8';
    setTimeout(() => {
      saveBlacklistBtn.textContent = 'Save Keywords';
      saveBlacklistBtn.style.opacity = '1';
    }, 1200);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'updateBlacklist', blacklist: customBlacklist });
      }
    } catch (error) {}
  });

  apiProvider.addEventListener('change', () => {
    selectedProvider = apiProvider.value;
    apiEndpoint.style.display = selectedProvider === 'custom' ? 'block' : 'none';
    saveState();
    try {
      chrome.runtime.sendMessage({ 
        action: 'updateApiConfig', 
        apiKey: geminiApiKey,
        provider: selectedProvider,
        endpoint: customEndpoint
      });
    } catch (error) {}
  });

  apiEndpoint.addEventListener('input', () => {
    customEndpoint = apiEndpoint.value.trim();
    saveState();
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    geminiApiKey = geminiApiKeyInput.value.trim();
    selectedProvider = apiProvider.value;
    customEndpoint = apiEndpoint.value.trim();
    await saveState();
    saveApiKeyBtn.textContent = 'Saved!';
    saveApiKeyBtn.style.opacity = '0.8';
    setTimeout(() => {
      saveApiKeyBtn.textContent = 'Save';
      saveApiKeyBtn.style.opacity = '1';
    }, 1200);
    try {
      chrome.runtime.sendMessage({ 
        action: 'updateApiConfig', 
        apiKey: geminiApiKey,
        provider: selectedProvider,
        endpoint: customEndpoint
      });
    } catch (error) {}
  });

  testApiKeyBtn.addEventListener('click', async () => {
    const keyToTest = geminiApiKeyInput.value.trim();
    const provider = apiProvider.value;
    const endpoint = apiEndpoint.value.trim();
    
    if (!keyToTest) {
      apiTestResult.className = 'api-status error';
      apiTestResult.textContent = 'Enter an API key first';
      return;
    }

    testApiKeyBtn.textContent = 'Testing...';
    testApiKeyBtn.disabled = true;
    apiTestResult.className = 'api-status';
    apiTestResult.textContent = 'Testing...';

    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'testApiKey', 
        apiKey: keyToTest,
        provider: provider,
        endpoint: endpoint
      });
      testApiKeyBtn.textContent = 'Test Key';
      testApiKeyBtn.disabled = false;

      if (response && response.success) {
        apiTestResult.className = 'api-status success';
        apiTestResult.textContent = 'API Key is working!';
      } else {
        const errorMsg = response?.error ? response.error.slice(0, 80) : 'Invalid key';
        apiTestResult.className = 'api-status error';
        apiTestResult.textContent = 'Error: ' + errorMsg;
      }
    } catch (error) {
      testApiKeyBtn.textContent = 'Test Key';
      testApiKeyBtn.disabled = false;
      apiTestResult.className = 'api-status error';
      apiTestResult.textContent = 'Error: ' + error.message;
    }
  });

  async function startCountPolling() {
    setInterval(async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStats' });
          if (response && response.hiddenCount !== undefined) {
            hiddenCount = response.hiddenCount;
            hiddenCountEl.textContent = hiddenCount;
          }
        }
      } catch (error) {}
    }, 2000);
  }

  await loadState();
  startCountPolling();
});
