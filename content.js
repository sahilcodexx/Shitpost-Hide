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
    'ratio'
  ];

  const TECH_LINKS = [
    'github.com', 'dev.to', 'stackoverflow.com', 'medium.com', 'docs.',
    '.io/', 'gitlab.com', 'bitbucket.org', 'npmjs.com', 'pypi.org',
    'crates.io', 'golang.org', 'python.org', 'reactjs.org', 'vuejs.org',
    'svelte.dev', 'nextjs.org', 'typescriptlang.org'
  ];

  const CODE_INDICATORS = ['```', '`', 'function ', 'const ', 'let ', 'var ', 'class ', 'import ', 'export ', 'def ', 'async ', 'await '];

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
        const orgIndicators = ['inc', 'llc', 'ltd', 'corp', 'co.', 'company', 'official', 'technologies', 'labs', 'official'];
        return orgIndicators.some(org => text.includes(org));
      }
    }
    return false;
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

  function isLowEffortTweet(article, text) {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    let hasImage = false;
    const images = article.querySelectorAll('img[src]');
    for (const img of images) {
      if (img.src.includes('profile') || img.src.includes('emoji')) continue;
      const style = window.getComputedStyle(img);
      if (style.width && parseInt(style.width) < 50) continue;
      hasImage = true;
      break;
    }
    if (wordCount < 20 && hasImage) return true;
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

    try {
      const aiResponse = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'analyzeTweet',
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
      console.log('[Tweet-Noise-Canceler] AI Error or context invalidated');
    }

    if (containsEngagementBait(text)) return true;
    if (await isLowEffortTweet(article, text)) return true;

    return false;
  }

  async function hideTweet(article) {
    if (article.dataset.hiddenByNoiseCanceler) return;

    const hiddenDiv = document.createElement('div');
    hiddenDiv.className = 'noise-canceler-hidden';
    hiddenDiv.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid var(--border-color, #38444d); background: #1a1a1a; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 16px; font-weight: bold; color: #666; font-family: monospace; letter-spacing: 2px;">faaahhhh</span>
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
    console.log('[Tweet-Noise-Canceler] Initializing...');
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
