let apiKey = '';
let apiProvider = 'gemini';
let customEndpoint = '';

const API_CONFIGS = {
  gemini: {
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    body: (p) => JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 10 } }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parse: (d) => d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || ''
  },
  openrouter: {
    url: (key) => `https://openrouter.ai/api/v1/chat/completions`,
    body: (p) => JSON.stringify({ model: 'google/gemini-2.0-flash-001', messages: [{ role: 'user', content: p }], max_tokens: 10 }),
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://twitter.com', 'X-Title': 'Tweet-Noise' }),
    parse: (d) => d?.choices?.[0]?.message?.content?.trim().toUpperCase() || ''
  },
  minimax: {
    url: () => `https://api.minimax.chat/v1/text/chatcompletion_v2`,
    body: (p, key) => { const k = key.split(':')[1] || key; return JSON.stringify({ model: 'abab6.5s-chat', messages: [{ role: 'user', content: p }] }); },
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.split(':')[1] || key}` }),
    parse: (d) => d?.choices?.[0]?.message?.content?.trim().toUpperCase() || ''
  },
  opencode: {
    url: () => `https://opencode.ai/api/v1/generate`,
    body: (p) => JSON.stringify({ prompt: p, model: 'opencode' }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parse: (d) => d?.completion?.trim().toUpperCase() || ''
  },
  custom: {
    url: (_, ep) => ep || '',
    body: (p) => JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: p }], max_tokens: 10 }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parse: (d) => d?.choices?.[0]?.message?.content?.trim().toUpperCase() || d?.text?.toUpperCase() || ''
  }
};

const PROMPT = `Classify: HIDE (shitpost/ragebait/engagement bait/viral chase), AD, or KEEP (tech/news/code). Tweet: "{text}" Video: {video}. Reply: HIDE, AD, or KEEP`;

chrome.storage.local.get(['geminiApiKey', 'apiProvider', 'customEndpoint'], (r) => {
  if (r.geminiApiKey) apiKey = r.geminiApiKey;
  if (r.apiProvider) apiProvider = r.apiProvider;
  if (r.customEndpoint) customEndpoint = r.customEndpoint;
});

chrome.runtime.onInstalled.addListener(async (d) => {
  if (d.reason === 'install') {
    await chrome.storage.local.set({ isEnabled: true, hiddenCount: 0, customBlacklist: [], geminiApiKey: '', apiProvider: 'gemini', customEndpoint: '' });
  }
});

async function analyzeTweet(text, hasVideo) {
  if ((!apiKey && apiProvider !== 'opencode') || !text || text.trim().length < 3) return 'PASS';

  const cfg = API_CONFIGS[apiProvider] || API_CONFIGS.gemini;
  const url = apiProvider === 'custom' ? customEndpoint : cfg.url(apiKey);
  const prompt = PROMPT.replace('{text}', text).replace('{video}', hasVideo ? 'YES' : 'NO');
  const body = cfg.body(prompt, apiKey);
  const headers = cfg.headers(apiKey, body);

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) return 'PASS';
    
    const data = await res.json();
    const result = cfg.parse(data);
    
    if (result.includes('HIDE')) return 'HIDE';
    if (result.includes('AD')) return 'AD';
    if (result.includes('KEEP')) return 'KEEP';
  } catch (e) {}
  return 'PASS';
}

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.action === 'log') {
    console.log('[Tweet-Noise]', msg.data);
    sendResponse({ success: true });
  } else if (msg.action === 'updateApiConfig') {
    apiKey = msg.apiKey;
    apiProvider = msg.provider;
    customEndpoint = msg.endpoint;
    chrome.storage.local.set({ geminiApiKey: apiKey, apiProvider, customEndpoint });
    sendResponse({ success: true });
  } else if (msg.action === 'analyzeTweetAggressive') {
    analyzeTweet(msg.text, msg.hasVideo).then(r => sendResponse({ classification: r }));
    return true;
  } else if (msg.action === 'testApiKey') {
    (async () => {
      const cfg = API_CONFIGS[msg.provider] || API_CONFIGS.gemini;
      const url = msg.provider === 'custom' ? msg.endpoint : cfg.url(msg.apiKey);
      const body = cfg.body('OK', msg.apiKey);
      const headers = cfg.headers(msg.apiKey, body);
      try {
        const res = await fetch(url, { method: 'POST', headers, body });
        sendResponse({ success: res.ok, error: res.ok ? null : await res.text().catch(() => '') });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
  return false;
});
