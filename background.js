let apiKey = '';
let apiProvider = 'gemini';
let customEndpoint = '';

const API_CONFIGS = {
  gemini: {
    name: 'Google Gemini',
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    prompt: (text, hasVideo) => `
You are an AI filtering assistant. Classify this tweet as HIDE, AD, or KEEP.

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply with exactly one word: HIDE, AD, or KEEP`.trim(),
    body: (prompt) => JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
    }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parseResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || ''
  },
  openrouter: {
    name: 'OpenRouter',
    url: (key) => `https://openrouter.ai/api/v1/chat/completions`,
    prompt: (text, hasVideo) => `
Classify this tweet as HIDE, AD, or KEEP.

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply: HIDE, AD, or KEEP`.trim(),
    body: (prompt) => JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10
    }),
    headers: (key) => ({ 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://twitter.com',
      'X-Title': 'Tweet-Noise-Canceler'
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content?.trim().toUpperCase() || ''
  },
  minimax: {
    name: 'MiniMax',
    url: (key) => `https://api.minimax.chat/v1/text/chatcompletion_v2`,
    prompt: (text, hasVideo) => `
Classify this tweet as HIDE, AD, or KEEP.

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply: HIDE, AD, or KEEP`.trim(),
    body: (prompt, key) => {
      const groupId = key.split(':')[0] || key;
      const apiKey2 = key.split(':')[1] || key;
      return JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: prompt }]
      });
    },
    headers: (key, body) => {
      const apiKey2 = key.split(':')[1] || key;
      return { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey2}`
      };
    },
    parseResponse: (data) => data?.choices?.[0]?.message?.content?.trim().toUpperCase() || ''
  },
  opencode: {
    name: 'OpenCode',
    url: (key) => `https://opencode.ai/api/v1/generate`,
    prompt: (text, hasVideo) => `
Classify this tweet as HIDE, AD, or KEEP.

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply with exactly one word: HIDE, AD, or KEEP`.trim(),
    body: (prompt) => JSON.stringify({
      prompt: prompt,
      model: 'opencode'
    }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parseResponse: (data) => data?.completion?.trim().toUpperCase() || ''
  },
  custom: {
    name: 'Custom',
    url: (key, endpoint) => endpoint || '',
    prompt: (text, hasVideo) => `Classify: HIDE, AD, or KEEP. Tweet: "${text}" Video: ${hasVideo ? 'YES' : 'NO'}`,
    body: (prompt) => JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10
    }),
    headers: () => ({ 'Content-Type': 'application/json' }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content?.trim().toUpperCase() || data?.text?.toUpperCase() || ''
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
  if (!apiKey && apiProvider !== 'opencode') return 'PASS';
  if (!text || text.trim().length < 5) return 'PASS';

  const config = API_CONFIGS[apiProvider] || API_CONFIGS.gemini;
  const endpoint = apiProvider === 'custom' ? customEndpoint : config.url(apiKey);
  const prompt = config.prompt(text, hasVideo);
  const body = config.body(prompt, apiKey);
  const headers = typeof config.headers === 'function' ? config.headers(apiKey, body) : config.headers();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tweet-Noise-Canceler AI] API Error:', response.status, errorText);
      return 'PASS';
    }

    const data = await response.json();
    const resultText = config.parseResponse(data);

    if (resultText && (resultText.includes('HIDE') || resultText.includes('AD') || resultText.includes('KEEP'))) {
      if (resultText.includes('HIDE')) return 'HIDE';
      if (resultText.includes('AD')) return 'AD';
      if (resultText.includes('KEEP')) return 'KEEP';
    }

    return 'PASS';
  } catch (error) {
    console.error('[Tweet-Noise-Canceler AI] Error:', error.message);
    return 'PASS';
  }
}

async function analyzeTweetWithAIAggressive(text, hasVideo) {
  if (!apiKey && apiProvider !== 'opencode') return 'PASS';
  if (!text || text.trim().length < 3) return 'HIDE';

  const config = API_CONFIGS[apiProvider] || API_CONFIGS.gemini;
  const endpoint = apiProvider === 'custom' ? customEndpoint : config.url(apiKey);
  
  const prompt = `
You are an AGGRESSIVE content filter for Twitter. Your job is to hide posts that are ONLY trying to go viral/engagement farm with NO real value.

AGGRESSIVELY HIDE anything that is:
- Pure emoji posts with no substance
- "Relatable" memes with no info
- Just sharing a screenshot/tweet without commentary
- "POV", "Day in the life", "GRWM" type content
- Engagement bait (follow for, like if, tag someone, etc)
- Ragebait, drama farming
- Low effort hot takes
- Posts that are just: emoji + short text + image
- "Save this", "Bookmark this" type content
- Polls with no real substance
- Viral chase content ("go viral", "trending", etc)
- Just reacting to other tweets without adding value

KEEP only:
- Actual news/information
- Technical/programming content
- Genuine conversations
- Thoughtful opinions with substance
- Verified news outlets
- Code/programming links

Tweet: "${text}"
Has video: ${hasVideo ? 'YES' : 'NO'}

Reply with exactly one word: HIDE or KEEP`.trim();

  const body = config.body(prompt, apiKey);
  const headers = typeof config.headers === 'function' ? config.headers(apiKey, body) : config.headers();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      return 'PASS';
    }

    const data = await response.json();
    const resultText = config.parseResponse(data);

    if (resultText && (resultText.includes('HIDE') || resultText.includes('KEEP'))) {
      if (resultText.includes('HIDE')) return 'HIDE';
      if (resultText.includes('KEEP')) return 'KEEP';
    }

    return 'PASS';
  } catch (error) {
    console.error('[Tweet-Noise-Canceler AI] Aggressive Error:', error.message);
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
  } else if (message.action === 'analyzeTweetAggressive') {
    analyzeTweetWithAIAggressive(message.text, message.hasVideo).then((classification) => {
      sendResponse({ classification });
    });
    return true;
  } else if (message.action === 'testApiKey') {
    (async () => {
      const config = API_CONFIGS[message.provider] || API_CONFIGS.gemini;
      const endpoint = message.provider === 'custom' ? message.endpoint : config.url(message.apiKey);
      const body = config.body('Say OK', message.apiKey);
      const headers = typeof config.headers === 'function' ? config.headers(message.apiKey, body) : config.headers();
      
      try {
        const response = await fetch(endpoint, { 
          method: 'POST', 
          headers: headers, 
          body: body 
        });
        
        if (response.ok) {
          sendResponse({ success: true });
        } else {
          const errorText = await response.text();
          console.error('[Test API] Error:', response.status, errorText);
          sendResponse({ success: false, error: errorText });
        }
      } catch (error) {
        console.error('[Test API] Error:', error.message);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  return false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('twitter.com') || tab.url.includes('x.com')) {
      console.log('[Tweet-Noise-Canceler] X tab loaded');
    }
  }
});

console.log('[Tweet-Noise-Canceler] Background service worker started');
