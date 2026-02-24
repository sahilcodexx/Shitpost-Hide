(function () {
  'use strict';

  let isEnabled = true;
  let hiddenCount = 0;
  let customBlacklist = [];

  const ENGAGEMENT_BAIT_PATTERNS = [
    'how i went from',
    '0 to 100k',
    '0 to $',
    'passive income',
    'side hustle',
    'make money online',
    'dm for',
    'link in bio',
    'best laptop',
    'macbook vs',
    'thinkpad vs',
    'iphone vs',
    'what\'s stopping you',
    'should i learn',
    'which language',
    'shitpost',
    'ragebait',
    'engagement bait',
    'clout',
    'ratio',
    'follow for follow',
    'like and follow',
    'retweet if',
    'tag someone who',
    'who else',
    'real talk',
    'unpopular opinion',
    'hot take',
    'i hate',
    'can we get',
    'drop a',
    'reply with',
    'tell me',
    'honestly tho',
    'no cap',
    'fr fr',
    'not me',
    'me when',
    'POV:',
    'day in the life',
    'what i ate',
    'routine',
    'grwm',
    'storytime',
    'let me explain',
    'break the internet',
    'go viral',
    'this is your sign',
    'manifesting',
    'affirmations',
    'law of attraction',
    'reels',
    'fyp',
    'foryou',
    'trending',
    'pov',
    'relatable',
    'screenshot this',
    'save this',
    'bookmark',
    'share this',
    'exposed',
    'leaked',
    'truth about',
    'they don\'t want you to know',
    'stop scrolling',
    'before you leave',
    'wait for it',
    'plot twist',
    'omg',
    'literally me',
    'girls understand',
    'boys will understand',
    'parent problems',
    'teacher problems',
    'adulting',
    'when you realize',
    'never do this',
    'stop doing this',
    'why i quit',
    'i left',
    'canceled',
    'drama',
    'tea',
    'spill the tea',
    'update',
    'breaking',
    'news',
    'just in',
    'happening now',
    'reaction',
    'react to',
    'watch till end',
    'dont forget',
    'reminder',
    'pin comment'
  ];

  const TECH_LINKS = [
    'github.com', 'dev.to', 'stackoverflow.com', 'medium.com', 'docs.',
    '.io/', 'gitlab.com', 'bitbucket.org', 'npmjs.com', 'pypi.org',
    'crates.io', 'golang.org', 'python.org', 'reactjs.org', 'vuejs.org',
    'svelte.dev', 'nextjs.org', 'typescriptlang.org', 'reddit.com/r/',
    'hackernews', 'news.ycombinator'
  ];

  const CODE_INDICATORS = ['```', '`', 'function ', 'const ', 'let ', 'var ', 'class ', 'import ', 'export ', 'def ', 'async ', 'await ', 'public ', 'private ', 'return ', 'if (', 'for (', 'while '];

  const VIDEO_INDICATORS = ['video', 'reel', 'tiktok', 'youtube', 'watch'];

  async function loadState() {
    try {
      const result = await chrome.storage.local.get(['isEnabled', 'hiddenCount', 'customBlacklist']);
      isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
      hiddenCount = result.hiddenCount || 0;
      customBlacklist = result.customBlacklist || [];
    } catch (error) {
      console.error('[Tweet-Noise-Canceler] Error loading state:', error);
    }
  }

  async function saveState() {
    try {
      await chrome.storage.local.set({ isEnabled, hiddenCount, customBlacklist });
    } catch (error) {
      console.error('[Tweet-Noise-Canceler] Error saving state:', error);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getStats') {
      sendResponse({ hiddenCount });
    } else if (message.action === 'toggleEnabled') {
      isEnabled = message.enabled;
      saveState();
      if (isEnabled) processAllTweets();
      sendResponse({ success: true, isEnabled });
    } else if (message.action === 'updateBlacklist') {
      customBlacklist = message.blacklist;
      saveState();
      if (isEnabled) processAllTweets();
      sendResponse({ success: true });
    } else if (message.action === 'resetCount') {
      hiddenCount = 0;
      saveState();
      sendResponse({ success: true, hiddenCount: 0 });
    }
    return true;
  });

  function containsCodeBlock(text) {
    return CODE_INDICATORS.some(indicator => text.includes(indicator));
  }

  function containsTechLink(article) {
    const links = article.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.href.toLowerCase();
      if (TECH_LINKS.some(tech => href.includes(tech))) return true;
    }
    return false;
  }

  function isVerifiedOrganization(article) {
    const verifiedBadge = article.querySelector('[data-testid="icon-verified"]');
    if (verifiedBadge) {
      const accountName = article.querySelector('[data-testid="User-Name"]');
      if (accountName) {
        const text = accountName.textContent.toLowerCase();
        const orgIndicators = ['inc', 'llc', 'ltd', 'corp', 'co.', 'company', 'official', 'technologies', 'labs', 'official', 'news', 'media', 'journal'];
        return orgIndicators.some(org => text.includes(org));
      }
    }
    return false;
  }

  function hasOnlyEmojis(text) {
    const emojiPattern = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F1E0}-\u{1F1FF}]+$/u;
    return emojiPattern.test(text.trim());
  }

  function containsEngagementBait(text) {
    const lowerText = text.toLowerCase();
    
    for (const pattern of ENGAGEMENT_BAIT_PATTERNS) {
      if (lowerText.includes(pattern.toLowerCase())) return true;
    }
    
    for (const keyword of customBlacklist) {
      if (keyword.trim() && lowerText.includes(keyword.toLowerCase().trim())) return true;
    }
    
    return false;
  }

  function isLowQualityContent(article, text) {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = text.length;
    
    const hasImage = article.querySelector('img[src]') !== null;
    const hasVideo = article.querySelector('video') !== null;
    const hasGif = article.querySelector('img[src*="gif"]') !== null;
    
    if (hasOnlyEmojis(text) && (hasImage || hasVideo || hasGif)) return true;
    
    if (wordCount <= 3 && (hasImage || hasVideo)) return true;
    
    if (charCount <= 20 && (hasImage || hasVideo || hasGif)) return true;
    
    const linkText = text.toLowerCase();
    if ((linkText.includes('link in bio') || linkText.includes('link in comments') || linkText.includes('click the')) && hasImage) return true;
    
    if (hasVideo && !hasImage && wordCount <= 10) return true;
    
    const memePatterns = ['💀', '😭', '🤣', '🔥', '🤡💯', '', '👀', '🙃', '😤', '😩', '🤯'];
    const emojiCount = memePatterns.filter(e => text.includes(e)).length;
    if (emojiCount >= 3 && wordCount <= 15) return true;
    
    return false;
  }

  function isViralBait(article, text) {
    const lowerText = text.toLowerCase();
    
    const viralPhrases = [
      'go viral', 'broke the internet', 'trending', 'everyone talking',
      'this is crazy', 'you won\'t believe', 'shocking', 'mind blown',
      'life hack', 'game changer', 'stop what you\'re doing', 'emergency',
      'must watch', 'breaking news', 'just dropped', 'announcement'
    ];
    
    for (const phrase of viralPhrases) {
      if (lowerText.includes(phrase)) return true;
    }
    
    const hasPoll = article.querySelector('[data-testid="poll"]') !== null;
    const hasMultipleImages = article.querySelectorAll('img[src*="photo"]').length >= 2;
    
    if (hasPoll && text.split(/\s+/).length <= 20) return true;
    
    if (hasMultipleImages && text.split(/\s+/).length <= 10) return true;
    
    return false;
  }

  async function shouldHideTweet(article) {
    if (!isEnabled) return false;

    const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
    if (!tweetTextElement) return false;

    const text = tweetTextElement.textContent || '';
    const hasVideo = article.querySelector('video') !== null;

    if (containsTechLink(article)) return false;
    if (containsCodeBlock(text)) return false;
    if (isVerifiedOrganization(article)) return false;

    const spans = article.querySelectorAll('span');
    for (const span of spans) {
      const spanText = span.textContent.trim();
      if (spanText === 'Ad' || spanText === 'Promoted') return true;
    }

    if (containsEngagementBait(text)) {
      console.log('[Tweet-Noise-Canceler] Hiding - engagement bait pattern');
      return true;
    }

    if (isLowQualityContent(article, text)) {
      console.log('[Tweet-Noise-Canceler] Hiding - low quality content');
      return true;
    }

    if (isViralBait(article, text)) {
      console.log('[Tweet-Noise-Canceler] Hiding - viral bait');
      return true;
    }

    try {
      const aiResponse = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'analyzeTweetAggressive',
          text: text,
          hasVideo: hasVideo
        }, response => resolve(response));
      });

      if (aiResponse && aiResponse.classification) {
        if (aiResponse.classification === 'HIDE') return true;
        if (aiResponse.classification === 'AD') return true;
        if (aiResponse.classification === 'KEEP') return false;
      }
    } catch (error) {
      console.log('[Tweet-Noise-Canceler] AI Error:', error.message);
    }

    return false;
  }

  async function hideTweet(article) {
    if (article.dataset.hiddenByNoiseCanceler) return;

    const hiddenDiv = document.createElement('div');
    hiddenDiv.className = 'noise-canceler-hidden';
    hiddenDiv.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #38444d; background: #0f0f0f; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 18px; font-weight: bold; color: #666; font-family: monospace; letter-spacing: 3px;">faaahhhh</span>
      </div>
    `;

    article.style.display = 'none';

    if (article.parentElement) {
      article.parentElement.insertBefore(hiddenDiv, article);
    }

    article.dataset.hiddenByNoiseCanceler = 'true';
    hiddenCount++;
    saveState();
  }

  async function processTweet(article) {
    if (article.dataset.hiddenByNoiseCanceler) return;

    const shouldHide = await shouldHideTweet(article);
    if (shouldHide) {
      await hideTweet(article);
    }
  }

  function processAllTweets() {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    tweets.forEach(tweet => processTweet(tweet));
  }

  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) {
        requestAnimationFrame(() => processAllTweets());
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Tweet-Noise-Canceler] MutationObserver initialized');
  }

  function setupNavigationHandler() {
    let lastUrl = location.href;
    const checkUrlChange = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(processAllTweets, 1000);
      }
    };
    setInterval(checkUrlChange, 2000);
    window.addEventListener('popstate', () => setTimeout(processAllTweets, 1000));
  }

  async function init() {
    console.log('[Tweet-Noise-Canceler] Initializing - AGGRESSIVE MODE');
    await loadState();

    setTimeout(() => {
      processAllTweets();
      setupObserver();
      setupNavigationHandler();
    }, 1500);

    window.addEventListener('load', () => setTimeout(processAllTweets, 500));
  }

  const style = document.createElement('style');
  style.textContent = `
    .noise-canceler-hidden {
      transition: all 0.3s ease;
      margin: 4px 0;
    }
  `;
  document.head.appendChild(style);

  init();
})();
