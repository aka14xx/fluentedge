// Omani English Tutor - Beautiful Speaking Practice
// Clean, working JavaScript

// State variables
let currentGrade = '5';
let currentUnit = 'all';
let allSentences = [];
let currentSentenceIndex = 0;
let currentScore = 0;
let currentSample = 0;

// Audio recording
let mediaRecorder;
let audioChunks = [];
let audioBlob;
let stream;
let isRecording = false;
let hasRecording = false;

// Current practice
let currentText = '';

const API_URL = 'http://localhost:5000';

//============================================
// INITIALIZATION
//============================================
window.addEventListener('load', async () => {
    console.log('🎤 Practice Speaking loaded');
    await startMicrophone();
    await loadSentencesFromLessons();
    updateStatus('Ready! Click the green arrow to load a sentence.');
});

async function startMicrophone() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone ready');
    } catch (error) {
        console.error('❌ Microphone error:', error);
        updateStatus('Cannot access microphone. Please allow access.');
    }
}

//============================================
// GRADE & UNIT SELECTION
//============================================
function changeGrade(grade) {
    currentGrade = grade;
    document.getElementById('gradeBtn').textContent = `Grade ${grade}`;
    loadSentencesFromLessons();
    console.log(`Changed to Grade ${grade}`);
}

function changeUnit(unit) {
    currentUnit = unit;
    if (unit === 'all') {
        document.getElementById('unitBtn').textContent = 'All Units';
    } else {
        document.getElementById('unitBtn').textContent = `Unit ${unit}`;
    }
    loadSentencesFromLessons();
    console.log(`Changed to Unit ${unit}`);
}

//============================================
// LOAD SENTENCES FROM JSON
//============================================
async function loadSentencesFromLessons() {
    try {
        updateStatus('Loading sentences...');
        const response = await fetch(`/lessons/grade${currentGrade}.json`);
        const data = await response.json();
        
        allSentences = [];
        
        if (currentUnit === 'all') {
            // Load all units
            data.units.forEach(unit => {
                extractSentencesFromUnit(unit);
            });
        } else {
            // Load specific unit
            const unitIndex = parseInt(currentUnit) - 1;
            if (data.units[unitIndex]) {
                extractSentencesFromUnit(data.units[unitIndex]);
            }
        }
        
        currentSentenceIndex = 0;
        console.log(`✅ Loaded ${allSentences.length} sentences`);
        updateStatus(`Loaded ${allSentences.length} sentences. Click the arrow to start!`);
        
    } catch (error) {
        console.error('Error loading sentences:', error);
        updateStatus('Error loading sentences. Check console.');
    }
}

function extractSentencesFromUnit(unit) {
    unit.lessons.forEach(lesson => {
        // From reading passages
        if (lesson.reading && lesson.reading.passage) {
            const sentences = lesson.reading.passage
                .split(/[.!?]+/)
                .map(s => s.trim())
                .filter(s => s.length > 10 && s.length < 150);
            allSentences.push(...sentences);
        }
        
        // From examples
        if (lesson.examples) {
            lesson.examples.forEach(ex => {
                if (ex.sentence && ex.sentence.length > 10) {
                    allSentences.push(ex.sentence);
                }
            });
        }
    });
}

//============================================
// GET NEXT SENTENCE
//============================================
function getNextSample() {
    if (allSentences.length === 0) {
        updateStatus('No sentences loaded! Please select a grade/unit.');
        return;
    }
    
    // Get next sentence
    currentText = allSentences[currentSentenceIndex];
    currentSentenceIndex = (currentSentenceIndex + 1) % allSentences.length;
    
    // Update UI
    document.getElementById('sentenceText').textContent = currentText;
    document.getElementById('ipaText').textContent = 'Click the play button to hear this sentence.';
    document.getElementById('pronunciationScore').textContent = '-';
    document.getElementById('pronunciationScore').className = 'score-value';
    
    // Enable mic button
    document.getElementById('micBtn').classList.remove('disabled');
    
    // Reset recording
    hasRecording = false;
    document.getElementById('playRecordingBtn').classList.add('disabled');
    
    currentSample++;
    updateStatus('Sentence loaded! Click play to hear it, then record yourself.');
    
    console.log(`📝 Sample ${currentSample}: ${currentText}`);
}

