# 🎤 Practice Speaking Feature - User Guide

## Overview
The Practice Speaking feature allows students to practice pronunciation using **real sentences from their actual lessons**! 

## How It Works

### 1. **Select Your Grade**
- Choose from Grade 5, 6, 7, or 8
- The system automatically loads all units for that grade

### 2. **Select a Unit** (Optional)
- Choose "All Units" to practice sentences from the entire grade
- Or select a specific unit to focus on that content

### 3. **Load Sentences**
- Click "📚 Load Sentences" button
- The system extracts sentences from:
  - ✅ Reading passages
  - ✅ Dialogue examples
  - ✅ Teaching examples
  - ✅ Practice conversations

### 4. **Practice Speaking**
- 🔊 **Listen** - Hear the sentence read aloud
- 🎙️ **Record & Check** - Say the sentence and get instant feedback
- ➡️ **Next Phrase** - Move to a new sentence

### 5. **Get Feedback**
- Accuracy score (0-100%)
- Personalized feedback
- ⭐ Star rewards (1-5 stars based on performance)
- See what you said vs. what was expected

## Features

### Smart Sentence Extraction
The system automatically finds appropriate sentences by:
- Filtering out very short or very long sentences
- Removing duplicates
- Randomizing order for variety
- Focusing on clear, complete sentences

### Pronunciation Scoring
- 90%+ = Excellent! 🌟 (5 stars)
- 75-89% = Great job! ⭐ (4 stars)
- 60-74% = Good effort! 👍 (3 stars)
- 40-59% = Nice try! 💪 (2 stars)
- Below 40% = Keep trying! 🎯 (1 star)

### Star Rewards
- Earned stars are automatically added to your global star count
- Track your progress on the dashboard

## Technical Requirements

### Python Server (Optional)
For full functionality, run the Python server:
```bash
python webApp.py
```

The server provides:
- High-quality text-to-speech
- Server-side pronunciation evaluation
- API endpoints for practice phrases

### Offline Mode
If the server isn't running, the system uses:
- Browser's built-in speech synthesis
- Web Speech API for recognition
- Client-side evaluation

Both modes work great! 🎉

## Tips for Best Results

1. **Use a good microphone** - Built-in laptop mics work fine!
2. **Speak clearly** - Pronounce each word carefully
3. **Quiet environment** - Reduce background noise
4. **Practice regularly** - Consistency improves pronunciation
5. **Start with easier units** - Build confidence gradually

## Where Sentences Come From

### Example Sources:

**From Reading Passages:**
- "It's the first day of school after the long holiday."
- "Amal and Fahad meet their friends in class."

**From Dialogues:**
- "What do you do in your free time?"
- "I enjoy playing football."

**From Examples:**
- "I'm good at drawing."
- "She's confident on stage."

## Files

- `speaking.html` - The practice speaking interface
- `speaking.js` - Logic for loading and practicing sentences
- `webApp.py` - Python Flask server for advanced features
- `requirements.txt` - Python dependencies

## Troubleshooting

**No sentences loaded?**
- Make sure the grade JSON files are in the `lessons/` folder
- Try a different unit
- Check browser console for errors

**Microphone not working?**
- Grant microphone permission when prompted
- Check browser settings for microphone access
- Try a different browser (Chrome/Edge recommended)

**Server not connecting?**
- Make sure `python webApp.py` is running
- Check that it's running on port 5000
- The offline mode will activate automatically if server is down

## Future Enhancements

Potential features to add:
- Record student progress over time
- Difficulty ratings for sentences
- Specific pronunciation tips
- Compare recordings side-by-side
- Group practice mode

---

**Enjoy practicing, habibi! 🎤✨**
