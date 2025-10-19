// Audio context initialization
let mediaRecorder, audioChunks, audioBlob, stream, audioRecorded;
const ctx = new AudioContext();
let currentAudioForPlaying;

// UI-related variables
let currentGrade = '5';
let currentUnit = 'all';
let currentSample = 0;
let currentScore = 0;
let isRecording = false;
let currentSoundRecorded = false;
let currentText = '';
let startTime, endTime;
let allSentences = [];
let currentSentenceIndex = 0;

// API URL
const API_URL = 'http://localhost:5000';

//############################ UI general control functions ###################
const unblockUI = () => {
    document.getElementById("recordAudio").classList.remove('disabled');
    document.getElementById("playSampleAudio").classList.remove('disabled');
    document.getElementById("buttonNext").onclick = () => getNextSample();
    document.getElementById("nextButtonDiv").classList.remove('disabled');
    document.getElementById("original_script").classList.remove('disabled');

    if (currentSoundRecorded)
        document.getElementById("playRecordedAudio").classList.remove('disabled');
};

const blockUI = () => {
    document.getElementById("recordAudio").classList.add('disabled');
    document.getElementById("playSampleAudio").classList.add('disabled');
    document.getElementById("buttonNext").onclick = null;
    document.getElementById("original_script").classList.add('disabled');
    document.getElementById("playRecordedAudio").classList.add('disabled');
};

//################### Grade/Unit Selection Functions #######################
async function changeGrade(grade) {
    currentGrade = grade;
    document.getElementById("gradeBox").innerHTML = `Grade ${grade}`;
    await loadSentencesFromLessons();
    console.log(`Changed to Grade ${grade}, loaded ${allSentences.length} sentences`);
}

async function changeUnit(unit) {
    currentUnit = unit;
    if (unit === 'all') {
        document.getElementById("unitBox").innerHTML = 'All Units';
    } else {
        document.getElementById("unitBox").innerHTML = `Unit ${unit}`;
    }
    await loadSentencesFromLessons();
    console.log(`Changed to Unit ${unit}, loaded ${allSentences.length} sentences`);
}

//################### Load Sentences from JSON Files #######################
async function loadSentencesFromLessons() {
    try {
        const response = await fetch(`/lessons/grade${currentGrade}.json`);
        const data = await response.json();
        
        allSentences = [];
        
        if (currentUnit === 'all') {
            // Load from all units
            data.units.forEach(unit => {
                // Extract from reading passages
                unit.lessons.forEach(lesson => {
                    if (lesson.reading && lesson.reading.passage) {
                        const sentences = lesson.reading.passage
                            .split(/[.!?]+/)
                            .map(s => s.trim())
                            .filter(s => s.length > 10 && s.length < 150);
                        allSentences.push(...sentences);
                    }
                    
                    // Extract from examples
                    if (lesson.examples) {
                        lesson.examples.forEach(ex => {
                            if (ex.sentence && ex.sentence.length > 10) {
                                allSentences.push(ex.sentence);
                            }
                        });
                    }
                });
            });
        } else {
            // Load from specific unit
            const unitIndex = parseInt(currentUnit) - 1;
            if (data.units[unitIndex]) {
                const unit = data.units[unitIndex];
                unit.lessons.forEach(lesson => {
                    if (lesson.reading && lesson.reading.passage) {
                        const sentences = lesson.reading.passage
                            .split(/[.!?]+/)
                            .map(s => s.trim())
                            .filter(s => s.length > 10 && s.length < 150);
                        allSentences.push(...sentences);
                    }
                    
                    if (lesson.examples) {
                        lesson.examples.forEach(ex => {
                            if (ex.sentence && ex.sentence.length > 10) {
                                allSentences.push(ex.sentence);
                            }
                        });
                    }
                });
            }
        }
        
        currentSentenceIndex = 0;
        console.log(`Loaded ${allSentences.length} sentences from Grade ${currentGrade}, Unit ${currentUnit}`);
        
    } catch (error) {
        console.error('Error loading sentences:', error);
        allSentences = ["Click the green arrow to load a sentence.", "Make sure the server is running."];
    }
}

