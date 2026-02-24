# Tweet-Noise

A Chrome extension that aggressively filters out shitposts, rageposts, engagement bait, and meaningless content from Twitter/X using AI.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)

## Features

- 🚀 **Aggressive Filtering** - Blocks engagement bait, ragebait, viral chase, meme spam
- 🤖 **AI Powered** - Uses free AI APIs for smart detection  
- 💰 **100% Free** - No paid subscriptions, uses free-tier APIs
- 🔒 **Privacy First** - Your API keys stay in your browser
- 🎯 **Smart Whitelists** - Preserves tech, news, and verified accounts

## Installation

### Option 1: Direct Install (Recommended)

1. **Download the extension:**
   - Go to [GitHub Releases](https://github.com/YOUR_USERNAME/tweet-noise/releases) OR
   - Click green "Code" button → "Download ZIP"

2. **Extract the file:**
   - Right-click the ZIP → "Extract All"
   - Remember where you saved it!

3. **Install in Chrome:**
   - Open Chrome and go to: `chrome://extensions/`
   - Turn on **Developer mode** (top right switch)
   - Click **Load unpacked**
   - Select the extracted folder
   - Done! 🎉

4. **Pin the extension:**
   - Click puzzle piece icon in Chrome toolbar
   - Click pin icon next to "Tweet-Noise"

### Option 2: Using Git

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/tweet-noise.git

# Or download directly
# https://github.com/YOUR_USERNAME/tweet-noise/archive/main.zip
```

Then follow step 3 above to load in Chrome.

## Setup Guide

### Step 1: Get a Free API Key

The extension works without an API key using basic filters. For smarter AI detection, get a free key:

| Provider | Link | Free Tier |
|----------|------|-----------|
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | 15 requests/min |
| **OpenRouter** | [openrouter.ai/settings](https://openrouter.ai/settings) | Free credits |

**Recommended: Google Gemini** - easiest to get, works great.

### Step 2: Configure the Extension

1. Click the Tweet-Noise icon in Chrome
2. Select your AI provider from dropdown
3. Paste your API key
4. Click **Test** to verify it works
5. Click **Save**
6. Make sure toggle is ON

### Step 3: Enjoy Clean Timeline

That's it! Visit Twitter/X and scroll. Garbage posts will be replaced with fun messages like:
- 💀 not this again...
- 🤡 reached another level
- 📉 braincells dying

## How to Update

1. Download new version from GitHub
2. Go to `chrome://extensions/`
3. Click the refresh icon on Tweet-Noise
4. Or remove and re-add (settings will be saved)

## Troubleshooting

**Extension not working?**
- Refresh the Twitter page
- Make sure toggle is ON in popup
- Check if API key is saved

**API key not working?**
- Click "Test" in popup
- Make sure you copied the full key
- Try a different provider

**Tweets not filtering?**
- Refresh the page
- Check custom keywords aren't blocking everything
- Make sure you're on twitter.com or x.com

## Supported Browsers

- Google Chrome ✅
- Brave ✅
- Edge ✅
- Any Chromium browser ✅

## Files

```
tweet-noise/
├── manifest.json      # Extension config
├── content.js         # Filters tweets
├── background.js     # AI API handling
├── popup.html        # Settings page
├── popup.js          # Popup logic
├── styles.css        # UI styling
├── icons/            # Extension icons
└── README.md         # This file
```

## Privacy

- API keys are stored only in your browser's local storage
- Keys are sent directly to AI providers, never through any server
- No data collection or tracking
- Open source - inspect the code yourself

## License

MIT License - Free to use, modify, and share.

---

**Made with ❤️ for a better Twitter experience**

[GitHub](https://github.com/YOUR_USERNAME/tweet-noise) · [Report Bug](https://github.com/YOUR_USERNAME/tweet-noise/issues)
