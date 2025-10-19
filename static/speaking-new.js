// Omani English Tutor - Speaking Practice (Professional UI)
// Adapted from AI Pronunciation Trainer

// Audio context initialization
let mediaRecorder, audioChunks, audioBlob, stream, audioRecorded;
const ctx = new AudioContext();
let currentAudioForPlaying;
let lettersOfWordAreCorrect = [];

// UI-related variables
const page_title = "🎤 Practice Speaking";
const accuracy_colors = ["green", "orange", "red"];
let currentSample = 0;
let currentScore = 0;
let currentGrade = 5;
let currentUnit = 'all';
let isRecording = false;
let currentSoundRecorded = false;
let currentText = "";
let phrases = [];
let currentPhraseIndex = 0;
let lessonData = null;

// API related variables
const API_URL = 'http://localhost:5000';

// Speech synthesis
var synth = window.speechSynthesis;
let voice_synth = null;

//############################ UI general control functions ###################
const unblockUI = () => {
    document.getElementById("recordAudio").classList.remove('disabled');
    document.getElementById("playSampleAudio").classList.remove('disabled');
    document.getElementById("buttonNext").onclick = () => getNextSample();
    document.getElementById("nextButtonDiv").classList.remove('disabled');
    document.getElementById("original_script").classList.remove('disabled');
    document.getElementById("buttonNext").style["background-color"] = '#49d67d'; // GREEN!

    if (currentSoundRecorded)
        document.getElementById("playRecordedAudio").classList.remove('disabled');
};

const blockUI = () => {
    document.getElementById("recordAudio").classList.add('disabled');
    document.getElementById("playSampleAudio").classList.add('disabled');
    document.getElementById("buttonNext").onclick = null;
    document.getElementById("original_script").classList.add('disabled');
    document.getElementById("playRecordedAudio").classList.add('disabled');
    document.getElementById("buttonNext").style["background-color"] = '#cccccc'; // Light gray when disabled
};

const UIError = () => {
    blockUI();
    document.getElementById("buttonNext").onclick = () => getNextSample();
    document.getElementById("buttonNext").style["background-color"] = '#58636d';
    document.getElementById("recorded_ipa_script").innerHTML = "";
    document.getElementById("single_word_ipa_pair").innerHTML = "Error";
    document.getElementById("ipa_script").innerHTML = "Error";
    document.getElementById("main_title").innerHTML = 'Error loading sentence';
    document.getElementById("original_script").innerHTML = 'Could not load sentence. Try clicking the green button again!';
};

const UIRecordingError = () => {
    unblockUI();
    document.getElementById("main_title").innerHTML = "Recording error, please try again";
    startMediaDevice();
};

//################### Application state functions #######################
function updateScore(currentPronunciationScore) {
    if (isNaN(currentPronunciationScore))
        return;
    currentScore += Math.round(currentPronunciationScore / 20); // Convert percentage to stars (0-5)
    
    // Update global stars
    const globalStars = parseInt(localStorage.getItem('globalStars') || '0', 10);
    localStorage.setItem('globalStars', globalStars + Math.round(currentPronunciationScore / 20));
}

// Change grade
const changeGrade = async (grade) => {
    currentGrade = grade;
    document.getElementById("gradeBox").innerHTML = `Grade ${grade}`;
    await loadUnitsForGrade(grade);
    phrases = [];
    currentPhraseIndex = 0;
    blockUI();
    document.getElementById("original_script").innerHTML = 'Click the green button to load sentences!';
};

// Change unit
const changeUnit = (unit) => {
    currentUnit = unit;
    if (unit === 'all') {
        document.getElementById("unitBox").innerHTML = 'All Units';
    } else {
        const unitData = lessonData.units.find(u => u.unit == unit);
        document.getElementById("unitBox").innerHTML = `Unit ${unit}${unitData ? ': ' + unitData.title : ''}`;
    }
    phrases = [];
    currentPhraseIndex = 0;
};

// Load units for selected grade
const loadUnitsForGrade = async (grade) => {
    try {
        const response = await fetch(`lessons/grade${grade}.json`);
        lessonData = await response.json();
        
        // Populate unit dropdown
        const unitDropdown = document.getElementById('unitDropdown');
        unitDropdown.innerHTML = '<a href="javascript:changeUnit(\'all\')" class="accuracy-text" style="padding-top: 3px;">All Units</a>';
        
        lessonData.units.forEach(unit => {
            const link = document.createElement('a');
            link.href = `javascript:changeUnit(${unit.unit})`;
            link.className = 'accuracy-text';
            link.style.paddingTop = '3px';
            link.textContent = `Unit ${unit.unit}: ${unit.title}`;
            unitDropdown.appendChild(link);
        });
    } catch (error) {
        console.error('Error loading grade data:', error);
    }
};

