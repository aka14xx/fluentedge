// Practice Speaking JavaScript
const API_URL = 'http://localhost:5000';

let currentGrade = 5;
let currentUnit = 'all';
let phrases = [];
let currentPhraseIndex = 0;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let lessonData = null;

// Elements
const gradeSelector = document.getElementById('grade-selector');
const unitSelector = document.getElementById('unit-selector');
const loadSentencesBtn = document.getElementById('load-sentences-btn');
const listenBtn = document.getElementById('listen-btn');
const recordBtn = document.getElementById('record-btn');
const nextBtn = document.getElementById('next-btn');
const currentPhraseEl = document.getElementById('current-phrase');
const accuracyScore = document.getElementById('accuracy-score');
const statusMessage = document.getElementById('status-message');

// Optional elements (might not exist in new design)
const resultCard = document.getElementById('result-card');
const feedbackText = document.getElementById('feedback-text');
const starsDisplay = document.getElementById('stars-display');
const spokenText = document.getElementById('spoken-text');
const expectedText = document.getElementById('expected-text');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadUnitsForGrade(5);
});

// Setup event listeners
function setupEventListeners() {
  // Grade selection
  gradeSelector.addEventListener('change', (e) => {
    currentGrade = parseInt(e.target.value);
    loadUnitsForGrade(currentGrade);
    phrases = [];
    currentPhraseIndex = 0;
    disableControls();
  });

  // Unit selection
  unitSelector.addEventListener('change', (e) => {
    currentUnit = e.target.value;
  });

  // Load sentences button
  loadSentencesBtn.addEventListener('click', loadSentencesFromLessons);

  // Listen button
  listenBtn.addEventListener('click', playCurrentPhrase);

  // Record button
  recordBtn.addEventListener('click', toggleRecording);

  // Next phrase button
  nextBtn.addEventListener('click', loadNextPhrase);
}

// Load units for selected grade
async function loadUnitsForGrade(grade) {
  try {
    const response = await fetch(`lessons/grade${grade}.json`);
    lessonData = await response.json();
    
    // Populate unit selector
    unitSelector.innerHTML = '<option value="all">All Units</option>';
    lessonData.units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.unit;
      option.textContent = `Unit ${unit.unit}: ${unit.title}`;
      unitSelector.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading grade data:', error);
    showStatus('❌ Could not load grade data', 'error');
  }
}