//============================================
// PLAY AUDIO (TTS)
//============================================
async function playAudio() {
    if (!currentText || currentText.length === 0) {
        updateStatus('Load a sentence first!');
        return;
    }
    
    updateStatus('Loading audio...');
    disableButtons();
    
    try {
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: currentText })
        });
        
        if (!response.ok) {
            throw new Error('TTS failed');
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onplay = () => updateStatus('🔊 Playing...');
        audio.onended = () => {
            updateStatus('Ready to record! Click the green mic button.');
            enableButtons();
        };
        audio.onerror = () => {
            updateStatus('Audio playback error');
            enableButtons();
        };
        
        await audio.play();
        
    } catch (error) {
        console.error('TTS Error:', error);
        updateStatus('Could not play audio. Check server.');
        enableButtons();
    }
}

//============================================
// PLAY RECORDING
//============================================
function playRecording() {
    if (!hasRecording || !audioBlob) {
        updateStatus('No recording available!');
        return;
    }
    
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onplay = () => updateStatus('🔊 Playing your recording...');
    audio.onended = () => updateStatus('Recording played.');
    audio.play();
}

//============================================
// RECORD AUDIO
//============================================
function recordSample() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    if (!stream) {
        await startMicrophone();
    }
    
    if (!stream) {
        updateStatus('Microphone not available!');
        return;
    }
    
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = async () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        hasRecording = true;
        document.getElementById('playRecordingBtn').classList.remove('disabled');
        updateStatus('Processing your pronunciation...');
        await evaluatePronunciation();
    };
    
    mediaRecorder.start();
    isRecording = true;
    
    // Update UI
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.add('recording');
    updateStatus('🎙️ Recording... Click mic again to stop.');
    
    disableButtons();
    micBtn.classList.remove('disabled');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        const micBtn = document.getElementById('micBtn');
        micBtn.classList.remove('recording');
        updateStatus('Processing...');
    }
}

//============================================
// EVALUATE PRONUNCIATION
//============================================
async function evaluatePronunciation() {
    if (!audioBlob || !currentText) {
        enableButtons();
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('text', currentText);
        
        const response = await fetch(`${API_URL}/api/evaluate-pronunciation`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Evaluation failed');
        }
        
        const result = await response.json();
        displayResults(result);
        
    } catch (error) {
        console.error('Evaluation error:', error);
        updateStatus('Evaluation error. Check console.');
        document.getElementById('pronunciationScore').textContent = 'Error';
    }
    
    enableButtons();
}

//============================================
// DISPLAY RESULTS
//============================================
function displayResults(result) {
    const accuracy = result.accuracy || result.pronunciationScore || 0;
    const score = Math.round(accuracy);
    
    // Update pronunciation score
    const scoreElement = document.getElementById('pronunciationScore');
    scoreElement.textContent = `${score}%`;
    
    // Color code
    if (score >= 70) {
        scoreElement.className = 'score-value score-green';
    } else if (score >= 40) {
        scoreElement.className = 'score-value score-orange';
    } else {
        scoreElement.className = 'score-value score-red';
    }
    
    // Update total score
    currentScore += score;
    document.getElementById('totalScore').textContent = currentScore;
    
    // Show transcription
    if (result.transcription) {
        document.getElementById('ipaText').textContent = `You said: "${result.transcription}"`;
    }
    
    // Status
    if (score >= 70) {
        updateStatus('🎉 Excellent! Click the arrow for the next sentence.');
    } else if (score >= 40) {
        updateStatus('👍 Good job! Try again or click the arrow for the next sentence.');
    } else {
        updateStatus('💪 Keep practicing! Click play to hear it again.');
    }
    
    console.log(`✅ Score: ${score}%`);
}

//============================================
// UI HELPERS
//============================================
function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function disableButtons() {
    document.getElementById('playBtn').classList.add('disabled');
    document.getElementById('micBtn').classList.add('disabled');
    document.getElementById('nextBtn').classList.add('disabled');
}

function enableButtons() {
    document.getElementById('playBtn').classList.remove('disabled');
    document.getElementById('micBtn').classList.remove('disabled');
    document.getElementById('nextBtn').classList.remove('disabled');
}