// Load sentences from lessons
const loadSentencesFromLessons = async () => {
    try {
        if (!lessonData) {
            await loadUnitsForGrade(currentGrade);
        }

        phrases = [];

        // Filter units based on selection
        const unitsToProcess = currentUnit === 'all' 
            ? lessonData.units 
            : lessonData.units.filter(u => u.unit == currentUnit);

        // Extract sentences from lessons
        unitsToProcess.forEach(unit => {
            unit.lessons.forEach(lesson => {
                // Extract from reading passages
                if (lesson.sections.read && lesson.sections.read.passage) {
                    const passage = lesson.sections.read.passage;
                    const sentences = passage
                        .split(/[.!?]+/)
                        .map(s => s.trim())
                        .filter(s => s.length > 10 && s.length < 150)
                        .map(s => s + '.');
                    
                    phrases.push(...sentences);
                }

                // Extract example sentences from teach sections
                if (lesson.sections.teach && lesson.sections.teach.points) {
                    lesson.sections.teach.points.forEach(point => {
                        if (typeof point === 'string') {
                            const matches = point.match(/"([^"]+)"/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const sentence = match.replace(/"/g, '').trim();
                                    if (sentence.length > 10 && sentence.length < 150) {
                                        phrases.push(sentence);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        // Remove duplicates and shuffle
        phrases = [...new Set(phrases)];
        phrases = phrases.sort(() => Math.random() - 0.5);

        if (phrases.length === 0) {
            throw new Error('No sentences found');
        }

        currentPhraseIndex = 0;
        console.log(`✅ Loaded ${phrases.length} sentences from Grade ${currentGrade}`);
        return true;
    } catch (error) {
        console.error('Error loading sentences:', error);
        return false;
    }
};

// Get next sample
const getNextSample = async () => {
    blockUI();

    // Load sentences if not already loaded
    if (phrases.length === 0) {
        document.getElementById("main_title").innerHTML = "Loading sentences from lessons...";
        const loaded = await loadSentencesFromLessons();
        
        if (!loaded) {
            UIError();
            return;
        }
    }

    updateScore(parseFloat(document.getElementById("pronunciation_accuracy").innerHTML));

    document.getElementById("main_title").innerHTML = "Loading new sentence...";

    try {
        // Get current sentence
        currentText = phrases[currentPhraseIndex];
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;

        let doc = document.getElementById("original_script");
        doc.innerHTML = currentText;

        document.getElementById("ipa_script").innerHTML = "Click the 🔊 Play button to hear the sentence";
        document.getElementById("recorded_ipa_script").innerHTML = "";
        document.getElementById("pronunciation_accuracy").innerHTML = "";
        document.getElementById("single_word_ipa_pair").innerHTML = "Click on words above to hear them individually";
        document.getElementById("section_accuracy").innerHTML = `| Score: ${currentScore} ⭐ | Accuracy: - `;
        currentSample += 1;

        document.getElementById("main_title").innerHTML = page_title;
        document.getElementById("translated_script").innerHTML = `💡 Sentence ${currentSample} of ${phrases.length} - Speak clearly and try to match the pronunciation!`;

        currentSoundRecorded = false;
        unblockUI();
        document.getElementById("playRecordedAudio").classList.add('disabled');

    } catch (error) {
        console.error('Error getting sample:', error);
        UIError();
    }
};

// Update recording state
const updateRecordingState = async () => {
    if (isRecording) {
        stopRecording();
    } else {
        recordSample();
    }
};

// Record sample
const recordSample = async () => {
    document.getElementById("main_title").innerHTML = "🎙️ Recording... click the mic again when done speaking";
    document.getElementById("recordIcon").innerHTML = 'pause_presentation';
    blockUI();
    document.getElementById("recordAudio").classList.remove('disabled');
    audioChunks = [];
    isRecording = true;
    mediaRecorder.start();
};

// Stop recording
const stopRecording = () => {
    isRecording = false;
    mediaRecorder.stop();
    document.getElementById("main_title").innerHTML = "Processing your pronunciation...";
};

// Media device initialization
const mediaStreamConstraints = {
    audio: {
        channelCount: 1,
        sampleRate: 48000
    }
};

const startMediaDevice = () => {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then(_stream => {
        stream = _stream;
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            document.getElementById("recordIcon").innerHTML = 'mic';
            blockUI();

            audioBlob = new Blob(audioChunks, { type: 'audio/webm;' });
            let audioUrl = URL.createObjectURL(audioBlob);
            audioRecorded = new Audio(audioUrl);

            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
                const audioBase64 = reader.result;

                try {
                    // Try AI evaluation first
                    const response = await fetch(`${API_URL}/api/evaluate-pronunciation-ai`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            audio_base64: audioBase64,
                            expected_text: currentText
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        displayResults(data);
                    } else {
                        throw new Error('AI evaluation failed, using fallback');
                    }
                } catch (error) {
                    console.log('⚠️ Using speech recognition fallback:', error);
                    // Fallback to speech recognition
                    useSpeechRecognitionFallback(audioBlob);
                }
            };
        };
    }).catch(error => {
        console.error('Microphone access error:', error);
        alert('⚠️ Please allow microphone access to use this feature!');
    });
};

// Fallback speech recognition
const useSpeechRecognitionFallback = async (audioBlob) => {
    try {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = async (event) => {
            const spokenText = event.results[0][0].transcript;
            await evaluateBasic(spokenText, currentText);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            document.getElementById("main_title").innerHTML = "❌ Could not recognize speech. Try again!";
            unblockUI();
        };

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        recognition.start();
        await audio.play();

    } catch (error) {
        console.error('Speech recognition error:', error);
        document.getElementById("main_title").innerHTML = "❌ Error processing speech";
        unblockUI();
    }
};

// Basic evaluation (fallback)
const evaluateBasic = async (spoken, expected) => {
    const spokenWords = spoken.toLowerCase().trim().split(/\s+/);
    const expectedWords = expected.toLowerCase().trim().split(/\s+/);
    
    let correctWords = 0;
    for (let i = 0; i < Math.min(spokenWords.length, expectedWords.length); i++) {
        if (spokenWords[i] === expectedWords[i]) {
            correctWords++;
        }
    }
    
    const accuracy = (correctWords / Math.max(spokenWords.length, expectedWords.length)) * 100;
    
    let feedback, stars;
    if (accuracy >= 90) {
        feedback = "Excellent! Perfect pronunciation! 🌟";
        stars = 5;
    } else if (accuracy >= 75) {
        feedback = "Great job! Very good pronunciation! ⭐";
        stars = 4;
    } else if (accuracy >= 60) {
        feedback = "Good effort! Keep practicing! 👍";
        stars = 3;
    } else if (accuracy >= 40) {
        feedback = "Nice try! Practice makes perfect! 💪";
        stars = 2;
    } else {
        feedback = "Keep trying! You can do it! 🎯";
        stars = 1;
    }
    
    const result = {
        accuracy: accuracy.toFixed(2),
        feedback,
        stars,
        spoken_text: spoken,
        expected_text: expected,
        ai_powered: false
    };

    displayResults(result);
};

// Display results
const displayResults = (data) => {
    const accuracy = parseFloat(data.accuracy);
    
    document.getElementById("pronunciation_accuracy").innerHTML = accuracy.toFixed(0) + "%";
    document.getElementById("recorded_ipa_script").innerHTML = `You said: "${data.spoken_text}"`;
    document.getElementById("ipa_script").innerHTML = `Expected: "${data.expected_text}"`;
    document.getElementById("main_title").innerHTML = page_title;
    document.getElementById("translated_script").innerHTML = data.feedback + (data.ai_powered ? ' 🤖 AI-Analyzed' : '');
    
    // Color the original text based on accuracy
    const currentTextWords = currentText.split(" ");
    const spokenWords = data.spoken_text.toLowerCase().split(" ");
    const expectedWords = data.expected_text.toLowerCase().split(" ");
    
    let coloredWords = "";
    for (let i = 0; i < currentTextWords.length; i++) {
        const isCorrect = i < spokenWords.length && 
                         spokenWords[i].toLowerCase().replace(/[.,!?]/g, '') === 
                         expectedWords[i].toLowerCase().replace(/[.,!?]/g, '');
        const color = isCorrect ? 'green' : 'red';
        coloredWords += `<font color="${color}">${currentTextWords[i]}</font> `;
    }
    
    document.getElementById("original_script").innerHTML = coloredWords;
    document.getElementById("single_word_ipa_pair").innerHTML = `${data.feedback} - You earned ${data.stars || 0} stars! ⭐`;
    
    // Update score
    updateScore(accuracy);
    document.getElementById("section_accuracy").innerHTML = `| Score: ${currentScore} ⭐ | Accuracy: ${accuracy.toFixed(0)}%`;
    
    currentSoundRecorded = true;
    unblockUI();
    document.getElementById("playRecordedAudio").classList.remove('disabled');
};

// Audio playback
const playAudio = async () => {
    document.getElementById("main_title").innerHTML = "🔊 Playing sentence...";
    blockUI();
    
    try {
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: currentText })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                document.getElementById("main_title").innerHTML = "✅ Sentence was played";
                unblockUI();
            };
            
            await audio.play();
        } else {
            throw new Error('TTS failed');
        }
    } catch (error) {
        console.log('Using browser speech synthesis:', error);
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(currentText);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            document.getElementById("main_title").innerHTML = "✅ Sentence was played";
            unblockUI();
        };
        
        speechSynthesis.speak(utterance);
    }
};

const playRecording = async () => {
    if (!audioRecorded) return;
    
    blockUI();
    document.getElementById("main_title").innerHTML = "🔊 Playing your recording...";
    
    audioRecorded.onended = () => {
        document.getElementById("main_title").innerHTML = "✅ Your recording was played";
        unblockUI();
    };
    
    await audioRecorded.play();
};

// Initialization
window.addEventListener('load', async () => {
    startMediaDevice();
    await loadUnitsForGrade(5);
    
    // Set initial UI state
    blockUI();
    document.getElementById("original_script").innerHTML = 'Click the green button on the right to load sentences from your lessons!';
    document.getElementById("ipa_script").innerHTML = 'Select your grade and unit from the dropdowns above';
    document.getElementById("translated_script").innerHTML = '💡 Tip: Make sure to allow microphone access when prompted!';
});