// Load sentences from lessons
async function loadSentencesFromLessons() {
  try {
    if (!lessonData) {
      showStatus('⚠️ Please select a grade first', 'error');
      return;
    }

    showStatus('📚 Loading sentences from lessons...', 'info');
    phrases = [];

    // Filter units based on selection
    const unitsToProcess = currentUnit === 'all' 
      ? lessonData.units 
      : lessonData.units.filter(u => u.unit == currentUnit);

    // Extract sentences from lessons
    unitsToProcess.forEach(unit => {
      unit.lessons.forEach(lesson => {
        // Extract from reading passages - MORE LENIENT BUT FILTER OUT GARBAGE
        if (lesson.sections.read && lesson.sections.read.passage) {
          const passage = lesson.sections.read.passage;
          // Split by periods and filter - MUCH MORE LENIENT (3-20 words, 10-120 chars)
          const sentences = passage
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => {
              const wordCount = s.split(/\s+/).length;
              // Filter out table headers and garbage
              if (s.includes('|')) return false; // Tables
              if (s.match(/^[A-Z][a-z]+\s*\|\s*/)) return false; // Table rows
              if (s.match(/^\w+\s*\|\s*\w+\s*\|/)) return false; // Multi-column tables
              if (s.split('|').length > 2) return false; // Anything with multiple pipes
              if (s.match(/^(Animal|Body|Part|Function|Name|Type|Category)/i)) return false; // Common headers
              
              // Check if all words start with uppercase (table header pattern)
              const words = s.split(/\s+/).filter(w => w.length > 0);
              if (words.length > 0 && words.every(w => w[0] && w[0] === w[0].toUpperCase())) return false;
              
              // Must have common words
              if (!s.match(/\b(the|a|an|is|are|was|were|have|has|can|will|would|should|to|in|on|at|for|with|my|your|I|you|we|they)\b/i)) return false;
              
              return s.length >= 15 && s.length <= 120 && wordCount >= 4 && wordCount <= 20;
            })
            .map(s => s + '.');
          
          phrases.push(...sentences);
        }

        // NEW: Extract from reading comprehension questions
        if (lesson.sections.read && lesson.sections.read.questions) {
          lesson.sections.read.questions.forEach(q => {
            if (q.question) {
              const text = q.question.replace(/^\d+\.\s*/, '').trim();
              const wordCount = text.split(/\s+/).length;
              // Must have question words
              if (text.match(/^(What|Where|When|Who|Why|How|Is|Are|Do|Does|Can|Will|Should)/i)) {
                if (text.length >= 15 && text.length <= 120 && wordCount >= 4 && wordCount <= 20) {
                  phrases.push(text.endsWith('?') ? text : text + '?');
                }
              }
            }
          });
        }

        // Extract dialogue from practice sections - MORE LENIENT
        if (lesson.sections.practice) {
          lesson.sections.practice.forEach(item => {
            if (item.type === 'dialogue' && item.lines) {
              item.lines.forEach(line => {
                if (line.text) {
                  const wordCount = line.text.split(/\s+/).length;
                  // Filter out garbage
                  if (line.text.includes('|')) return;
                  if (line.text.match(/^[A-Z][a-z]+:\s*$/)) return; // Just names with colons
                  
                  if (line.text.length >= 10 && line.text.length <= 120 && wordCount >= 3 && wordCount <= 20) {
                    phrases.push(line.text);
                  }
                }
              });
            }
            
            // NEW: Extract fill-in-the-blank sentences
            if (item.type === 'fill-in-the-blank' && item.sentence) {
              const text = item.sentence.replace(/_+/g, 'blank').trim();
              const wordCount = text.split(/\s+/).length;
              if (!text.includes('|') && text.length >= 15 && text.length <= 120 && wordCount >= 4 && wordCount <= 20) {
                phrases.push(text);
              }
            }
          });
        }

        // Extract example sentences from teach sections - MORE LENIENT
        if (lesson.sections.teach && lesson.sections.teach.points) {
          lesson.sections.teach.points.forEach(point => {
            // Look for example sentences (often after "Examples:" or contain quotes)
            if (typeof point === 'string') {
              const matches = point.match(/"([^"]+)"/g);
              if (matches) {
                matches.forEach(match => {
                  const sentence = match.replace(/"/g, '').trim();
                  const wordCount = sentence.split(/\s+/).length;
                  // Filter garbage
                  if (sentence.includes('|')) return;
                  if (!sentence.match(/\b(the|a|an|is|are|was|were|have|has|can|will|to|in|on)\b/i)) return;
                  
                  if (sentence.length >= 15 && sentence.length <= 120 && wordCount >= 4 && wordCount <= 20) {
                    phrases.push(sentence);
                  }
                });
              }
              
              // Also extract sentences with patterns like "Example: ..."
              const exampleMatch = point.match(/Example[s]?:\s*(.+?)(?:\.|$)/i);
              if (exampleMatch && exampleMatch[1]) {
                const sentence = exampleMatch[1].trim();
                const wordCount = sentence.split(/\s+/).length;
                if (!sentence.includes('|') && sentence.length >= 15 && sentence.length <= 120 && wordCount >= 4 && wordCount <= 20) {
                  phrases.push(sentence.endsWith('.') ? sentence : sentence + '.');
                }
              }
              
              // SKIP bullet points - they're usually garbage
            }
          });
        }

        // NEW: Extract vocabulary examples ONLY if they're actual sentences
        if (lesson.sections.teach && lesson.sections.teach.vocabulary) {
          lesson.sections.teach.vocabulary.forEach(vocab => {
            if (vocab.example) {
              const text = vocab.example.trim();
              const wordCount = text.split(/\s+/).length;
              // Filter garbage - must have common words and no pipes
              if (!text.includes('|') && text.match(/\b(the|a|an|is|are|was|were|have|has|can|will|to|in|on)\b/i)) {
                if (text.length >= 15 && text.length <= 120 && wordCount >= 4 && wordCount <= 20) {
                  phrases.push(text.endsWith('.') ? text : text + '.');
                }
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
      showStatus('⚠️ No suitable sentences found. Try another unit!', 'error');
      return;
    }

    currentPhraseIndex = 0;
    displayCurrentPhrase();
    enableControls();
    hideStatus();
    
    showStatus(`✅ Loaded ${phrases.length} sentences!`, 'success');
    setTimeout(() => hideStatus(), 2000);

  } catch (error) {
    console.error('Error loading sentences:', error);
    showStatus('❌ Error loading sentences', 'error');
  }
}

// Enable control buttons
function enableControls() {
  listenBtn.disabled = false;
  recordBtn.disabled = false;
  nextBtn.disabled = false;
  
  // Enable new buttons too
  const micBtn = document.getElementById('micBtn');
  const nextArrowBtn = document.getElementById('nextBtn');
  if (micBtn) micBtn.disabled = false;
  if (nextArrowBtn) nextArrowBtn.disabled = false;
}

// Disable control buttons
function disableControls() {
  listenBtn.disabled = true;
  recordBtn.disabled = true;
  nextBtn.disabled = true;
  
  // Disable new buttons too
  const micBtn = document.getElementById('micBtn');
  const nextArrowBtn = document.getElementById('nextBtn');
  if (micBtn) micBtn.disabled = true;
  if (nextArrowBtn) nextArrowBtn.disabled = true;
}

// Display current phrase
function displayCurrentPhrase() {
  if (phrases.length > 0) {
    currentPhraseEl.textContent = phrases[currentPhraseIndex];
    
    // Clear previous results
    if (accuracyScore) accuracyScore.textContent = '-';
    if (accuracyScore) accuracyScore.className = 'score-value';
    
    const transcriptionEl = document.getElementById('transcription');
    if (transcriptionEl) transcriptionEl.textContent = '';
    
    // Hide result card if it exists
    if (resultCard) resultCard.classList.remove('show');
  }
}

// Play current phrase using Text-to-Speech
async function playCurrentPhrase() {
  const phrase = phrases[currentPhraseIndex];
  
  try {
    showStatus('🔊 Generating audio...', 'info');
    listenBtn.disabled = true;
    
    const response = await fetch(`${API_URL}/api/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: phrase })
    });

    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      listenBtn.disabled = false;
      hideStatus();
    };
    
    audio.onerror = () => {
      throw new Error('Audio playback failed');
    };
    
    await audio.play();
    showStatus('🔊 Playing...', 'success');
    
  } catch (error) {
    console.error('Error playing audio:', error);
    listenBtn.disabled = false;
    showStatus('⚠️ Using browser speech instead', 'info');
    
    // Fallback to browser's speech synthesis
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    
    utterance.onend = () => {
      hideStatus();
    };
  }
}

// Toggle recording
async function toggleRecording() {
  if (!isRecording) {
    await startRecording();
  }
  // Speech recognition will auto-stop after user finishes speaking
}

// Start recording
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Start Web Speech Recognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = async (event) => {
      const spokenPhrase = event.results[0][0].transcript;
      const expectedPhrase = phrases[currentPhraseIndex];
      
      // Evaluate pronunciation
      await evaluatePronunciation(spokenPhrase, expectedPhrase);
      
      // Stop recording
      isRecording = false;
      if (recordBtn) {
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '🎙️ Record & Check';
      }
      const micBtn = document.getElementById('micBtn');
      if (micBtn) {
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎙️';
      }
      
      // Stop tracks
      stream.getTracks().forEach(track => track.stop());
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      showStatus('❌ Could not recognize speech. Please try again.', 'error');
      isRecording = false;
      if (recordBtn) {
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '🎙️ Record & Check';
      }
      const micBtn = document.getElementById('micBtn');
      if (micBtn) {
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎙️';
      }
      stream.getTracks().forEach(track => track.stop());
    };
    
    recognition.onend = () => {
      isRecording = false;
    };
    
    // Start recognition
    recognition.start();
    isRecording = true;
    
    // Update both buttons
    if (recordBtn) {
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '⏹️ Stop Recording';
    }
    
    // Update mic button too
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.classList.add('recording');
      micBtn.textContent = '⏹️';
    }
    
    showStatus('🎙️ Listening... Speak now!', 'info');
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    showStatus('❌ Could not access microphone. Please grant permission.', 'error');
  }
}

// Stop recording
function stopRecording() {
  // Recognition will stop automatically when user stops speaking
  // Just update UI
  if (isRecording) {
    showStatus('⏳ Processing your speech...', 'info');
  }
}

// Process recording and get results
async function processRecording(audioBlob) {
  const phrase = phrases[currentPhraseIndex];
  
  try {
    showStatus('🤔 Analyzing pronunciation...', 'info');
    
    // Send audio to server for evaluation
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('text', phrase);
    
    const response = await fetch(`${API_URL}/api/evaluate-pronunciation`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Evaluation failed');
    }
    
    const result = await response.json();
    
    if (result.success !== false) {
      displayResults(result);
    } else {
      throw new Error(result.error || 'Evaluation failed');
    }
    
  } catch (error) {
    console.error('Error processing recording:', error);
    showStatus('❌ Error processing speech. Using fallback evaluation.', 'error');
    
    // Fallback to basic evaluation
    const result = {
      accuracy: 50,
      feedback: "Recording received but couldn't evaluate. Try speaking clearly!",
      stars: 2,
      spoken_text: "Recording processed",
      expected_text: phrase
    };
    displayResults(result);
  }
}

// Try AI-powered pronunciation evaluation
async function tryAIPronunciationEvaluation(audioBlob, expectedText) {
  try {
    // Convert audio blob to base64
    const reader = new FileReader();
    
    const audioBase64 = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
    
    // Send to AI evaluation endpoint
    const response = await fetch(`${API_URL}/api/evaluate-pronunciation-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_base64: audioBase64,
        expected_text: expectedText
      })
    });

    if (!response.ok) {
      throw new Error('AI evaluation failed');
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ AI evaluation successful!', result);
      return result;
    } else {
      throw new Error('AI evaluation returned no results');
    }
    
  } catch (error) {
    console.log('⚠️ AI evaluation not available, falling back to basic method:', error);
    return null;
  }
}

// Evaluate pronunciation
async function evaluatePronunciation(spoken, expected) {
  console.log(`🎤 You said: "${spoken}"`);
  console.log(`📝 Expected: "${expected}"`);
  
  // Use smarter offline evaluation with phonetic analysis
  const result = evaluateOffline(spoken, expected);
  displayResults(result);
  
  // Award stars
  const globalStars = parseInt(localStorage.getItem('globalStars') || '0', 10);
  localStorage.setItem('globalStars', globalStars + result.stars);
}

// Offline evaluation fallback - SMART PHONETIC ANALYSIS
function evaluateOffline(spoken, expected) {
  const spokenClean = spoken.toLowerCase().trim().replace(/[.,!?]/g, '');
  const expectedClean = expected.toLowerCase().trim().replace(/[.,!?]/g, '');
  
  const spokenWords = spokenClean.split(/\s+/);
  const expectedWords = expectedClean.split(/\s+/);
  
  console.log('📊 Analyzing pronunciation...');
  console.log(`Words expected: ${expectedWords.length}`);
  console.log(`Words spoken: ${spokenWords.length}`);
  
  // Calculate similarity using multiple advanced methods
  let scores = [];
  
  // Method 1: Phonetic word matching (VERY FORGIVING)
  let matchedWords = 0;
  let partialMatches = 0;
  
  for (const expectedWord of expectedWords) {
    let bestMatch = 0;
    for (const spokenWord of spokenWords) {
      const similarity = getWordSimilarity(spokenWord, expectedWord);
      bestMatch = Math.max(bestMatch, similarity);
    }
    
    if (bestMatch >= 85) {
      matchedWords++;
    } else if (bestMatch >= 60) {
      partialMatches++;
    }
  }
  
  const wordScore = ((matchedWords + partialMatches * 0.5) / expectedWords.length) * 100;
  scores.push({ name: 'Word Accuracy', score: wordScore, weight: 0.5 });
  
  // Method 2: Sequence similarity (order matters a bit)
  const sequenceScore = getSequenceSimilarity(spokenWords, expectedWords);
  scores.push({ name: 'Sequence', score: sequenceScore, weight: 0.3 });
  
  // Method 3: Overall phonetic similarity
  const overallScore = calculateSimilarity(spokenClean, expectedClean);
  scores.push({ name: 'Overall', score: overallScore, weight: 0.2 });
  
  // Calculate weighted average
  let finalScore = 0;
  scores.forEach(s => {
    finalScore += s.score * s.weight;
    console.log(`${s.name}: ${Math.round(s.score)}%`);
  });
  
  // Bonuses
  if (matchedWords >= expectedWords.length * 0.9) {
    finalScore += 15; // Big bonus for getting most words!
    console.log('🎉 Bonus: Got most words right! +15%');
  } else if (matchedWords >= expectedWords.length * 0.7) {
    finalScore += 8;
    console.log('👍 Bonus: Got many words right! +8%');
  }
  
  // Penalty for way too many/few words
  const wordRatio = spokenWords.length / expectedWords.length;
  if (wordRatio < 0.5 || wordRatio > 2) {
    finalScore *= 0.8;
    console.log('⚠️ Word count very different');
  }
  
  const accuracy = Math.min(100, Math.max(0, Math.round(finalScore)));
  console.log(`✨ Final Score: ${accuracy}%`);
  
  let feedback, stars;
  if (accuracy >= 90) {
    feedback = "Perfect! You nailed it! 🌟";
    stars = 2;
  } else if (accuracy >= 80) {
    feedback = "Great job! Almost perfect! ⭐";
    stars = 2;
  } else if (accuracy >= 65) {
    feedback = "Good! Keep practicing! 👍";
    stars = 1;
  } else if (accuracy >= 50) {
    feedback = "Not bad! Try again! 💪";
    stars = 1;
  } else {
    feedback = "Keep practicing! You can do it! 🎯";
    stars = 1;
  }
  
  return {
    accuracy: accuracy,
    feedback,
    stars,
    spoken_text: spoken,
    expected_text: expected
  };
}

// Get similarity between two words with phonetic awareness
function getWordSimilarity(word1, word2) {
  if (word1 === word2) return 100;
  
  // Phonetic equivalents
  const phonetic1 = getPhoneticKey(word1);
  const phonetic2 = getPhoneticKey(word2);
  
  if (phonetic1 === phonetic2) return 95; // Almost perfect if sounds same
  
  // String similarity
  const stringSim = calculateSimilarity(word1, word2);
  const phoneticSim = calculateSimilarity(phonetic1, phonetic2);
  
  return Math.max(stringSim, phoneticSim);
}

// Simple phonetic key (Soundex-like)
function getPhoneticKey(word) {
  let key = word.toLowerCase();
  
  // Common phonetic replacements
  const replacements = [
    [/ph/g, 'f'],
    [/gh/g, 'f'],
    [/ght/g, 't'],
    [/[ck]/g, 'k'],
    [/qu/g, 'kw'],
    [/[sz]/g, 's'],
    [/[dt]/g, 't'],
    [/ee/g, 'i'],
    [/oo/g, 'u'],
    [/[aeiou]+/g, 'a'], // Simplify vowels
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    key = key.replace(pattern, replacement);
  });
  
  return key;
}

// Get sequence similarity (how well ordered)
function getSequenceSimilarity(arr1, arr2) {
  const longer = arr1.length > arr2.length ? arr1 : arr2;
  const shorter = arr1.length > arr2.length ? arr2 : arr1;
  
  let matches = 0;
  const maxOffset = 2; // Allow words to be slightly out of order
  
  for (let i = 0; i < shorter.length; i++) {
    for (let offset = -maxOffset; offset <= maxOffset; offset++) {
      const j = i + offset;
      if (j >= 0 && j < longer.length) {
        if (isSimilar(shorter[i], longer[j])) {
          matches++;
          break;
        }
      }
    }
  }
  
  return (matches / longer.length) * 100;
}

// Check if two words are similar (fuzzy match)
function isSimilar(word1, word2) {
  // Exact match
  if (word1 === word2) return true;
  
  // One letter difference
  if (Math.abs(word1.length - word2.length) <= 1) {
    const similarity = calculateSimilarity(word1, word2);
    if (similarity >= 80) return true;
  }
  
  // Common variations
  const variations = [
    [word1.replace(/s$/, ''), word2.replace(/s$/, '')], // plural
    [word1.replace(/ed$/, ''), word2.replace(/ed$/, '')], // past tense
    [word1.replace(/ing$/, ''), word2.replace(/ing$/, '')], // present continuous
  ];
  
  for (const [v1, v2] of variations) {
    if (v1 === v2 && v1.length > 2) return true;
  }
  
  return false;
}

// Calculate string similarity percentage
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = getEditDistance(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

// Levenshtein distance
function getEditDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Highlight mistakes - show correct words in GREEN, wrong words in RED with underline
function highlightMistakes(spokenText, expectedText) {
  const spokenWords = spokenText.toLowerCase().split(/\s+/);
  const expectedWords = expectedText.toLowerCase().split(/\s+/);
  
  let html = '<div style="margin: 10px 0; font-size: 16px; line-height: 1.8;">';
  html += '<strong>Expected:</strong> ';
  
  expectedWords.forEach((expectedWord, i) => {
    const spokenWord = spokenWords[i];
    
    if (!spokenWord) {
      // Word was missing
      html += `<span style="color: #f44336; text-decoration: underline; font-weight: 500;">${expectedWord}</span> `;
    } else if (isSimilar(spokenWord, expectedWord)) {
      // Word is correct or very similar
      html += `<span style="color: #4CAF50; font-weight: 500;">${expectedWord}</span> `;
    } else {
      // Word is wrong
      html += `<span style="color: #f44336; text-decoration: underline; font-weight: 500;">${expectedWord}</span> `;
    }
  });
  
  html += '</div>';
  return html;
}

// Check if two words are similar enough (phonetic matching)
function isSimilar(word1, word2) {
  if (word1 === word2) return true;
  
  // Remove punctuation
  word1 = word1.replace(/[.,!?;:'"]/g, '');
  word2 = word2.replace(/[.,!?;:'"]/g, '');
  
  if (word1 === word2) return true;
  
  // Check phonetic similarity
  const phonetic1 = getPhoneticKey(word1);
  const phonetic2 = getPhoneticKey(word2);
  
  if (phonetic1 === phonetic2) return true;
  
  // Check edit distance (allow 1-2 character difference for longer words)
  const maxDistance = word1.length <= 4 ? 1 : 2;
  const distance = getEditDistance(word1, word2);
  
  return distance <= maxDistance;
}

// Display results
function displayResults(result) {
  if (accuracyScore) {
    accuracyScore.textContent = `${result.accuracy}%`;
    
    // Update score color based on accuracy
    const score = parseFloat(result.accuracy);
    if (score >= 70) {
      accuracyScore.className = 'score-value good';
    } else if (score >= 40) {
      accuracyScore.className = 'score-value medium';
    } else {
      accuracyScore.className = 'score-value bad';
    }
  }
  
  // Show word-by-word comparison with RED highlighting for mistakes
  const transcriptionEl = document.getElementById('transcription');
  if (transcriptionEl && result.spoken_text && result.expected_text) {
    const highlightedText = highlightMistakes(result.spoken_text, result.expected_text);
    transcriptionEl.innerHTML = highlightedText;
  }
  
  if (feedbackText) feedbackText.textContent = result.feedback;
  if (starsDisplay) starsDisplay.textContent = '⭐'.repeat(result.stars);
  
  if (spokenText) spokenText.textContent = result.spoken_text;
  if (expectedText) expectedText.textContent = result.expected_text;
  
  // Show AI badge if AI-powered
  if (result.ai_powered && feedbackText) {
    feedbackText.innerHTML = result.feedback + ' <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.7em; margin-left: 0.5rem;">🤖 AI Analyzed</span>';
  }
  
  // Show result card if it exists
  if (resultCard) resultCard.classList.add('show');
  hideStatus();
  
  // Award stars
  const globalStars = parseInt(localStorage.getItem('globalStars') || '0', 10);
  localStorage.setItem('globalStars', globalStars + result.stars);
  
  // Update total score display
  const totalScoreEl = document.getElementById('total-score');
  if (totalScoreEl) {
    const currentTotal = parseInt(totalScoreEl.textContent || '0', 10);
    const scoreToAdd = Math.round(parseFloat(result.accuracy));
    totalScoreEl.textContent = currentTotal + scoreToAdd;
  }
  
  const statusMsg = result.ai_powered 
    ? `✨ You earned ${result.stars} stars! (AI-powered analysis)`
    : `✨ You earned ${result.stars} stars!`;
  
  showStatus(statusMsg, 'success');
  setTimeout(() => hideStatus(), 3000);
}

// Load next phrase
function loadNextPhrase() {
  currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
  displayCurrentPhrase();
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
}

// Hide status message
function hideStatus() {
  statusMessage.classList.remove('show');
}

// Wrapper functions for new buttons
function loadNextSentence() {
  loadNextPhrase();
}

function toggleRecording() {
  // Direct call to start recording
  if (!isRecording) {
    startRecording();
  }
}
