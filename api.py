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
