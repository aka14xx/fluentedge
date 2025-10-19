// Minimal recorder and uploader. Uses MediaRecorder API (modern browsers).

let recordBtn = document.getElementById('recordBtn');
let stopBtn = document.getElementById('stopBtn');
let uploadBtn = document.getElementById('uploadBtn');
let statusDiv = document.getElementById('status');
let resultDiv = document.getElementById('result');
let targetInput = document.getElementById('target');

let mediaRecorder, audioChunks;

async function startRecording() {
  statusDiv.textContent = 'Requesting microphone...';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstart = () => {
      statusDiv.textContent = 'Recording...';
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      uploadBtn.disabled = true;
    };
    mediaRecorder.onstop = () => {
      statusDiv.textContent = 'Recording stopped.';
      uploadBtn.disabled = false;
    };
    mediaRecorder.start();
  } catch (err) {
    statusDiv.textContent = 'Microphone access denied or unavailable: ' + err.message;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function uploadRecording() {
  if (!audioChunks || !audioChunks.length) return;
  statusDiv.textContent = 'Uploading...';
  resultDiv.textContent = '';

  const blob = new Blob(audioChunks, { type: 'audio/webm' });

  // Convert webm to wav on client side isn't trivial; send webm and let server try
  // Recognizers may not accept webm — the server will fail gracefully if unsupported.

  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  form.append('target_text', targetInput.value || '');

  try {
    const resp = await fetch('/api/evaluate-pronunciation', { method: 'POST', body: form });
    const json = await resp.json();
    if (!json) throw new Error('No JSON response');

    if (!json.success) {
      statusDiv.textContent = 'Pronunciation service unavailable or failed: ' + (json.message || json.error || JSON.stringify(json));
      return;
    }

    statusDiv.textContent = 'Done';
    resultDiv.textContent = `Transcript: ${json.transcript} — Score: ${json.score}`;
  } catch (err) {
    statusDiv.textContent = 'Upload failed: ' + err.message;
  }
}

recordBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
uploadBtn.addEventListener('click', uploadRecording);

// reset UI when page loads
recordBtn.disabled = false;
stopBtn.disabled = true;
uploadBtn.disabled = true;
statusDiv.textContent = '';
resultDiv.textContent = '';