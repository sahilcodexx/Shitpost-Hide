(function () {
  'use strict';

  let isEnabled = true;
  let hiddenCount = 0;
  let customBlacklist = [];
  
  const REPLACEMENTS = [
    '🚫 absolute trash 🗑️',
    '💀 not this again...',
    '🤡 reached another level',
    '📉 braincells dying',
    '🧹 swept under the rug',
    '❌ hard skip',
    '🙈 didn\'t see that',
    '💩 noped out',
    '🚪 *closes tab*',
    '🧠 thoughts: none',
    '😴 scroll scroll scroll',
    '⏭️ next',
    '🖕 engagement baits',
    '💩 low effort spam',
    '🚫 blocked & reported'
  ];
  
  const ENGAGEMENT_BAIT_PATTERNS = [
    'how i went from', '0 to 100k', '0 to $', 'passive income', 'side hustle',
    'make money online', 'dm for', 'link in bio', 'best laptop', 'macbook vs',
    'thinkpad vs', 'iphone vs', "what's stopping you", 'should i learn',
    'which language', 'shitpost', 'ragebait', 'engagement bait', 'clout', 'ratio',
    'follow for follow', 'like and follow', 'retweet if', 'tag someone who',
    'who else', 'real talk', 'unpopular opinion', 'hot take', 'i hate',
    'can we get', 'drop a', 'reply with', 'tell me', 'honestly tho', 'no cap',
    'fr fr', 'not me', 'me when', 'pov:', 'day in the life', 'what i ate',
    'routine', 'grwm', 'storytime', 'let me explain', 'break the internet',
    'go viral', 'this is your sign', 'manifesting', 'affirmations', 'law of attraction',
    'fyp', 'foryou', 'trending', 'relatable', 'screenshot this', 'save this',
    'bookmark', 'exposed', 'leaked', 'truth about', "they don't want you to know",
    'stop scrolling', 'before you leave', 'wait for it', 'plot twist', 'omg',
    'literally me', 'girls understand', 'boys will understand', 'parent problems',
    '', 'boys willwhen you realize', 'never do this', 'stop doing this', 'why i quit', 'canceled'
  ];

  const TECH_LINKS = [
    'github.com', 'dev.to', 'stackoverflow.com', 'medium.com', 'docs.', '.io/',
    'gitlab.com', 'bitbucket.org', 'npmjs.com', 'pypi.org', 'crates.io',
    'golang.org', 'python.org', 'reactjs.org', 'vuejs.org', 'svelte.dev',
    'nextjs.org', 'typescriptlang.org', 'reddit.com/r/', 'hackernews'
  ];

  const CODE_INDICATORS = ['```', '`function ', '`const ', '`let ', '`var ', '`class ', '`import ', '`export ', '`def ', '`async '];

  const processedTweets = new WeakSet();
  let observer = null;
  let lastProcess = 0;
  let blacklistSet = new Set();
  let replacementIndex = 0;

  function getReplacement() {
    const text = REPLACEMENTS[replacementIndex];
    replacementIndex = (replacementIndex + 1) % REPLACEMENTS.length;
    return text;
  }

  async function loadState() {
    try {
      const result = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist']);
      isEnabled = result.isEnabled !== false;
      hiddenCount = result.hiddenCount || 0;
      customBlacklist = result.customBlacklist || [];
      blacklistSet = new Set(customBlacklist.map(k => k.toLowerCase()));
    } catch (e) {}
  }

  async function saveState() {
    try {
      await chrome.storage.local.set({ isEnabled, hiddenCount, customBlacklist });
    } catch (e) {}
  }

  chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg.action === 'getStats') {
      sendResponse({ hiddenCount });
    } else if (msg.action === 'toggleEnabled') {
      isEnabled = msg.enabled;
      saveState();
      if (isEnabled) processTweets();
      sendResponse({ success: true });
    } else if (msg.action === 'updateBlacklist') {
      customBlacklist = msg.blacklist;
      blacklistSet = new Set(customBlacklist.map(k => k.toLowerCase()));
      saveState();
      if (isEnabled) processTweets();
      sendResponse({ success: true });
    } else if (msg.action === 'resetCount') {
      hiddenCount = 0;
      saveState();
      sendResponse({ hiddenCount: 0 });
    }
    return true;
  });

  function hasTechLink(article) {
    const links = article.querySelectorAll('a[href]');
    for (let i = 0; i < links.length; i++) {
      const href = links[i].href.toLowerCase();
      for (let j = 0; j < TECH_LINKS.length; j++) {
        if (href.includes(TECH_LINKS[j])) return true;
      }
    }
    return false;
  }

  function hasCode(text) {
    for (let i = 0; i < CODE_INDICATORS.length; i++) {
      if (text.includes(CODE_INDICATORS[i])) return true;
    }
    return false;
  }

  function isVerifiedOrg(article) {
    const badge = article.querySelector('[data-testid="icon-verified"]');
    if (!badge) return false;
    const name = article.querySelector('[data-testid="User-Name"]');
    if (!name) return false;
    const text = name.textContent.toLowerCase();
    const orgs = ['inc', 'llc', 'ltd', 'corp', 'company', 'official', 'technologies', 'labs', 'news', 'media'];
    for (let i = 0; i < orgs.length; i++) {
      if (text.includes(orgs[i])) return true;
    }
    return false;
  }

  function hasEngagementBait(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < ENGAGEMENT_BAIT_PATTERNS.length; i++) {
      if (lower.includes(ENGAGEMENT_BAIT_PATTERNS[i])) return true;
    }
    for (const keyword of blacklistSet) {
      if (keyword && lower.includes(keyword)) return true;
    }
    return false;
  }

  function isLowQuality(text, article) {
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    if (words <= 3 && chars <= 20) return true;
    if (chars <= 15 && words <= 5) return true;
    
    const hasVideo = article.querySelector('video');
    const hasImg = article.querySelector('img[src]');
    if (hasVideo && words <= 8) return true;
    if (hasImg && !hasVideo && words <= 5 && chars <= 30) return true;
    
    return false;
  }

  function isAd(article) {
    const spans = article.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      const t = spans[i].textContent.trim();
      if (t === 'Ad' || t === 'Promoted') return true;
    }
    return false;
  }

  async function shouldHide(article) {
    if (!isEnabled) return false;

    const textEl = article.querySelector('[data-testid="tweetText"]');
    if (!textEl) return false;

    const text = textEl.textContent || '';
    if (!text.trim()) return false;

    if (hasTechLink(article)) return false;
    if (hasCode(text)) return false;
    if (isVerifiedOrg(article)) return false;
    if (isAd(article)) return true;
    if (hasEngagementBait(text)) return true;
    if (isLowQuality(text, article)) return true;

    if (apiKey) {
      try {
        const result = await new Promise(resolve => {
          chrome.runtime.sendMessage({
            action: 'analyzeTweetAggressive',
            text: text,
            hasVideo: !!article.querySelector('video')
          }, resolve);
        });
        if (result?.classification === 'HIDE') return true;
        if (result?.classification === 'KEEP') return false;
      } catch (e) {}
    }

    return false;
  }

  function hideTweet(article) {
    if (processedTweets.has(article)) return;

    const replacement = getReplacement();
    
    const div = document.createElement('div');
    div.style.cssText = 'padding:14px 16px;border-bottom:1px solid #262626;background:#141414;display:flex;align-items:center;justify-content:center;margin:4px 0;border-radius:8px;';
    div.innerHTML = `<span style="font-size:14px;font-weight:600;color:#52525b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${replacement}</span>`;

    article.style.display = 'none';
    if (article.parentNode) {
      article.parentNode.insertBefore(div, article);
    }

    processedTweets.add(article);
    hiddenCount++;
    saveState();
  }

  async function processTweet(article) {
    if (processedTweets.has(article)) return;
    if (await shouldHide(article)) {
      hideTweet(article);
    }
  }

  function processTweets() {
    const now = Date.now();
    if (now - lastProcess < 500) return;
    lastProcess = now;

    const tweets = document.querySelectorAll('[data-testid="tweet"]:not([data-processed])');
    tweets.forEach(tweet => {
      tweet.dataset.processed = '1';
      processTweet(tweet);
    });
  }

  function setupObserver() {
    if (observer) return;
    
    observer = new MutationObserver(mutations => {
      let hasNew = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) {
        requestAnimationFrame(processTweets);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    loadState().then(() => {
      setTimeout(() => {
        processTweets();
        setupObserver();
      }, 1000);
    });
  }

  const style = document.createElement('style');
  style.textContent = '.noise-canceler-hidden{transition:all .2s}';
  document.head.appendChild(style);

  init();
})();
