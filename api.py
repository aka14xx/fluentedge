from flask import Blueprint, request, jsonify

api_bp = Blueprint('api', __name__)

# AI pronunciation features removed - keeping only basic API endpoints


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
    return jsonify({'tts': False, 'speech_recognition': False, 'basic_features': True})


@api_bp.route('/evaluate-pronunciation', methods=['POST'])
def evaluate_pronunciation():
    """
    Accepts a file upload (form field 'audio') and a 'target_text' form field.
    Tries to lazy-import speech_recognition and transcribe the audio. If the
    speech libraries are not installed or transcription fails, returns a clear
    JSON response explaining the situation. If transcription succeeds, returns
    a simple similarity score (0-100) comparing the transcript to target_text.
    """
    target = (request.form.get('target_text') or '').strip()
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'no_audio', 'message': 'No audio file provided (form field "audio")'}), 400

    audio_file = request.files['audio']

    # Lazy import to avoid failing app startup if heavy libs aren't installed
    try:
        import speech_recognition as sr
    except Exception as e:
        return jsonify({
            'success': False,
            'available': False,
            'error': 'speech_recognition_unavailable',
            'message': 'speech_recognition (or its dependencies) is not installed on the server.',
            'detail': str(e)
        }), 200

    # Save temporary file and run transcription
    import tempfile, os, difflib
    recognizer = sr.Recognizer()
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        with sr.AudioFile(tmp_path) as source:
            audio_data = recognizer.record(source)

        # Try a sequence of recognizers; prefer offline if available
        transcript = ''
        try:
            # PocketSphinx offline recognizer (if installed)
            transcript = recognizer.recognize_sphinx(audio_data)
        except Exception:
            try:
                # Google Web Speech API (requires network)
                transcript = recognizer.recognize_google(audio_data)
            except Exception as e:
                # Give up gracefully
                return jsonify({'success': False, 'available': True, 'error': 'transcription_failed', 'detail': str(e)}), 200

        # Compute a simple similarity score
        ratio = difflib.SequenceMatcher(None, (target or '').lower(), (transcript or '').lower()).ratio()
        score = round(ratio * 100, 1)

        return jsonify({'success': True, 'available': True, 'transcript': transcript, 'score': score, 'target': target})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
