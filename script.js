function loadLessons(jsonPath) {
  fetch(jsonPath)
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('lessons-container');
      let totalStars = 0;

      data.lessons.forEach((lesson, index) => {
        const card = document.createElement('div');
        card.className = 'lesson-card';

        const img = document.createElement('img');
        img.src = `images/${lesson.image}`;
        img.alt = lesson.title;

        const content = document.createElement('div');
        content.className = 'lesson-content';

        const title = document.createElement('h2');
        title.textContent = lesson.title;

        const text = document.createElement('p');
        text.textContent = lesson.content;

        const starBtn = document.createElement('button');
        starBtn.textContent = 'Complete Lesson ⭐';
        starBtn.onclick = () => {
          totalStars++;
          document.getElementById('total-stars').textContent = totalStars;
          starBtn.disabled = true;
          starBtn.textContent = 'Lesson Completed ✅';
        };

        content.appendChild(title);
        content.appendChild(text);
        content.appendChild(starBtn);

        card.appendChild(img);
        card.appendChild(content);
        container.appendChild(card);
      });
    })
    .catch(err => console.error(err));
}

function goHome() {
  window.location.href = 'index.html';
}
