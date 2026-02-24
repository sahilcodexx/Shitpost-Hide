let apiKey = '';
let apiProvider = 'gemini';
let customEndpoint = '';

const API_CONFIGS = {
  gemini: {
    name: 'Google Gemini',
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    prompt: (text, hasVideo) => `
You are an AI filtering assistant for a user's X (Twitter) timeline.
Your goal is to classify if the following tweet text is a shitpost, ragepost, engagement bait, ad/promoted content, or genuinely useful/interesting content.

The tweet text is: "${text}"
Has a video attached: ${hasVideo ? 'YES' : 'NO'}

Please reply with EXACTLY one of the following words and nothing else:
- HIDE: if it is a shitpost (nonsense, memes without value), ragebait (designed to anger), low-effort engagement farming, finance/wealth bragging ("0 to 100k"), repetitive hardware debates (Macbook vs Thinkpad without technical depth), AI-generated slop, or pure non-sense content.
- AD: if it is an ad or sponsored product placement.
- KEEP: if it is genuine technical discussion, programming question, actual code, news, thoughtful content, or any post with real value. Err on the side of KEEPING.
    `.trim(),
    body: (prompt) => JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
    })
  },
  openai: {
    name: 'OpenAI',
    url: (key) => `https://api.openai.com/v1/chat/completions`,
    prompt: (text, hasVideo) => `
You are an AI filtering assistant for a user's X (Twitter) timeline.
Classify if this tweet is HIDE (shitpost/ragebait/engagement bait/ads), AD (advertisement), or KEEP (genuinely useful content).

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply with exactly one word: HIDE, AD, or KEEP
    `.trim(),
    body: (prompt) => JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10
    })
  },
  anthropic: {
    name: 'Anthropic Claude',
    url: (key) => `https://api.anthropic.com/v1/messages`,
    prompt: (text, hasVideo) => `
You are an AI filtering assistant for a user's X (Twitter) timeline.
Classify if this tweet is HIDE (shitpost/ragebait/engagement bait/ads), AD (advertisement), or KEEP (genuinely useful content).

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply with exactly one word: HIDE, AD, or KEEP
    `.trim(),
    body: (prompt) => JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    })
  },
  groq: {
    name: 'Groq',
    url: (key) => `https://api.groq.com/openai/v1/chat/completions`,
    prompt: (text, hasVideo) => `
You are an AI filtering assistant for X (Twitter).
Classify this tweet: HIDE (shitpost/ragebait/engagement bait/ads), AD (advertisement), or KEEP (useful content).

Tweet: "${text}"
Video: ${hasVideo ? 'YES' : 'NO'}

Reply: HIDE, AD, or KEEP
    `.trim(),
    body: (prompt) => JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10
    })
  },
  custom: {
    name: 'Custom',
    url: (key, endpoint) => endpoint,
    prompt: (text, hasVideo) => `
Classify this tweet: HIDE (shitpost/ragebait/engagement bait/ads), AD (advertisement), or KEEP (useful content).

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply: HIDE, AD, or KEEP
    `.trim(),
    body: (prompt) => JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10
    })
  }
};

chrome.storage.local.get(['geminiApiKey', 'apiProvider', 'customEndpoint'], (result) => {
  if (result.geminiApiKey) apiKey = result.geminiApiKey;
  if (result.apiProvider) apiProvider = result.apiProvider;
  if (result.customEndpoint) customEndpoint = result.customEndpoint;
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      isEnabled: true,
      hiddenCount: 0,
      customBlacklist: [],
      geminiApiKey: '',
      apiProvider: 'gemini',
      customEndpoint: ''
    });
  }
});

async function analyzeTweetWithAI(text, hasVideo) {
  if (!apiKey) return 'PASS';
  if (!text || text.trim().length < 5) return 'PASS';

  const config = API_CONFIGS[apiProvider] || API_CONFIGS.gemini;
  const endpoint = apiProvider === 'custom' ? customEndpoint : config.url(apiKey);
  const prompt = config.prompt(text, hasVideo);
  const body = config.body(prompt);

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiProvider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (apiProvider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (apiProvider === 'groq') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      console.error('[Tweet-Noise-Canceler AI] API Error:', response.status);
      return 'PASS';
    }

    const data = await response.json();
    let resultText = '';

    if (apiProvider === 'gemini') {
      resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    } else if (apiProvider === 'openai' || apiProvider === 'groq') {
      resultText = data?.choices?.[0]?.message?.content?.trim().toUpperCase();
    } else if (apiProvider === 'anthropic') {
      resultText = data?.content?.[0]?.text?.trim().toUpperCase();
    } else if (apiProvider === 'custom') {
      resultText = data?.choices?.[0]?.message?.content?.trim().toUpperCase() || data?.text || '';
    }

    if (resultText && (resultText.includes('HIDE') || resultText.includes('AD') || resultText.includes('KEEP'))) {
      if (resultText.includes('HIDE')) return 'HIDE';
      if (resultText.includes('AD')) return 'AD';
      if (resultText.includes('KEEP')) return 'KEEP';
    }

    return 'PASS';
  } catch (error) {
    console.error('[Tweet-Noise-Canceler AI] Error:', error);
    return 'PASS';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    console.log('[Tweet-Noise-Canceler]', message.data);
    sendResponse({ success: true });
  } else if (message.action === 'updateApiConfig') {
    apiKey = message.apiKey;
    apiProvider = message.provider;
    customEndpoint = message.endpoint;
    chrome.storage.local.set({ geminiApiKey: apiKey, apiProvider: apiProvider, customEndpoint: customEndpoint });
    sendResponse({ success: true });
  } else if (message.action === 'analyzeTweet') {
    analyzeTweetWithAI(message.text, message.hasVideo).then((classification) => {
      sendResponse({ classification });
    });
    return true;
  } else if (message.action === 'testApiKey') {
    const config = API_CONFIGS[message.provider] || API_CONFIGS.gemini;
    const endpoint = message.provider === 'custom' ? message.endpoint : config.url(message.apiKey);
    const body = config.body('Reply OK');

    const headers = { 'Content-Type': 'application/json' };
    if (message.provider === 'openai' || message.provider === 'groq') {
      headers['Authorization'] = `Bearer ${message.apiKey}`;
    } else if (message.provider === 'anthropic') {
      headers['x-api-key'] = message.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    fetch(endpoint, { method: 'POST', headers, body })
      .then(res => sendResponse({ success: res.ok }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
  return false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isX = tab.url.includes('twitter.com') || tab.url.includes('x.com');
    if (isX) {
      console.log('[Tweet-Noise-Canceler] X tab loaded');
    }
  }
});

console.log('[Tweet-Noise-Canceler] Background service worker started');
