# Tweet-Noise Canceler

A Chrome extension that aggressively filters out shitposts, rageposts, engagement bait, and meaningless content from Twitter/X using AI. Shows "faaahhhh" instead of filtered posts.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)

## Features

### 🚀 Aggressive Content Filtering

Automatically hides:
- **Engagement Bait** - "follow for follow", "tag someone who", "drop a 🐸"
- **Ragebait** - Content designed to anger/divide
- **Low Quality Posts** - Short text + image only, emoji spam
- **Viral Chase** - "go viral", "breaking", "you won't believe"
- **Meme Spam** - Relatable memes with no substance
- **POV/GRWM** - "Day in the life", "GRWM", "POV:"
- **Reach Farming** - "link in bio", "DM for"
- **Hot Takes** - Low-effort controversial opinions

### 🛡️ Protected Content

Preserves:
- Technical/programming content
- Code and documentation links
- News from verified sources
- Genuine conversations
- Verified organization accounts

### 🤖 Multiple Free AI Providers

Supports these FREE APIs (no payment required):
- **Google Gemini** - Recommended, generous free tier
- **OpenRouter** - Free models available
- **MiniMax** - Free Chinese AI
- **OpenCode** - Free AI
- **Custom Endpoint** - For any other API

## Installation

### Prerequisites
- Google Chrome, Brave, or any Chromium-based browser

### Steps

1. **Clone or download** this repository

2. **Open Chrome Extensions**:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode**:
   - Toggle the switch in the top-right corner

4. **Load the extension**:
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

5. **Pin the extension**:
   - Click the puzzle piece icon in Chrome
   - Pin "Tweet-Noise"

## Configuration

### Getting a Free API Key

#### Google Gemini (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key
5. Paste in the extension popup

#### OpenRouter
1. Go to [OpenRouter Settings](https://openrouter.ai/settings)
2. Create an account
3. Go to "API Keys"
4. Create a new key
5. Copy and paste

### Using the Extension

1. Visit Twitter/X (twitter.com or x.com)
2. Click the extension icon
3. Select your AI provider
4. Enter your free API key
5. Click "Test" to verify
6. Click "Save"
7. Toggle filtering ON
8. Scroll your timeline - garbage content is now replaced with "faaahhhh"

## How It Works

### Heuristic Filters (No AI Required)
The extension first runs content through pattern matching:
- Engagement bait phrases
- Emoji-only posts
- Short text + media
- Viral chase keywords
- Custom user keywords

### AI Analysis (When API Key Provided)
For deeper analysis, the AI:
1. Receives tweet text
2. Classifies as HIDE or KEEP
3. Returns decision
4. Extension hides/shows content

### Visual Replacement
Instead of just hiding posts, it shows:
```
┌─────────────────────────────┐
│      faaahhhh              │
└─────────────────────────────┘
```

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── content.js             # Tweet filtering logic
├── background.js         # AI API handling
├── popup.html            # Extension popup UI
├── popup.js              # Popup interactions
├── styles.css            # Modern dark UI
└── README.md            # This file
```

### manifest.json
- Defines extension permissions
- Lists host URLs for Twitter & APIs
- Registers content scripts & popup

### content.js
- Observes Twitter DOM for new tweets
- Applies heuristic filters
- Sends text to AI for analysis
- Replaces filtered content with "faaahhhh"

### background.js
- Handles all AI API calls
- Supports multiple providers
- Manages API key storage
- Processes analysis requests

### popup.html/js/css
- Toggle filtering on/off
- Display hidden post count
- Manage custom keywords
- Configure AI provider & API key

## Supported Browsers

- Google Chrome
- Microsoft Edge
- Brave Browser
- Opera
- Any Chromium-based browser

## API Keys

### Are API keys required?
No! The extension works with heuristic filters alone. Adding an API key makes it smarter but isn't required.

### Is it really free?
Yes! All supported providers have free tiers:
- **Gemini**: 15 RPM free
- **OpenRouter**: Free credits for new users
- **MiniMax**: Free tier available
- **OpenCode**: Free to use

### Privacy
Your API keys are stored locally in your browser and only sent to the AI provider you choose. The extension never sees or stores your data.

## Troubleshooting

### Extension not loading
1. Check `chrome://extensions/`
2. Look for error messages
3. Try reloading the extension

### API key not working
1. Click "Test" in the popup
2. Check error message
3. Ensure you copied the full key
4. Try a different provider

### Tweets not being filtered
1. Make sure toggle is ON
2. Refresh the Twitter page
3. Check if custom keywords are set

### Count not updating
- The counter updates every 2 seconds
- Refresh the page to sync

## Contributing

Pull requests are welcome! This is an open-source project aimed at making Twitter/X a better place.

## License

MIT License - Feel free to use, modify, and distribute.

## Credits

Inspired by [ruturajbayad/no_more_shitposts](https://github.com/ruturajbayad/no_more_shitposts)

---

Made with ❤️ for a cleaner internet
