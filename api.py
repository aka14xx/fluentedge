from flask import Blueprint, request, jsonify
import difflib
import math

api_bp = Blueprint('api', __name__)


@api_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Lightweight endpoint: returns the text and language to speak.
    Clients should use the Web Speech API or any TTS client.
    This avoids server-side TTS dependencies.
    """
    data = request.get_json() or {}
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    return jsonify({'text': text, 'lang': lang, 'note': 'Client should perform TTS using Web Speech API for best UX.'})


def _word_similarity(a, b):
    # Ratio from difflib for simple fuzzy matching of two words
    return difflib.SequenceMatcher(None, a, b).ratio()


@api_bp.route('/evaluate-pronunciation', methods=['POST'])
def evaluate_pronunciation():
    """Evaluate pronunciation using fuzzy word matching.
    Accepts JSON: {spoken_text, expected_text}
    Returns: accuracy (0-100), stars (1-5), per-word results.
    """
    data = request.get_json() or {}
    spoken = (data.get('spoken_text') or '').strip().lower()
    expected = (data.get('expected_text') or '').strip().lower()
    if not spoken or not expected:
        return jsonify({'error': 'Missing spoken_text or expected_text'}), 400

    spoken_words = spoken.split()
    expected_words = expected.split()

    # Align words by simple greedy matching based on best similarity
    matched = []
    for ew in expected_words:
        best = None
        best_score = 0.0
        best_idx = None
        for i, sw in enumerate(spoken_words):
            score = _word_similarity(ew, sw)
            if score > best_score:
                best_score = score
                best = sw
                best_idx = i
        if best is not None:
            matched.append({'expected': ew, 'spoken': best, 'score': round(best_score, 3)})
        else:
            matched.append({'expected': ew, 'spoken': '', 'score': 0.0})

    # Compute accuracy as mean of best scores, converted to percent
    if matched:
        avg_score = sum(m['score'] for m in matched) / len(matched)
    else:
        avg_score = 0.0

    accuracy = round(avg_score * 100, 2)

    # Map accuracy to stars (2 stars for >=80% per previous request)
    if accuracy >= 95:
        stars = 5
    elif accuracy >= 85:
        stars = 4
    elif accuracy >= 80:
        stars = 2
    elif accuracy >= 60:
        stars = 3
    elif accuracy >= 40:
        stars = 1
    else:
        stars = 1

    # Feedback message
    if accuracy >= 90:
        feedback = 'Excellent pronunciation.'
    elif accuracy >= 75:
        feedback = 'Good job, minor issues.'
    elif accuracy >= 50:
        feedback = 'Fair, keep practicing.'
    else:
        feedback = 'Keep trying, focus on problem words.'

    return jsonify({
        'success': True,
        'accuracy': accuracy,
        'stars': stars,
        'feedback': feedback,
        'matched': matched,
        'spoken_text': spoken,
        'expected_text': expected,
        'ai_powered': False
    })


@api_bp.route('/practice-phrases', methods=['GET'])
def get_practice_phrases():
    phrases = {
        'beginner': [
            'Hello, how are you?',
            'My name is...',
            'Nice to meet you.',
            'Thank you very much.',
            'Good morning!'
        ],
        'intermediate': [
            'Can you help me with this?',
            'I would like to learn English.',
            'What time is it?',
            'Where is the library?',
            'I enjoy reading books.'
        ],
        'advanced': [
            "I'm interested in improving my pronunciation.",
            'Could you please explain that again?',
            'I appreciate your assistance.',
            'The weather is quite pleasant today.',
            "I'm looking forward to our conversation."
        ]
    }
    level = request.args.get('level', 'beginner')
    return jsonify({'level': level, 'phrases': phrases.get(level, phrases['beginner'])})


@api_bp.route('/check-ai-status', methods=['GET'])
def check_ai_status():
    # lightweight: only basic features available
    return jsonify({'tts': False, 'speech_recognition': False, 'basic_features': True})
from flask import Blueprint, request, jsonify, send_file
import tempfile
import os
import base64

api_bp = Blueprint('api', __name__)

# Feature availability flags (import at runtime, optional)
try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except Exception:
    TTS_AVAILABLE = False

try:
    import speech_recognition as sr
    from pydub import AudioSegment
    SR_AVAILABLE = True
except Exception:
    SR_AVAILABLE = False


@api_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using gTTS (if available). Returns an MP3 file."""
    if not TTS_AVAILABLE:
        return jsonify({'error': 'TTS not available'}), 503

    data = request.get_json() or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tmp.close()
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(tmp.name)
        return send_file(tmp.name, mimetype='audio/mpeg')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/evaluate-pronunciation', methods=['POST'])
