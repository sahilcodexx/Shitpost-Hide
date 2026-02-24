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

  let isEnabled = true;
  let hiddenCount = 0;
  let customBlacklist = [];
  let geminiApiKey = '';

  async function loadState() {
    const result = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist', 'geminiApiKey']);
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    hiddenCount = result.hiddenCount || 0;
    customBlacklist = result.customBlacklist || [];
    geminiApiKey = result.geminiApiKey || '';
    updateUI();
  }

  function updateUI() {
    enableToggle.checked = isEnabled;
    hiddenCountEl.textContent = hiddenCount;
    blacklistInput.value = customBlacklist.join('\n');
    geminiApiKeyInput.value = geminiApiKey;
  }

  async function saveState() {
    await chrome.storage.local.set({ isEnabled, hiddenCount, customBlacklist, geminiApiKey });
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
    hiddenCountEl.classList.add('pulse');
    setTimeout(() => hiddenCountEl.classList.remove('pulse'), 300);
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
    saveBlacklistBtn.classList.add('success');
    setTimeout(() => {
      saveBlacklistBtn.textContent = 'Save Keywords';
      saveBlacklistBtn.classList.remove('success');
    }, 1500);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'updateBlacklist', blacklist: customBlacklist });
      }
    } catch (error) {}
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    geminiApiKey = geminiApiKeyInput.value.trim();
    await saveState();
    saveApiKeyBtn.textContent = 'Saved!';
    saveApiKeyBtn.classList.add('success');
    setTimeout(() => {
      saveApiKeyBtn.textContent = 'Save API Key';
      saveApiKeyBtn.classList.remove('success');
    }, 1500);
    try {
      chrome.runtime.sendMessage({ action: 'updateApiKey', apiKey: geminiApiKey });
    } catch (error) {}
  });

  testApiKeyBtn.addEventListener('click', async () => {
    const keyToTest = geminiApiKeyInput.value.trim();
    if (!keyToTest) {
      apiTestResult.textContent = 'Please enter an API key first.';
      apiTestResult.style.color = '#f4212e';
      return;
    }

    testApiKeyBtn.textContent = 'Testing...';
    testApiKeyBtn.disabled = true;
    apiTestResult.textContent = 'Testing...';
    apiTestResult.style.color = '#8b98a5';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'testApiKey', apiKey: keyToTest });
      testApiKeyBtn.textContent = 'Test';
      testApiKeyBtn.disabled = false;

      if (response && response.success) {
        apiTestResult.textContent = 'API Key is working!';
        apiTestResult.style.color = '#00ba7c';
      } else {
        apiTestResult.textContent = 'Invalid API Key or network error.';
        apiTestResult.style.color = '#f4212e';
      }
    } catch (error) {
      testApiKeyBtn.textContent = 'Test';
      testApiKeyBtn.disabled = false;
      apiTestResult.textContent = 'Invalid API Key or network error.';
      apiTestResult.style.color = '#f4212e';
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
