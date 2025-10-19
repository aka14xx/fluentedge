from flask import Blueprint, request, jsonify
import difflib

api_bp = Blueprint('api', __name__)


@api_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Return text/lang for client-side TTS (keeps server dependency-free)."""
    data = request.get_json() or {}
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    return jsonify({'text': text, 'lang': lang, 'note': 'Use Web Speech API to speak this text in the browser'})


def _word_similarity(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


@api_bp.route('/evaluate-pronunciation', methods=['POST'])
def evaluate_pronunciation():
    data = request.get_json() or {}
    spoken = (data.get('spoken_text') or '').strip().lower()
    expected = (data.get('expected_text') or '').strip().lower()
    if not spoken or not expected:
        return jsonify({'error': 'Missing spoken_text or expected_text'}), 400

    s_words = spoken.split()
    e_words = expected.split()

    matched = []
    for ew in e_words:
        best_score = 0.0
        best_sw = ''
        for sw in s_words:
            score = _word_similarity(ew, sw)
            if score > best_score:
                best_score = score
                best_sw = sw
        matched.append({'expected': ew, 'spoken': best_sw, 'score': round(best_score, 3)})

    avg = sum(m['score'] for m in matched) / len(matched) if matched else 0.0
    accuracy = round(avg * 100, 2)

    # star mapping: keep the user's request (2 stars for >=80%) and a sensible mapping
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

    if accuracy >= 90:
        feedback = 'Excellent pronunciation.'
    elif accuracy >= 75:
        feedback = 'Good job, a few issues.'
    elif accuracy >= 50:
        feedback = 'Fair, keep practicing.'
    else:
        feedback = 'Keep trying, focus on problem words.'

    return jsonify({'success': True, 'accuracy': accuracy, 'stars': stars, 'feedback': feedback, 'matched': matched, 'spoken_text': spoken, 'expected_text': expected})


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
