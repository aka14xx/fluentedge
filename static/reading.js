const startBtn = document.getElementById('start-reading');
const passageText = document.getElementById('passage').textContent;
const resultDiv = document.getElementById('result');

startBtn.onclick = () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript;
    resultDiv.innerHTML = `You said: ${spoken}`;
    // Highlight words that don't match
    const passageWords = passageText.split(' ');
    const spokenWords = spoken.split(' ');
    let feedback = "";
    passageWords.forEach((word, i) => {
      if (spokenWords[i] && word.toLowerCase() === spokenWords[i].toLowerCase()) {
        feedback += `<span style="color:green">${word}</span> `;
      } else {
        feedback += `<span style="color:red">${word}</span> `;
      }
    });
    resultDiv.innerHTML += `<div>${feedback}</div>`;
  };
  recognition.start();
};