def evaluate_pronunciation():
    """Evaluate pronunciation. Accepts multipart 'audio' + form 'text' or JSON {spoken_text, expected_text}."""
    try:
        if 'audio' in request.files:
            audio_file = request.files['audio']
            expected_text = request.form.get('text', '').strip()
            if not expected_text:
                return jsonify({'error': 'Missing expected text'}), 400

            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1] or '.webm')
            tmp.close()
            audio_file.save(tmp.name)

            if SR_AVAILABLE:
                recognizer = sr.Recognizer()
                try:
                    # try converting to WAV for recognition
                    wav_path = tmp.name + '.wav'
                    try:
                        AudioSegment.from_file(tmp.name).export(wav_path, format='wav')
                        audio_path = wav_path
                    except Exception:
                        audio_path = tmp.name

                    with sr.AudioFile(audio_path) as source:
                        audio_data = recognizer.record(source)
                        spoken_text = recognizer.recognize_google(audio_data).lower().strip()
                except Exception as e:
                    # transcribe failed
                    try:
                        os.unlink(tmp.name)
                    except Exception:
                        pass
                    return jsonify({
                        'success': True,
                        'accuracy': 50,
                        'feedback': 'Recording received but speech recognition failed',
                        'stars': 2,
                        'spoken_text': 'Could not transcribe',
                        'expected_text': expected_text,
                        'ai_powered': False
                    })
                finally:
                    try:
                        if os.path.exists(tmp.name):
                            os.unlink(tmp.name)
                        if 'wav_path' in locals() and os.path.exists(wav_path):
                            os.unlink(wav_path)
                    except Exception:
                        pass
            else:
                try:
                    os.unlink(tmp.name)
                except Exception:
                    pass
                return jsonify({
                    'success': True,
                    'accuracy': 50,
                    'feedback': 'Recording received but speech recognition unavailable. Install SpeechRecognition and pydub',
                    'stars': 2,
                    'spoken_text': 'Could not transcribe',
                    'expected_text': expected_text,
                    'ai_powered': False
                })
        else:
            data = request.get_json() or {}
            spoken_text = data.get('spoken_text', '').lower().strip()
            expected_text = data.get('expected_text', '').lower().strip()
            if not spoken_text or not expected_text:
                return jsonify({'error': 'Missing spoken_text or expected_text'}), 400

        # word-by-word exact match accuracy
        spoken_words = spoken_text.split()
        expected_words = expected_text.split()
        correct = sum(1 for s, e in zip(spoken_words, expected_words) if s == e)
        total = max(len(spoken_words), len(expected_words))
        accuracy = (correct / total * 100) if total > 0 else 0

        # Feedback mapping
        if accuracy >= 90:
            feedback = 'Excellent! Perfect pronunciation! 🌟'
            stars = 5
        elif accuracy >= 75:
            feedback = 'Great job! Very good pronunciation! ⭐'
            stars = 4
        elif accuracy >= 60:
            feedback = 'Good effort! Keep practicing! 👍'
            stars = 3
        elif accuracy >= 40:
            feedback = 'Nice try! Practice makes perfect! 💪'
            stars = 2
        else:
            feedback = 'Keep trying! You can do it! 🎯'
            stars = 1

        return jsonify({
            'success': True,
            'accuracy': round(accuracy, 2),
            'feedback': feedback,
            'stars': stars,
            'spoken_text': spoken_text,
            'expected_text': expected_text,
            'ai_powered': False
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/practice-phrases', methods=['GET'])
def get_practice_phrases():
    phrases = {
        'beginner': [
            'Hello, how are you?',
            'My name is...',
            'Nice to meet you.',
            'Thank you very much.',
            'Good morning!'
        ],
        'intermediate': [
            'Can you help me with this?',
            'I would like to learn English.',
            'What time is it?',
            'Where is the library?',
            'I enjoy reading books.'
        ],
        'advanced': [
            "I'm interested in improving my pronunciation.",
            'Could you please explain that again?',
            'I appreciate your assistance.',
            'The weather is quite pleasant today.',
            "I'm looking forward to our conversation."
        ]
    }
    level = request.args.get('level', 'beginner')
    return jsonify({'level': level, 'phrases': phrases.get(level, phrases['beginner'])})


@api_bp.route('/check-ai-status', methods=['GET'])
def check_ai_status():
    return jsonify({'tts': TTS_AVAILABLE, 'speech_recognition': SR_AVAILABLE, 'basic_features': True})
