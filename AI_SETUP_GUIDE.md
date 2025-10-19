# 🎤 AI-Powered Pronunciation Trainer - Installation & Setup Guide

## 🌟 Overview

Your Practice Speaking feature now has **TWO MODES**:

### 1. **Basic Mode** (Already Working! ✅)
- Simple pronunciation scoring
- Browser text-to-speech
- Web Speech API recognition  
- **No installation needed** - works right now!

### 2. **AI-Powered Mode** (Professional Grade! 🤖)
- Advanced AI pronunciation analysis
- Phonetic accuracy scoring (IPA)
- Word-by-word pronunciation feedback
- Professional-grade speech recognition using Whisper
- Detailed pronunciation categories

---

## 🚀 Quick Start (Basic Mode)

Your app is **already working** in basic mode! Just:
1. Make sure `python webApp.py` is running
2. Open `speaking.html` in your browser
3. Select a grade and load sentences
4. Start practicing!

---

## 🤖 Enable AI Mode (Optional - For Advanced Features)

### Step 1: Install PyTorch

The AI trainer needs PyTorch. Install it based on your system:

#### **Windows (CPU version - fastest install):**
```powershell
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

#### **Windows (GPU version - if you have NVIDIA GPU):**
```powershell
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### **Mac:**
```bash
pip install torch torchaudio
```

### Step 2: Install AI Dependencies

```powershell
pip install soundfile omegaconf epitran dtwalign eng_to_ipa transformers sentencepiece
```

### Step 3: Install FFmpeg

FFmpeg is required for audio processing.

#### **Windows:**
1. Download from: https://ffmpeg.org/download.html
2. Extract the zip file
3. Add the `bin` folder to your PATH environment variable

#### **Mac:**
```bash
brew install ffmpeg
```

### Step 4: Restart the Server

```powershell
python webApp.py
```

You should see:
```
✅ AI Pronunciation Trainer loaded successfully!
```

---

## 📊 Feature Comparison

| Feature | Basic Mode | AI Mode |
|---------|-----------|---------|
| Works out of the box | ✅ Yes | ⚠️ Needs setup |
| Pronunciation scoring | ✅ Simple | ✅ Advanced |
| Speech recognition | ✅ Web API | ✅ Whisper AI |
| Phonetic analysis | ❌ No | ✅ Yes (IPA) |
| Word-by-word feedback | ✅ Basic | ✅ Detailed |
| Installation time | 0 minutes | 10-15 minutes |
| Accuracy | Good | Excellent |

---

## 🎯 What You Get with AI Mode

### Advanced Features:
1. **Whisper AI Speech Recognition**
   - State-of-the-art accuracy
   - Better than Google's API
   - Works offline!

2. **Phonetic Analysis (IPA)**
   - International Phonetic Alphabet transcription
   - See exactly how words should sound
   - Compare your pronunciation phonetically

3. **Word-Level Scoring**
   - Each word scored individually
   - See which words need more practice
   - Letter-by-letter accuracy

4. **Pronunciation Categories**
   - Words classified as: Excellent, Good, Needs Practice
   - Visual feedback per word
   - Detailed improvement tips

---

## 🔧 Troubleshooting

### "No module named 'torch'"
**Solution:** Install PyTorch (see Step 1 above)

### "FFmpeg not found"
**Solution:** Install FFmpeg and add to PATH (see Step 3 above)

### Server won't start
**Solution:** 
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill the process if needed
taskkill /PID <PID> /F
```

### AI features not working
**Solution:** Check the server startup message. If you see:
```
⚠️ AI Trainer not available
💡 Basic features will still work!
```
The app works in basic mode. Install AI dependencies to enable AI mode.

---

## 💾 Disk Space Requirements

- **Basic Mode:** ~50 MB
- **AI Mode (CPU):** ~2 GB
- **AI Mode (GPU):** ~4 GB

---

## ⚡ Performance Notes

### Basic Mode:
- Very fast
- Low CPU usage
- Works on any computer

### AI Mode:
- First analysis: 3-10 seconds (model loading)
- Subsequent analyses: 1-3 seconds
- Higher CPU usage
- Recommended: Modern processor (2015+)

---

## 📝 Testing Your Setup

### Test Basic Mode:
1. Start server: `python webApp.py`
2. Look for: `✓ Basic Pronunciation Scoring`
3. Open speaking.html
4. Record and check - should work!

### Test AI Mode:
1. Start server: `python webApp.py`
2. Look for: `✅ AI Pronunciation Trainer loaded successfully!`
3. Check startup message shows: `✓ AI Pronunciation Analysis`
4. Record a sentence - should say "🤖 AI Analyzed"

---

## 🎓 Recommendation

**For Students:** Basic mode is perfect! Fast, accurate enough, and works immediately.

**For Teachers/Professional Use:** AI mode provides detailed analytics and professional-grade feedback.

**For Development:** Start with basic mode, upgrade to AI mode when you need advanced features.

---

## 🆘 Support

If you encounter issues:

1. **Check server logs** - errors will show in the terminal
2. **Try basic mode first** - make sure that works
3. **Install dependencies one by one** - easier to debug
4. **Check Python version** - needs Python 3.8+

---

## 📦 File Structure

```
OmaniEnglishtutor/
├── webApp.py                    # Main server (supports both modes)
├── speaking.html                # Practice interface
├── speaking.js                  # Frontend logic (auto-detects mode)
├── requirements.txt             # Basic + AI dependencies
├── pronunciation-ai/            # AI trainer code
│   ├── pronunciationTrainer.py
│   ├── models.py
│   ├── WordMatching.py
│   └── ... (AI components)
└── lessons/                     # Your lesson content
    ├── grade5.json
    ├── grade6.json
    └── ...
```

---

## ✨ Next Steps

1. ✅ **Current Status:** Basic mode working
2. 🎯 **Optional:** Install AI components for advanced features
3. 🚀 **Future:** Add progress tracking, difficulty levels, etc.

---

**Made with ❤️ for Omani students**
**Yalla habibi, practice speaking! 🎤✨**
