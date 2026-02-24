let geminiApiKey = '';

chrome.storage.local.get(['geminiApiKey'], (result) => {
  if (result.geminiApiKey) {
    geminiApiKey = result.geminiApiKey;
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      isEnabled: true,
      hiddenCount: 0,
      customBlacklist: [],
      geminiApiKey: ''
    });
  }
});

async function analyzeTweetWithAI(text, hasVideo) {
  if (!geminiApiKey) return 'PASS';

  if (!text || text.trim().length < 5) return 'PASS';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const prompt = `
You are an AI filtering assistant for a user's X (Twitter) timeline.
Your goal is to classify if the following tweet text is a shitpost, ragepost, engagement bait, ad/promoted content, or genuinely useful/interesting content.

The tweet text is: "${text}"
Has a video attached: ${hasVideo ? 'YES' : 'NO'}

Please reply with EXACTLY one of the following words and nothing else:
- HIDE: if it is a shitpost (nonsense, memes without value), ragebait (designed to anger), low-effort engagement farming, finance/wealth bragging ("0 to 100k"), repetitive hardware debates (Macbook vs Thinkpad without technical depth), AI-generated slop, or pure non-sense content.
- AD: if it is an ad or sponsored product placement.
- KEEP: if it is genuine technical discussion, programming question, actual code, news, thoughtful content, or any post with real value. Err on the side of KEEPING.
    `.trim();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    });

    if (!response.ok) {
      console.error('[Tweet-Noise-Canceler AI] Gemini API Error:', response.status);
      return 'PASS';
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();

    if (resultText && (resultText.includes('HIDE') || resultText.includes('AD') || resultText.includes('KEEP'))) {
      if (resultText.includes('HIDE')) return 'HIDE';
      if (resultText.includes('AD')) return 'AD';
      if (resultText.includes('KEEP')) return 'KEEP';
    }

    return 'PASS';
  } catch (error) {
    console.error('[Tweet-Noise-Canceler AI] Error calling Gemini:', error);
    return 'PASS';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    console.log('[Tweet-Noise-Canceler]', message.data);
    sendResponse({ success: true });
  } else if (message.action === 'updateApiKey') {
    geminiApiKey = message.apiKey;
    sendResponse({ success: true });
  } else if (message.action === 'analyzeTweet') {
    analyzeTweetWithAI(message.text, message.hasVideo).then((classification) => {
      sendResponse({ classification });
    });
    return true;
  } else if (message.action === 'testApiKey') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${message.apiKey}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply OK' }] }]
      })
    })
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