//################### Get Next Sample #######################
const getNextSample = async () => {
    blockUI();
    
    if (allSentences.length === 0) {
        await loadSentencesFromLessons();
    }
    
    if (allSentences.length > 0) {
        currentText = allSentences[currentSentenceIndex];
        currentSentenceIndex = (currentSentenceIndex + 1) % allSentences.length;
        
        document.getElementById("original_script").innerHTML = currentText;
        document.getElementById("ipa_script").innerHTML = "Click the play button to hear this sentence.";
        document.getElementById("pronunciation_accuracy").innerHTML = "-";
        document.getElementById("section_accuracy").innerHTML = `| Score: ${currentScore} - (${currentSample})`;
        
        document.getElementById("main_title").innerHTML = "Practice Speaking";
        currentSample += 1;
        currentSoundRecorded = false;
    }
    
    unblockUI();
};

//################### Audio Playback Functions #######################
const playAudio = async () => {
    if (!currentText || currentText.length === 0) {
        alert("Please load a sentence first by clicking the green arrow button!");
        return;
    }
    
    blockUI();
    document.getElementById("textInfo").innerHTML = "Loading audio...";
    
    try {
        const response = await fetch(`${API_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: currentText })
        });
        
        if (!response.ok) {
            throw new Error('TTS request failed');
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            document.getElementById("textInfo").innerHTML = "";
            unblockUI();
        };
        
        audio.onerror = () => {
            document.getElementById("textInfo").innerHTML = "Audio playback error";
            unblockUI();
        };
        
        await audio.play();
        document.getElementById("textInfo").innerHTML = "Playing...";
        
    } catch (error) {
        console.error('Error playing audio:', error);
        document.getElementById("textInfo").innerHTML = "Error: Could not play audio";
        unblockUI();
    }
};

const playRecording = () => {
    if (!audioRecorded) {
        alert("No recording available. Please record first!");
        return;
    }
    
    const audio = new Audio(URL.createObjectURL(audioRecorded));
    audio.play();
};

//################### Recording Functions #######################
async function startMediaDevice() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Media device started successfully");
    } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Cannot access microphone. Please grant permission.");
    }
}

const recordSample = () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
};

const startRecording = async () => {
    if (!stream) {
        await startMediaDevice();
    }
    
    if (!stream) {
        alert("Microphone not available!");
        return;
    }
    
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = async () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioRecorded = audioBlob;
        currentSoundRecorded = true;
        
        document.getElementById("playRecordedAudio").classList.remove('disabled');
        document.getElementById("textInfo").innerHTML = "Recording complete. Evaluating...";
        
        await evaluateRecording();
    };
    
    mediaRecorder.start();
    isRecording = true;
    startTime = Date.now();
    
    document.getElementById("recordAudio").style.backgroundColor = "#ff4444";
    document.getElementById("textInfo").innerHTML = "Recording... Click mic to stop.";
    
    blockUI();
    document.getElementById("recordAudio").classList.remove('disabled');
};

const stopRecording = () => {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        endTime = Date.now();
        
        document.getElementById("recordAudio").style.backgroundColor = "#49d67d";
        document.getElementById("textInfo").innerHTML = "Processing...";
    }
};

//################### Evaluation Functions #######################
const evaluateRecording = async () => {
    if (!audioRecorded || !currentText) {
        unblockUI();
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('audio', audioRecorded, 'recording.webm');
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
        console.error('Error evaluating pronunciation:', error);
        document.getElementById("textInfo").innerHTML = "Evaluation error";
        document.getElementById("pronunciation_accuracy").innerHTML = "Error";
    }
    
    unblockUI();
};

const displayResults = (result) => {
    const accuracy = result.accuracy || result.pronunciationScore || 0;
    const roundedAccuracy = Math.round(accuracy);
    
    document.getElementById("pronunciation_accuracy").innerHTML = `${roundedAccuracy}%`;
    document.getElementById("textInfo").innerHTML = "";
    
    // Color code the score
    const accuracyElement = document.getElementById("pronunciation_accuracy");
    if (roundedAccuracy >= 70) {
        accuracyElement.style.color = "green";
    } else if (roundedAccuracy >= 40) {
        accuracyElement.style.color = "orange";
    } else {
        accuracyElement.style.color = "red";
    }
    
    // Update total score
    currentScore += roundedAccuracy;
    document.getElementById("section_accuracy").innerHTML = `| Score: ${currentScore} - (${currentSample})`;
    
    // Show feedback
    if (result.transcription) {
        document.getElementById("ipa_script").innerHTML = `You said: "${result.transcription}"`;
    }
};

//################### Initialization #######################
window.addEventListener('load', async () => {
    console.log("Practice Speaking page loaded");
    
    // Start media device
    await startMediaDevice();
    
    // Load initial sentences
    await loadSentencesFromLessons();
    
    // Initialize UI
    unblockUI();
    
    console.log("Initialization complete");
});
