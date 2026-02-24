(function () {
  'use strict';

  let isEnabled = true;
  let hideUI = true;
  let hiddenCount = 0;
  let customBlacklist = [];
  
  const ENGAGEMENT_BAIT_PATTERNS = [
    'how i went', '0 to 100k', 'passive income', 'side hustle',
    'make money', 'link in bio', 'dm for', 'follow for follow', 
    'like and follow', 'retweet if', 'tag someone', 'who else',
    'real talk', 'unpopular opinion', 'hot take', 'can we get', 
    'drop a', 'reply with', 'tell me who', 'honestly', 'no cap',
    'fr fr', 'pov:', 'day in the life', 'grwm', 'storytime',
    'go viral', 'break the internet', 'fyp', 'foryou', 'trending',
    'save this', 'bookmark', 'screenshot', 'exposed', 'leaked',
    'stop scrolling', 'before you leave', 'wait for it', 'plot twist',
    'literally me', 'girls understand', 'boys understand', 'parenting be like',
    'when you finally', 'never do this', 'why i quit', 'i quit',
    'canceled', 'drama', 'tea spill', 'my truth', 'unpopular',
    'this is your sign', 'manifesting', 'affirmations', 'law of attraction',
    'reels', 'viral', 'broke the internet', 'everyone talking',
    'you won\'t believe', 'shocking', 'mind blown', 'game changer',
    'life hack', 'stop what you\'re doing', 'emergency', 'must watch',
    'breaking news', 'just dropped', 'announcement', 'update',
    'happening now', 'reaction', 'react to', 'watch till end',
    'reminder', 'pin comment', 'share this', 'dont forget',
    'not me:', 'me when', 'waiting for', 'when they say',
    'POV', 'WRM', 'GRWM', 'RHRM', 'story time', 'storytime',
    'relatable', 'mood', 'same', 'facts', 'exactly', 'copium',
    'let me explain', 'explain', 'breakdown', 'here\'s why'
  ];

  const LOW_EFFORT_PATTERNS = [
    '💀', '😭', '🤣', '🔥', '🤡', '👀', '🙃', '😤', '😩', '🤯',
    '😂', '😭😭', '💀💀', '🔥🔥', '🙄', '😑', '🤔', '😴'
  ];

  const SPAM_KEYWORDS = [
    'free followers', 'buy followers', 'cheap followers', 'get rich',
    'crypto pump', 'binary options', 'mlm', 'pyramid', 'click here',
    'earn money', 'work from home', 'discount', 'sale', 'buy now',
    'limited time', 'act now', 'don\'t miss', 'hurry', 'bonus',
    'free gift', 'winner', 'congratulations', 'you won', 'claim',
    'verify', 'update your', 'suspended', 'account verify'
  ];

  const TECH_LINKS = [
    'github.com/', 'dev.to', 'stackoverflow.com', 'medium.com/', 'docs.',
    '.io/', 'gitlab.com', 'npmjs.com', 'pypi.org', 'crates.io',
    'golang.org', 'python.org', 'reactjs.org', 'vuejs.org',
    'nextjs.org', 'typescriptlang.org', 'reddit.com/r/', 'hackernews'
  ];

  const CODE_INDICATORS = ['```', 'function ', 'const ', 'let ', 'var ', 'class ', 'import ', 'export ', 'def ', 'async ', 'await ', 'return ', 'public ', 'private '];

  const processedTweets = new WeakSet();
  let observer = null;
  let lastProcess = 0;
  let blacklistSet = new Set();
  let replacementIndex = 0;
  let uiHidden = false;

  const REPLACEMENTS = ['🚫 nope', '💀 skipped', '🤷‍♂️ nah', '⏭️ next', '🙈 gone', '🗑️ deleted'];

  function getReplacement() {
    const text = REPLACEMENTS[replacementIndex];
    replacementIndex = (replacementIndex + 1) % REPLACEMENTS.length;
    return text;
  }

  async function loadState() {
    try {
      const result = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist', 'hideUI']);
      isEnabled = result.isEnabled !== false;
      hideUI = result.hideUI !== false;
      hiddenCount = result.hiddenCount || 0;
      customBlacklist = result.customBlacklist || [];
      blacklistSet = new Set(customBlacklist.map(k => k.toLowerCase()));
    } catch (e) {}
  }

  async function saveState() {
    try {
      await chrome.storage.local.set({ isEnabled, hiddenCount, customBlacklist, hideUI });
    } catch (e) {}
  }

  chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg.action === 'getStats') sendResponse({ hiddenCount });
    else if (msg.action === 'toggleEnabled') {
      isEnabled = msg.enabled;
      saveState();
      if (isEnabled) processTweets();
      sendResponse({ success: true });
    } else if (msg.action === 'toggleUI') {
      hideUI = msg.enabled;
      saveState();
      if (hideUI) hideUIElements();
      else showUIElements();
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

  function isVerified(article) {
    return article.querySelector('[data-testid="icon-verified"]') !== null;
  }

  function isNewsAccount(article) {
    const name = article.querySelector('[data-testid="User-Name"]');
    if (!name) return false;
    const text = name.textContent.toLowerCase();
    const news = ['news', 'breaking', 'reuters', 'ap', 'bbc', 'cnn', 'nyt', 'wsj', 'bloomberg', 'guardian', 'times', 'journal', 'post', 'herald'];
    for (let n of news) {
      if (text.includes(n)) return true;
    }
    return false;
  }

  function hasEngagementBait(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < ENGAGEMENT_BAIT_PATTERNS.length; i++) {
      if (lower.includes(ENGAGEMENT_BAIT_PATTERNS[i])) return true;
    }
    for (let i = 0; i < SPAM_KEYWORDS.length; i++) {
      if (lower.includes(SPAM_KEYWORDS[i])) return true;
    }
    for (const keyword of blacklistSet) {
      if (keyword && lower.includes(keyword)) return true;
    }
    return false;
  }

  function hasEmojiSpam(text) {
    let emojiCount = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/\p{Emoji}/u.test(char)) emojiCount++;
    }
    if (emojiCount >= 4) return true;
    for (let i = 0; i < LOW_EFFORT_PATTERNS.length; i++) {
      if (text.includes(LOW_EFFORT_PATTERNS[i])) return true;
    }
    return false;
  }

  function isLowQuality(text, article) {
    const words = text.split(/\s+/).length;
    const chars = text.length;
    const hasMedia = article.querySelector('img[src], video') !== null;
    
    if (chars <= 30 && words <= 8 && hasMedia) return true;
    if (chars <= 50 && words <= 10 && hasMedia) return true;
    if (hasEmojiSpam(text)) return true;
    
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

  function shouldHide(article) {
    if (!isEnabled || processedTweets.has(article)) return false;

    const textEl = article.querySelector('[data-testid="tweetText"]');
    if (!textEl) return false;

    const text = textEl.textContent || '';
    if (!text.trim() || text.length < 2) return false;

    if (isNewsAccount(article) && hasTechLink(article)) return false;
    if (hasTechLink(article) && hasCode(text)) return false;
    if (isVerified(article) && hasTechLink(article) && !hasEngagementBait(text)) return false;
    
    if (isAd(article)) return true;
    if (hasEngagementBait(text)) return true;
    if (isLowQuality(text, article)) return true;

    return false;
  }

  function hideTweet(article) {
    if (processedTweets.has(article)) return;
    processedTweets.add(article);

    const replacement = getReplacement();
    const div = document.createElement('div');
    div.style.cssText = 'padding:12px;border-bottom:1px solid #262626;background:#141414;margin:4px 0;border-radius:8px;text-align:center;';
    div.innerHTML = `<span style="font-size:13px;color:#52525b;">${replacement}</span>`;

    article.style.display = 'none';
    if (article.parentNode) {
      article.parentNode.insertBefore(div, article);
    }

    hiddenCount++;
    saveState();
  }

  function processTweets() {
    const now = Date.now();
    if (now - lastProcess < 300) return;
    lastProcess = now;

    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    tweets.forEach(tweet => {
      if (!processedTweets.has(tweet)) {
        processTweet(tweet);
      }
    });
  }

  function processTweet(article) {
    if (shouldHide(article)) {
      hideTweet(article);
    }
  }

  function hideUIElements() {
    if (uiHidden) return;
    uiHidden = true;
    const style = document.createElement('style');
    style.id = 'xclean-ui-hide';
    style.textContent = '[data-testid="sidebarColumn"] { display: none !important; }';
    document.head.appendChild(style);
  }

  function showUIElements() {
    uiHidden = false;
    const style = document.getElementById('xclean-ui-hide');
    if (style) style.remove();
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
      if (hasNew) requestAnimationFrame(processTweets);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    loadState().then(() => {
      setTimeout(() => {
        processTweets();
        setupObserver();
        if (hideUI) hideUIElements();
      }, 1500);
    });
  }

  init();
})();
