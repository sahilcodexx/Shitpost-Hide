# X-Clean

A Chrome extension that aggressively filters out shitposts, ragebait and nonsense from Twitter/X.

---

## How to Install (Step by Step)

### Step 1: Download the Code

1. Go to the GitHub repository
2. Click green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to a folder (remember the location!)

### Step 2: Open Chrome Extensions

1. Open Google Chrome
2. In the address bar, type: `chrome://extensions/`
3. Press **Enter**

### Step 3: Enable Developer Mode

1. In the extensions page, look for **"Developer mode"** toggle
2. Turn it **ON** (usually top right corner)
3. You'll see new buttons appear: "Load unpacked", "Pack extension", etc.

### Step 4: Load the Extension

1. Click **"Load unpacked"** button
2. A file browser will open
3. Go to where you extracted the ZIP
4. Select the folder (it should have files like manifest.json, content.js, etc.)
5. Click **"Select Folder"** or **"OK"**

### Step 5: Pin the Extension

1. Look for the puzzle piece icon 🧩 in Chrome toolbar (top right)
2. Click it
3. Find "X-Clean" 
4. Click the **pin icon** next to it

**Done! 🎉**

---

## How to Setup API Key (Optional but Recommended)

The extension works without API key, but with AI it's smarter.

### Get Free API Key (Google Gemini):

1. Go to: https://aistudio.google.com/app/apikey
2. Login with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with "AIza...")
5. Click the X-Clean extension icon in Chrome
6. Make sure **"Google Gemini"** is selected in dropdown
7. Paste your API key
8. Click **"Test"** - should say "API Key is working!"
9. Click **"Save"**
10. Make sure the toggle at top is **ON**

---

## How to Use

1. Open Twitter (twitter.com or x.com)
2. Scroll through your timeline
3. Garbage posts will be automatically hidden and replaced with fun messages like:
   - 💀 not this again...
   - 🤡 reached another level
   - 📉 braincells dying
   - 🚫 absolute trash 🗑️

---

## How to Update

When new version comes:

1. Download new ZIP from GitHub
2. Go to `chrome://extensions/`
3. Find X-Clean
4. Click the refresh icon 🔄
5. Done!

---

## How to Uninstall

1. Go to `chrome://extensions/`
2. Find X-Clean
3. Click **"Remove"** button

---

## Troubleshooting

**Extension not showing?**
- Make sure you selected the folder (not files inside)
- Folder should have manifest.json at top level

**Not filtering tweets?**
- Refresh Twitter page
- Make sure toggle is ON in popup
- Check API key is saved

**API key error?**
- Make sure you copied the FULL key
- Try clicking "Test" to see exact error

---

## Files in This Project

```
tweet-noise/
├── manifest.json      # Main config file
├── content.js         # Filters tweets on page
├── background.js      # Handles AI API calls
├── popup.html        # Settings popup UI
├── popup.js          # Popup functionality
├── styles.css        # Dark theme styling
├── icons/            # Extension icons
└── README.md        # This file
```

---

## Privacy

- Your API key stays in your browser only
- Nothing is sent to any server except AI providers
- No tracking or data collection
- Open source - you can check the code!

---

## License

MIT - Free to use and modify.

---

**Enjoy a cleaner Twitter! 🚫**
