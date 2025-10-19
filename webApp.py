from flask import Flask, render_template
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def home():
    return render_template("index.html")

# Example route for other pages
@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio file"""
    try:
        if not TTS_AVAILABLE:
            return jsonify({"error": "TTS not available"}), 503
            
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Create temporary file for audio
        tts = gTTS(text=text, lang='en', slow=False)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tts.save(temp_file.name)
        
        return send_file(temp_file.name, mimetype='audio/mp3')
    
    except Exception as e:
        print(f"Error in TTS: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/evaluate-pronunciation-ai', methods=['POST'])
def evaluate_pronunciation_ai():
    """Advanced AI-based pronunciation evaluation using the AI trainer"""
    try:
        if not AI_TRAINER_AVAILABLE:
            return jsonify({"error": "AI trainer not available", "fallback": True}), 503
        
        data = request.json
        audio_base64 = data.get('audio_base64', '')
        expected_text = data.get('expected_text', '')
        
        if not audio_base64 or not expected_text:
            return jsonify({"error": "Missing audio or expected text"}), 400
        
        # Process with AI trainer
        import torch
        import base64
        import audioread
        import numpy as np
        from torchaudio.transforms import Resample
        
        # Decode audio
        file_bytes = base64.b64decode(audio_base64.split(',')[1] if ',' in audio_base64 else audio_base64)
        
        # Save to temp file
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
        temp_audio.write(file_bytes)
        temp_audio.flush()
        temp_audio.close()
        
        # Load and process audio
        try:
            import soundfile as sf
            signal, fs = sf.read(temp_audio.name)
            if len(signal.shape) > 1:
                signal = signal.mean(axis=1)  # Convert to mono
        except:
            # Fallback to audioread
            with audioread.audio_open(temp_audio.name) as f:
                fs = f.samplerate
                signal = np.concatenate([np.frombuffer(buf, dtype=np.int16) for buf in f])
                signal = signal.astype(np.float32) / 32768.0
        
        # Resample if needed
        if fs != 16000:
            transform = Resample(orig_freq=fs, new_freq=16000)
            signal = transform(torch.Tensor(signal))
        else:
            signal = torch.Tensor(signal)
        
        signal = signal.unsqueeze(0)
        
        # Process with AI trainer
        result = trainer_en.processAudioForGivenText(signal, expected_text)
        
        # Clean up
        os.unlink(temp_audio.name)
        
        # Extract results
        accuracy = float(result['pronunciation_accuracy'])
        
        # Determine feedback based on accuracy
        if accuracy >= 90:
            feedback = "Excellent! Perfect pronunciation! 🌟"
            stars = 5
        elif accuracy >= 75:
            feedback = "Great job! Very good pronunciation! ⭐"
            stars = 4
        elif accuracy >= 60:
            feedback = "Good effort! Keep practicing! 👍"
            stars = 3
        elif accuracy >= 40:
            feedback = "Nice try! Practice makes perfect! 💪"
            stars = 2
        else:
            feedback = "Keep trying! You can do it! 🎯"
            stars = 1
        
        return jsonify({
            "success": True,
            "accuracy": round(accuracy, 2),
            "feedback": feedback,
            "stars": stars,
            "spoken_text": result['recording_transcript'],
            "expected_text": expected_text,
            "detailed_results": {
                "ipa_transcript": result.get('recording_ipa', ''),
                "real_transcripts": result.get('real_transcripts', ''),
                "matched_transcripts": result.get('matched_transcripts', ''),
                "pronunciation_categories": result.get('pronunciation_categories', [])
            },
            "ai_powered": True
        })
    
    except Exception as e:
        print(f"Error in AI evaluation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "fallback": True}), 500

@app.route('/api/evaluate-pronunciation', methods=['POST'])
def evaluate_pronunciation():
    """Pronunciation evaluation - accepts audio file or text"""
    try:
        # Check if audio file was uploaded
        if 'audio' in request.files:
            audio_file = request.files['audio']
            expected_text = request.form.get('text', '').strip()
            
            if not expected_text:
                return jsonify({"error": "Missing expected text"}), 400
            
            # Save audio temporarily
            import tempfile
            import os
            
            temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
            audio_file.save(temp_audio.name)
            temp_audio.close()
            
            try:
                # Try to use speech recognition
                import speech_recognition as sr
                recognizer = sr.Recognizer()
                
                # Convert webm to wav if needed
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(temp_audio.name)
                    wav_path = temp_audio.name.replace('.webm', '.wav')
                    audio.export(wav_path, format='wav')
                    audio_path = wav_path
                except:
                    audio_path = temp_audio.name
                
                # Recognize speech
                with sr.AudioFile(audio_path) as source:
                    audio_data = recognizer.record(source)
                    spoken_text = recognizer.recognize_google(audio_data).lower().strip()
                
                # Clean up temp files
                try:
                    os.unlink(temp_audio.name)
                    if audio_path != temp_audio.name:
                        os.unlink(audio_path)
                except:
                    pass
                    
            except Exception as e:
                print(f"Speech recognition error: {e}")
                # Fallback response
                os.unlink(temp_audio.name)
                return jsonify({
                    "success": True,
                    "accuracy": 50,
                    "feedback": "Recording received but speech recognition unavailable. Install: pip install SpeechRecognition pydub",
                    "stars": 2,
                    "spoken_text": "Could not transcribe",
                    "expected_text": expected_text,
                    "ai_powered": False
                })
        else:
            # JSON request with text
            data = request.json
            spoken_text = data.get('spoken_text', '').lower().strip()
            expected_text = data.get('expected_text', '').lower().strip()
            
            if not spoken_text or not expected_text:
                return jsonify({"error": "Missing spoken_text or expected_text"}), 400
        
        # Simple word-by-word comparison
        spoken_words = spoken_text.split()
        expected_words = expected_text.split()
        
        # Calculate accuracy
        correct_words = sum(1 for s, e in zip(spoken_words, expected_words) if s == e)
        total_words = max(len(spoken_words), len(expected_words))
        accuracy = (correct_words / total_words * 100) if total_words > 0 else 0
        
        # Determine feedback
        if accuracy >= 90:
            feedback = "Excellent! Perfect pronunciation! 🌟"
            stars = 5
        elif accuracy >= 75:
            feedback = "Great job! Very good pronunciation! ⭐"
            stars = 4
        elif accuracy >= 60:
            feedback = "Good effort! Keep practicing! 👍"
            stars = 3
        elif accuracy >= 40:
            feedback = "Nice try! Practice makes perfect! 💪"
            stars = 2
        else:
            feedback = "Keep trying! You can do it! 🎯"
            stars = 1
        
        return jsonify({
            "success": True,
            "accuracy": round(accuracy, 2),
            "feedback": feedback,
            "stars": stars,
            "spoken_text": spoken_text,
            "expected_text": expected_text,
            "ai_powered": False
        })
    
    except Exception as e:
        print(f"Error in evaluation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/practice-phrases', methods=['GET'])
def get_practice_phrases():
    """Get practice phrases for different levels"""
    phrases = {
        "beginner": [
            "Hello, how are you?",
            "My name is...",
            "Nice to meet you.",
            "Thank you very much.",
            "Good morning!"
        ],
        "intermediate": [
            "Can you help me with this?",
            "I would like to learn English.",
            "What time is it?",
            "Where is the library?",
            "I enjoy reading books."
        ],
        "advanced": [
            "I'm interested in improving my pronunciation.",
            "Could you please explain that again?",
            "I appreciate your assistance.",
            "The weather is quite pleasant today.",
            "I'm looking forward to our conversation."
        ]
    }
    
    level = request.args.get('level', 'beginner')
    return jsonify({
        "level": level,
        "phrases": phrases.get(level, phrases['beginner'])
    })

@app.route('/api/check-ai-status', methods=['GET'])
def check_ai_status():
    """Check if AI features are available"""
    return jsonify({
        "ai_trainer": AI_TRAINER_AVAILABLE,
        "tts": TTS_AVAILABLE,
        "basic_features": True
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎤 Omani English Tutor - Practice Speaking Server")
    print("="*60)
    print("📍 Server running at http://localhost:5000")
    print("\n✅ Available Features:")
    print(f"   {'✓' if AI_TRAINER_AVAILABLE else '✗'} AI Pronunciation Analysis")
    print(f"   {'✓' if TTS_AVAILABLE else '✗'} Text-to-Speech")
    print("   ✓ Basic Pronunciation Scoring")
    print("   ✓ Practice Phrases")
    print("\n🚀 Ready to practice speaking!")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
