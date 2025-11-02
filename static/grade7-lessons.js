(function() {
  const gradeJsonPath = 'lessons/grade7.json';
  const gradeNumber = 7;

  // Load user data
  const savedAvatar = localStorage.getItem('userAvatar');
  const savedUsername = localStorage.getItem('username');
  const weeklyGoal = localStorage.getItem('weeklyGoal') || 40;
  
  const userAvatarEl = document.getElementById('userAvatar');
  const userNameEl = document.getElementById('userName');
  const weeklyGoalEl = document.getElementById('weeklyGoal');
  
  if (savedAvatar && userAvatarEl) userAvatarEl.src = savedAvatar;
  if (savedUsername && userNameEl) userNameEl.textContent = savedUsername;
  if (weeklyGoalEl) weeklyGoalEl.textContent = weeklyGoal;
  
  // Add click to change avatar (redirects to dashboard)
  if (userAvatarEl) {
    userAvatarEl.style.cursor = 'pointer';
    userAvatarEl.title = 'Click to change avatar on Dashboard';
    userAvatarEl.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }

  // Calculate lesson progress and stars
  function getLessonProgress(lessonId) {
    const progress = JSON.parse(localStorage.getItem(`progress:${lessonId}`) || '{}');
    return progress;
  }

  function getLessonStars(lessonId) {
    const stars = localStorage.getItem(`stars:${lessonId}`);
    return stars ? parseInt(stars, 10) : 0;
  }

  function calculateCompletion(progress) {
    if (!progress || !progress.completed) return 0;
    // If lesson is completed, calculate based on sections completed
    const totalSections = 4; // teach, read, practice, review
    const completed = progress.sectionsCompleted || 0;
    return Math.round((completed / totalSections) * 100);
  }

  fetch(`/lessons/grade7.json`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
      return r.json();
    })
    .then(data => {
      const unitsContainer = document.getElementById('unitsContainer');
      const unitNav = document.getElementById('unitNav');
      
      if (!unitsContainer || !data.units || !data.units.length) {
        if (unitsContainer) unitsContainer.innerHTML = `<p>No units found.</p>`;
        return;
      }

      let totalStarsEarned = 0;

      // Build unit navigation
      data.units.forEach(unit => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#unit${unit.unit}" onclick="scrollToUnit(${unit.unit}); return false;"><span class="unit-icon">📚</span> Unit ${unit.unit}</a>`;
        unitNav.appendChild(li);
      });

      // Build lessons
      data.units.forEach(unit => {
        const unitSection = document.createElement('div');
        unitSection.className = 'unit-section';
        unitSection.id = `unit${unit.unit}`;
        
        let lessonsHTML = '';
        if (unit.lessons && unit.lessons.length) {
          lessonsHTML = unit.lessons.map((lesson, index) => {
            const isLocked = lesson.status === 'locked';
            const link = isLocked ? 'javascript:void(0)' : `../lessons.html?id=${lesson.id}`;
            const imgSrc = lesson.image?.startsWith('images/') ? `../${lesson.image}` : (lesson.image || '../images/default_lesson.png');
            
            // Get progress data
            const progress = getLessonProgress(lesson.id);
            const completion = calculateCompletion(progress);
            const starsEarned = getLessonStars(lesson.id);
            const maxStars = lesson.stars || 3;
            
            totalStarsEarned += starsEarned;

            return `
              <a href="${link}" class="lesson-card ${isLocked ? 'locked' : ''}">
                <div class="lesson-card-image-wrap">
                  <img src="${imgSrc}" alt="${lesson.title}" class="lesson-card-image" onerror="this.src='../images/default_lesson.png';">
                  <div class="lesson-number-badge">${index + 1}</div>
                </div>
                <div class="lesson-card-body">
                  <h3 class="lesson-card-title">${lesson.title}</h3>
                  <div class="lesson-meta">
                    <div class="stars-display">
                      <span class="star-icon">⭐</span>
                      <span class="stars-earned">${starsEarned}</span>
                      <span class="stars-max">/ ${maxStars}</span>
                    </div>
                    <div class="completion-badge ${completion === 100 ? 'complete' : ''}">${completion}%</div>
                  </div>
                </div>
              </a>`;
          }).join('');
        }

        unitSection.innerHTML = `
          <div class="unit-header">
            <div class="unit-number">${unit.unit}</div>
            <div class="unit-title">${unit.title}</div>
          </div>
          <div class="lessons-grid">${lessonsHTML}</div>
        `;
        unitsContainer.appendChild(unitSection);
      });

      // Update total stars display
      document.getElementById('totalStars').textContent = totalStarsEarned;
      
      // Initialize search functionality
      initializeSearch();
    })
    .catch(err => {
      console.error("Error loading grade curriculum:", err);
      const el = document.getElementById('unitsContainer');
      if(el) el.innerHTML = `<p>Error loading lessons.</p>`;
    });

  // Search functionality
  function initializeSearch() {
    const searchInput = document.getElementById('lessonSearch');
    const searchClear = document.getElementById('searchClear');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const unitsContainer = document.getElementById('unitsContainer');

    if (!searchInput) return;

    // Handle search input
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      
      // Show/hide clear button
      searchClear.style.display = query ? 'flex' : 'none';
      
      if (!query) {
        clearSearch();
        return;
      }
      
      performSearch(query);
    });

    // Handle clear button
    searchClear.addEventListener('click', function() {
      searchInput.value = '';
      searchClear.style.display = 'none';
      clearSearch();
      searchInput.focus();
    });

    function performSearch(query) {
      const unitSections = unitsContainer.querySelectorAll('.unit-section');
      let totalMatches = 0;
      let visibleUnits = 0;

      unitSections.forEach(unitSection => {
        const unitTitle = unitSection.querySelector('.unit-title').textContent.toLowerCase();
        const lessonCards = unitSection.querySelectorAll('.lesson-card');
        let unitHasMatch = false;

        lessonCards.forEach(card => {
          const lessonTitle = card.querySelector('.lesson-card-title').textContent.toLowerCase();
          const matches = lessonTitle.includes(query) || unitTitle.includes(query);

          if (matches) {
            card.classList.remove('hidden-by-search');
            card.style.animation = 'fadeInScale 0.3s ease';
            totalMatches++;
            unitHasMatch = true;
          } else {
            card.classList.add('hidden-by-search');
          }
        });

        // Show/hide unit based on matches
        if (unitHasMatch) {
          unitSection.classList.remove('hidden-by-search');
          visibleUnits++;
        } else {
          unitSection.classList.add('hidden-by-search');
        }
      });

      // Update results count
      updateResultsCount(totalMatches, query);
      
      // Show no results message if needed
      showNoResultsMessage(totalMatches, query);
    }

    function clearSearch() {
      const allCards = unitsContainer.querySelectorAll('.lesson-card');
      const allUnits = unitsContainer.querySelectorAll('.unit-section');
      
      allCards.forEach(card => {
        card.classList.remove('hidden-by-search');
        card.style.animation = '';
      });
      
      allUnits.forEach(unit => {
        unit.classList.remove('hidden-by-search');
      });

      searchResultsCount.textContent = '';
      
      // Remove no results message if exists
      const noResultsMsg = document.querySelector('.no-results-message');
      if (noResultsMsg) noResultsMsg.remove();
    }

    function updateResultsCount(count, query) {
      if (count === 0) {
        searchResultsCount.innerHTML = `<span style="color: #ef4444;">No lessons found</span>`;
      } else if (count === 1) {
        searchResultsCount.innerHTML = `Found <strong>1</strong> lesson matching "<strong>${escapeHtml(query)}</strong>"`;
      } else {
        searchResultsCount.innerHTML = `Found <strong>${count}</strong> lessons matching "<strong>${escapeHtml(query)}</strong>"`;
      }
    }

    function showNoResultsMessage(count, query) {
      // Remove existing message
      const existingMsg = document.querySelector('.no-results-message');
      if (existingMsg) existingMsg.remove();

      if (count === 0) {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results-message';
        noResultsDiv.style.animation = 'fadeInScale 0.4s ease';
        noResultsDiv.innerHTML = `
          <h3>🔍 No Lessons Found</h3>
          <p>Try searching with different keywords or check the spelling.</p>
          <p style="margin-top: 12px; color: #8b5cf6; font-weight: 600;">Tip: Search by lesson title or unit name!</p>
        `;
        unitsContainer.appendChild(noResultsDiv);
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Add CSS animation for search results
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(style);
})();

function scrollToUnit(unitNum) {
  const el = document.getElementById(`unit${unitNum}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Update active state
  document.querySelectorAll('.unit-nav a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
}

function setWeeklyGoal() {
  const currentGoal = document.getElementById('weeklyGoal').textContent;
  const newGoal = prompt(`Set your weekly star goal!\n\nCurrent goal: ${currentGoal}\n\nEnter new goal:`, currentGoal);
  if (newGoal && !isNaN(newGoal) && newGoal > 0) {
    localStorage.setItem('weeklyGoal', newGoal);
    document.getElementById('weeklyGoal').textContent = newGoal;
    
    // Show success message
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    message.textContent = `✨ Goal updated to ${newGoal} stars!`;
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 2500);
  }
}

// Make function globally accessible
window.setWeeklyGoal = setWeeklyGoal;
