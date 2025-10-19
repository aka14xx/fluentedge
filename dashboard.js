// build v4 - Beautiful Animations & Modals
document.addEventListener('DOMContentLoaded', () => {
  // Set or prompt username
  const nameEl = document.getElementById('greet-name');
  const savedUsername = localStorage.getItem('username');
  if (savedUsername) nameEl.textContent = `Hi ${savedUsername}! 👋`;
  else document.getElementById('name-modal').style.display = 'flex';

  document.querySelector('.save-name-btn').addEventListener('click', () => {
    const v = document.getElementById('name-input').value.trim();
    if (!v) return;
    localStorage.setItem('username', v);
    nameEl.textContent = `Hi ${v}! 👋`;
    document.getElementById('name-modal').style.display = 'none';
    showToast(`✨ Welcome, ${v}!`);
  });

  // Edit name button
  document.getElementById('edit-name-btn').addEventListener('click', () => {
    const currentName = localStorage.getItem('username') || '';
    document.getElementById('name-input').value = currentName;
    document.getElementById('name-modal').style.display = 'flex';
    // Focus the input after a small delay
    setTimeout(() => document.getElementById('name-input').focus(), 100);
  });

  // Allow Enter key to save name
  document.getElementById('name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.querySelector('.save-name-btn').click();
    }
  });

  // Avatar modal open/close
  document.getElementById('avatar-btn').addEventListener('click', () => {
    document.getElementById('avatar-modal').style.display = 'flex';
    updateAvatarSelection();
  });
  
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.close;
      if (id) document.getElementById(id).style.display = 'none';
      else btn.closest('.modal').style.display = 'none';
    });
  });

  // Avatar selection
  function updateAvatarSelection() {
    const savedAvatar = localStorage.getItem('userAvatar');
    document.querySelectorAll('.avatar-select').forEach(img => {
      if (img.src === savedAvatar) {
        img.classList.add('selected');
      } else {
        img.classList.remove('selected');
      }
    });
  }
  
  document.querySelectorAll('.avatar-select').forEach(img => {
    img.addEventListener('click', () => {
      document.getElementById('avatar-btn').src = img.src;
      document.getElementById('greet-avatar').src = img.src;
      localStorage.setItem('userAvatar', img.src);
      
      // Update selection visually
      document.querySelectorAll('.avatar-select').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      
      showToast('✨ Avatar updated!');
      
      setTimeout(() => {
        document.getElementById('avatar-modal').style.display = 'none';
      }, 500);
    });
  });

  // Restore saved avatar
  const savedAvatar = localStorage.getItem('userAvatar');
  if (savedAvatar) {
    document.getElementById('avatar-btn').src = savedAvatar;
    document.getElementById('greet-avatar').src = savedAvatar;
  }

  // Goals modal
  document.getElementById('weekly-goals-btn').addEventListener('click', () => {
    const currentGoal = localStorage.getItem('weeklyGoal') || '5';
    document.getElementById('goal-input').value = currentGoal;
    document.getElementById('goals-modal').style.display = 'flex';
  });
  
  document.querySelector('.save-goal-btn').addEventListener('click', () => {
    const goalValue = document.getElementById('goal-input').value;
    if (goalValue && goalValue > 0) {
      localStorage.setItem('weeklyGoal', goalValue);
      
      // Award 10 stars for setting a goal
      const starEl = document.getElementById('star-count');
      const currentStars = parseInt(starEl.textContent || '0', 10);
      const newStars = currentStars + 10;
      starEl.textContent = newStars;
      
      // Update global stars in localStorage
      localStorage.setItem('globalStars', newStars);
      
      // Show success message
      showToast(`✨ Goal set! +10 stars! Aim for ${goalValue} lessons this week!`);
      
      document.getElementById('goals-modal').style.display = 'none';
    }
  });
  
  // Load global stars on page load
  const globalStars = localStorage.getItem('globalStars') || '0';
  document.getElementById('star-count').textContent = globalStars;
  
  // Practice Speaking button
  document.getElementById('practice-speaking-btn').addEventListener('click', () => {
    window.location.href = 'speaking.html';
  });

  // E-books button — redirect to Ministry e-books in a new tab
  document.getElementById('ebooks-btn').addEventListener('click', () => {
    window.open('https://ict.moe.gov.om/book/', '_blank');
  });

  // Toast notification function
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});