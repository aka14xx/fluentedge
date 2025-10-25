(function(){
  const $ = (sel, ctx=document)=>ctx.querySelector(sel);
  const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));
  const params = new URLSearchParams(location.search);
  const lessonId = params.get('id');
  if(!lessonId){ renderError("Missing lesson id (?id=...)"); return; }

  const gradeMatch = lessonId.match(/^g(\d+)/);
  const gradeNum = gradeMatch ? gradeMatch[1] : params.get('grade') || '5';
  const gradeJsonPath = `lessons/grade${gradeNum}.json`;

  const state = {
    step: 0,
    maxStepUnlocked: 0,
    teachSubStep: 0, // Track sub-slides within Teach step
    starsBase: 0,
    practiceTotal: 0,
    // For each practice idx:
    // { type, answered, correct, order?, selectedIndex?, value?, hint?, done?, map?, orderRight? }
    practiceAnswers: [],
    data: null,
    lesson: null
  };

  const stepContainer = $('#stepContainer');
  const steps = $$('.step');
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  const starsEarned = $('#starsEarned');
  const backLink = $('#backLink');
  const headerAvatar = $('#headerAvatar');

  const savedAvatar = localStorage.getItem('userAvatar');
  if(savedAvatar) headerAvatar.src = savedAvatar;

  // Feedback sounds (place your WAV files in static/audio/)
  const goodUrl = '/static/audio/ASR_good.wav';
  const badUrl = '/static/audio/ASR_okay.wav';
  let audioGood = null, audioBad = null;
  let audioGoodExists = false, audioBadExists = false;
  // Try to fetch the sound files; if missing, fall back to Web Audio tone generation.
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioContextClass ? new AudioContextClass() : null;

  function playTone(freq, duration=0.18, type='sine', vol=0.18){
    if(!audioCtx) return;
    try{
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.start(now);
      o.stop(now + duration + 0.02);
    }catch(e){ /* ignore */ }
  }

  function playGood(){
    if(audioGoodExists && audioGood){
      audioGood.play().catch(()=> playTone(880,0.18,'sine',0.18));
    } else {
      playTone(880,0.18,'sine',0.18);
    }
  }

  function playBad(){
    if(audioBadExists && audioBad){
      audioBad.play().catch(()=> playTone(220,0.18,'sawtooth',0.18));
    } else {
      playTone(220,0.18,'sawtooth',0.18);
    }
  }

  // Probe for files in background
  try{
    fetch(goodUrl, { method: 'GET' }).then(r=>{
      if(r.ok){ audioGood = new Audio(goodUrl); audioGood.preload = 'auto'; audioGoodExists = true; }
    }).catch(()=>{});
    fetch(badUrl, { method: 'GET' }).then(r=>{
      if(r.ok){ audioBad = new Audio(badUrl); audioBad.preload = 'auto'; audioBadExists = true; }
    }).catch(()=>{});
  }catch(e){/* ignore */}

  backLink.href = `grades/grade${gradeNum}.html`;

  fetch(gradeJsonPath)
    .then(r=>r.json())
    .then(data=>{
      state.data = data;
      const {lesson} = findLesson(data, lessonId);
      if(!lesson) throw new Error(`Lesson ${lessonId} not found in grade${gradeNum}.json`);
      state.lesson = lesson;
      state.starsBase = lesson.stars || 10;

      $('#lessonTitle').textContent = `${lesson.title}`;
      starsEarned.textContent = loadStars(lessonId);

      // Hide Read tab if there's no read section
      const hasReadSection = lesson.sections && lesson.sections.read;
      const readTab = steps[1]; // Read is the 2nd tab (index 1)
      if (!hasReadSection && readTab) {
        readTab.style.display = 'none';
      }

      const progress = loadProgress(lessonId);
      state.step = progress.step ?? 0;
      state.maxStepUnlocked = progress.maxStepUnlocked ?? 0;
      state.teachSubStep = progress.teachSubStep ?? 0;

      initPracticeStateFromLesson(lesson, progress.practiceAnswers);

      updateStepsUI();
      renderStep();
      wireNav();
    })
    .catch(err=>{
      console.error(err);
      renderError("Could not load lesson. Check JSON path or id.");
    });

  function findLesson(data, id){
    for(const unit of (data.units||[])){
      for(const lesson of (unit.lessons||[])){
        if(lesson.id === id) return {lesson};
      }
    }
    return {lesson:null};
  }

  function renderError(msg){
    document.body.innerHTML = `
      <div style="max-width:720px;margin:40px auto;font-family:Nunito">
        <a href="dashboard.html" style="text-decoration:none;color:#287258;font-weight:800">← Back to dashboard</a>
        <h2 style="color:#b00">Error</h2>
        <p>${msg}</p>
      </div>`;
  }

  function computePracticeScore(){
    return state.practiceAnswers.filter(a => a.correct === true).length;
  }
  function computeAnsweredCount(){
    return state.practiceAnswers.filter(a => a.answered === true).length;
  }

  // Helper to check if lesson has read section
  function hasReadSection(){
    return !!(state.lesson?.sections?.read);
  }

  // Helper to get next valid step (skip Read if it doesn't exist)
  function getNextStep(currentStep){
    let next = currentStep + 1;
    // Skip step 1 (Read) if no read section exists
    if(next === 1 && !hasReadSection()){
      next = 2;
    }
    return next;
  }

  // Helper to get previous valid step (skip Read if it doesn't exist)
  function getPrevStep(currentStep){
    let prev = currentStep - 1;
    // Skip step 1 (Read) if no read section exists
    if(prev === 1 && !hasReadSection()){
      prev = 0;
    }
    return prev;
  }

  function updateStepsUI(){
    steps.forEach((btn,idx)=>{
      btn.classList.toggle('current', idx===state.step);
      btn.classList.toggle('locked', idx>state.maxStepUnlocked);
      btn.onclick = ()=>{
        if(idx<=state.maxStepUnlocked){
          state.step = idx;
          renderStep();
          updateStepsUI();
          saveProgress();
        }
      };
    });
    prevBtn.disabled = state.step===0;
    nextBtn.textContent = state.step<3 ? "Next →" : "Finish";
  }

  function wireNav(){
    prevBtn.onclick = ()=>{
      if(state.step>0){ 
        state.step = getPrevStep(state.step);
        state.teachSubStep = 0; // Reset teach sub-step when going back
        renderStep(); 
        updateStepsUI(); 
        saveProgress(); 
      }
    };
    nextBtn.onclick = ()=>{
      if(state.step<3){
        if(state.step===2){
          const answered = computeAnsweredCount();
          if(state.practiceTotal>0 && answered<state.practiceTotal){
            toast(`Answer all questions first (${answered}/${state.practiceTotal}).`);
            return;
          }
        }
        state.step = getNextStep(state.step);
        state.maxStepUnlocked = Math.max(state.maxStepUnlocked, state.step);
        renderStep(); updateStepsUI(); saveProgress();
      }else{
        const practiceScore = computePracticeScore();
        const bonus = Math.round((practiceScore/state.practiceTotal || 0) * state.starsBase);
        const total = state.starsBase + bonus;
        const already = loadStars(lessonId);
        const added = Math.max(0, total - already);
        if(added>0){
          saveStars(lessonId, total);
          awardGlobalStars(added);
          starsEarned.textContent = total;
          toast(`Great job! ⭐ +${added} stars`);
        }else{
          toast("Lesson already completed. Nice!");
        }
      }
    };
  }

  function renderTeachStep(L){
    const teach = L.sections?.teach || {};
    const wrap = document.createElement('div');
    wrap.className = 'teach-wrap';

    // -------- New: Build explicit slides from points (objectives, vocab table, phrases, grammar, convo, tips)
    // This allows multi-slide Teach even when content isn't only tables
    const buildTeachSlides = (teachObj)=>{
      const slides = [];
      const pts = Array.isArray(teachObj.points) ? teachObj.points.map(p=> (p??"").toString()) : [];

      // Always start with an intro slide
      slides.push({ type: 'intro', title: teachObj.title || 'Learn it', intro: teachObj.intro || '' });

      // Helper: identify if a line is a section header
      const isHeader = (s)=>{
        const t = s.trim();
        return (
          /^🎯|^What You'\w+ Learn|^Objectives/i.test(t) ||
          /^💰|Money\s*&?\s*Prices|Money Vocabulary/i.test(t) ||
          /^🗣️|^Useful Phrases|^Useful Shopping Phrases/i.test(t) ||
          /^⚖️|^Grammar/i.test(t) ||
          /^💬|^Conversation/i.test(t) ||
          /^💡|^Tip|^Smart Shopping Tips/i.test(t) ||
          /^🐾|^🧩|^🔹/i.test(t)
        );
      };

      // Scan through points to create slides
      let i = 0;
      while(i < pts.length){
        const line = pts[i].trim();
        if(!line){ i++; continue; }

        // Generic TABLE detector: a header-like line followed by one or more pipe rows
        // This allows tables such as "Country | Performer Type | Description"
        if(!line.includes('|') && (i+1<pts.length && pts[i+1].includes('|'))){
          // Peek header row (first row with pipes)
          let j = i + 1;
          const headerParts = pts[j].split('|').map(s=>s.trim());
          let columns = null;
          // Treat first pipe row as header if it looks like titles (not sentence-like)
          if(headerParts.length>=2){
            columns = headerParts;
            j++;
          }
          const rows = [];
          while(j<pts.length && pts[j].includes('|')){
            const parts = pts[j].split('|').map(s=>s.trim());
            rows.push(parts);
            j++;
          }
          if(rows.length){
            slides.push({ type:'table', title: line, rows, columns: columns || ['Word','Meaning','Example'] });
            i = j; continue;
          }
        }

        // Objectives block
        if(/^🎯|^What You'\w+ Learn|^Objectives/i.test(line)){
          const items = [];
          i++;
          while(i<pts.length && !isHeader(pts[i]) && !/\|/.test(pts[i])){
            const s = pts[i].trim(); if(s) items.push(s); i++;
          }
          if(items.length) slides.push({ type:'list', title: line.replace(/^🎯\s*/,'').trim(), items });
          continue;
        }

        // Money vocabulary (table expected)
        if(/^💰|Money\s*&?\s*Prices|Money Vocabulary/i.test(line)){
          let j = i + 1;
          // Skip a possible header row
          if(j<pts.length && /\b(Word|Shop|English)\b\s*\|/i.test(pts[j])) j++;
          const rows = [];
          while(j<pts.length && pts[j].includes('|')){
            const parts = pts[j].split('|').map(s=>s.trim());
            if(parts.length>=2){
              const word = parts[0];
              const meaning = parts[1]||'';
              const example = parts.slice(2).join(' | ').trim();
              rows.push({word, meaning, example});
            }
            j++;
          }
          if(rows.length) slides.push({ type:'table', title: line, rows });
          i = j; continue;
        }

        // Useful phrases (bulleted list)
        if(/^🗣️|^Useful Phrases|^Useful Shopping Phrases/i.test(line)){
          const items = [];
          i++;
          while(i<pts.length && !isHeader(pts[i])){ const s = pts[i].trim(); if(s) items.push(s); i++; }
          if(items.length) slides.push({ type:'list', title: line, items });
          continue;
        }

        // Grammar block (keep all lines until next header)
        if(/^⚖️|^Grammar/i.test(line)){
          const block = [];
          i++;
          while(i<pts.length && !isHeader(pts[i])){ block.push(pts[i]); i++; }
          if(block.length) slides.push({ type:'block', title: line, lines: block });
          continue;
        }

        // Conversation example
        if(/^💬|^Conversation/i.test(line)){
          const convo = [];
          i++;
          while(i<pts.length && !isHeader(pts[i])){ convo.push(pts[i]); i++; }
          if(convo.length) slides.push({ type:'block', title: line, lines: convo });
          continue;
        }

        // Tips
        if(/^💡|^Tip|^Smart Shopping Tips/i.test(line)){
          const items = [];
          i++;
          while(i<pts.length && !isHeader(pts[i])){ const s = pts[i].trim(); if(s) items.push(s); i++; }
          if(items.length) slides.push({ type:'list', title: line, items });
          continue;
        }

        // Unknown line; skip
        i++;
      }

      return slides;
    };

    const explicitSlides = buildTeachSlides(teach);

    // Add vocab, grammar, and culture slides if they exist as objects
    if(teach.vocab && teach.vocab.table){
      explicitSlides.push({
        type: 'vocab_table',
        title: '💬 Key Vocabulary',
        columns: teach.vocab.table.columns || [],
        rows: teach.vocab.table.rows || []
      });
    }

    if(teach.grammar){
      explicitSlides.push({
        type: 'grammar',
        title: '🧩 Grammar Focus',
        explanation: teach.grammar.explanation || '',
        columns: teach.grammar.table?.columns || [],
        rows: teach.grammar.table?.rows || [],
        questions: teach.grammar.questions || []
      });
    }

    if(teach.culture){
      explicitSlides.push({
        type: 'culture',
        title: '🌍 Culture Corner',
        oman: teach.culture.oman || [],
        world: teach.culture.world || []
      });
    }

    // Parse all vocabulary tables from points
    const allTables = [];
    if (Array.isArray(teach.points) && teach.points.length) {
      let currentTable = null;
      let currentRows = [];
      
      teach.points.forEach(line => {
        const str = (line || "").toString().trim();
        const hasPipe = str.includes("|");
        
        // Check if this is a table section header (emoji markers)
        if (str.match(/^🏪|^💰|^🔹/) && !hasPipe) {
          // Save previous table if exists
          if (currentTable && currentRows.length > 0) {
            allTables.push({ title: currentTable, rows: currentRows });
          }
          // Start new table
          currentTable = str;
          currentRows = [];
          return;
        }
        
        // Check if this is the column header row (Word | Meaning | Example, etc.)
        const isTableHeader = hasPipe && /\b(word|shop|english)\b\s*\|/i.test(str);
        if (isTableHeader) {
          // Skip header row, we already have the title
          return;
        }
        
        // If we're in a table and this line has pipes, it's a data row
        if (currentTable && hasPipe) {
          const parts = str.split('|').map(s => s.trim());
          if (parts.length >= 2) {
            const word = parts[0] || "";
            const meaning = parts[1] || "";
            const example = parts.slice(2).join(' | ').trim();
            currentRows.push({ word, meaning, example });
          }
        }
      });
      
      // Save last table
      if (currentTable && currentRows.length > 0) {
        allTables.push({ title: currentTable, rows: currentRows });
      }
    }

    console.log('Detected tables:', allTables.length, allTables);

    // If we built explicit slides beyond just the intro, use them
    if (explicitSlides.length > 1) {
      const idx = Math.max(0, Math.min(state.teachSubStep, explicitSlides.length-1));
      const slide = explicitSlides[idx];

      const renderList = (items)=>`<ul class="teach-points">${items.map(it=>`<li>${safe(it)}</li>`).join('')}</ul>`;
      const renderBlock = (lines)=>`<div class="teach-block" style="white-space:pre-wrap;line-height:1.6">${safe(lines.join('\n'))}</div>`;

      let inner = '';
      if(slide.type==='intro'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <p>${safe(slide.intro)}</p>
        `;
      }else if(slide.type==='table'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          ${vocabTableHTML(slide.rows, slide.columns)}
        `;
      }else if(slide.type==='list'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          ${renderList(slide.items)}
        `;
      }else if(slide.type==='block'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          ${renderBlock(slide.lines)}
        `;
      }else if(slide.type==='vocab_table'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          ${vocabTableHTML(slide.rows, slide.columns)}
        `;
      }else if(slide.type==='grammar'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          <p>${safe(slide.explanation)}</p>
          ${vocabTableHTML(slide.rows, slide.columns)}
          ${slide.questions.length ? '<h4>🗣 Question forms:</h4><ul class="teach-points">' + slide.questions.map(q=>`<li>${safe(q)}</li>`).join('') + '</ul>' : ''}
        `;
      }else if(slide.type==='culture'){
        inner = `
          <h2>${safe(teach.title || 'Learn it')}</h2>
          <h3>${safe(slide.title)}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:15px;">
            <div>
              <h4 style="color:var(--primary);margin-bottom:10px;">🇴🇲 In Oman</h4>
              <ul class="teach-points">${slide.oman.map(item=>`<li>${safe(item)}</li>`).join('')}</ul>
            </div>
            <div>
              <h4 style="color:var(--warning);margin-bottom:10px;">🌍 Around the World</h4>
              <ul class="teach-points">${slide.world.map(item=>`<li>${safe(item)}</li>`).join('')}</ul>
            </div>
          </div>
        `;
      }

      // Note on last slide
      if(idx === explicitSlides.length-1 && teach.note){
        inner += `<p class="note">${safe(teach.note)}</p>`;
      }

      const nav = `
        <div style="display:flex;gap:10px;margin-top:12px;">
          ${idx>0 ? '<button class="nav-btn" id="teachBack">← Back</button>' : ''}
          ${idx<explicitSlides.length-1 ? '<button class="nav-btn primary" id="teachNext">Next →</button>' : '<button class="nav-btn primary" id="teachDone">Continue →</button>'}
        </div>`;

      // Use compact image for all Grade 8 lessons (better fit)
      const isGrade8 = L.id && L.id.startsWith('g8');
      const mediaClass = isGrade8 ? 'teach-media compact' : 'teach-media large';
      wrap.innerHTML = `
        <div class="${mediaClass}">
          ${mediaHTML(teach.image || L.image)}
        </div>
        <div class="teach-content">${inner}${nav}</div>`;

      stepContainer.appendChild(wrap);

      // Media/layout adjustments
      const tm = wrap.querySelector('.teach-media');
      if(tm && getComputedStyle(tm).display === 'none'){
        wrap.classList.add('no-media');
      }

      // Wire buttons
      const nextBtnEl = $('#teachNext');
      if(nextBtnEl){ nextBtnEl.onclick = ()=>{ state.teachSubStep = Math.min(idx+1, explicitSlides.length-1); renderStep(); saveProgress(); }; }
      const backBtnEl = $('#teachBack');
      if(backBtnEl){ backBtnEl.onclick = ()=>{ state.teachSubStep = Math.max(idx-1, 0); renderStep(); saveProgress(); }; }
      const doneBtnEl = $('#teachDone');
      if(doneBtnEl){ doneBtnEl.onclick = ()=>{ 
        const nextStep = getNextStep(0);
        if(state.maxStepUnlocked < nextStep) state.maxStepUnlocked = nextStep; 
        state.step = nextStep; 
        state.teachSubStep = 0; 
        updateStepsUI(); 
        renderStep(); 
        saveProgress(); 
      }; }

      return; // Stop: we used explicit slides path
    }

    // Render based on sub-step
    if (allTables.length >= 3) {
      // Multi-table lesson: 3 slides
      if (state.teachSubStep === 0) {
        // Slide 1: Intro text only
        wrap.innerHTML = `
          <div class="teach-media large">
            ${mediaHTML(teach.image || L.image)}
          </div>
          <div class="teach-content">
            <h2>${teach.title || "Learn it"}</h2>
            <p>${safe(teach.intro || "Short, clear explanation goes here.")}</p>
            <button class="nav-btn primary" id="teachNext">Got it →</button>
          </div>`;
      } else if (state.teachSubStep === 1) {
        // Slide 2: First table (Types of Shops)
        const firstTable = allTables[0];
        wrap.innerHTML = `
          <div class="teach-media large">
            ${mediaHTML(teach.image || L.image)}
          </div>
          <div class="teach-content">
            <h2>${teach.title || "Learn it"}</h2>
            <h3>${firstTable.title}</h3>
            ${vocabTableHTML(firstTable.rows)}
            <div style="display:flex;gap:10px;margin-top:12px;">
              <button class="nav-btn" id="teachBack">← Back</button>
              <button class="nav-btn primary" id="teachNext">Next →</button>
            </div>
          </div>`;
      } else if (state.teachSubStep === 2) {
        // Slide 3: Remaining tables (Money + Phrases)
        const remainingTables = allTables.slice(1);
        wrap.innerHTML = `
          <div class="teach-media large">
            ${mediaHTML(teach.image || L.image)}
          </div>
          <div class="teach-content">
            <h2>${teach.title || "Learn it"}</h2>
            ${remainingTables.map(t => `<h3>${t.title}</h3>${vocabTableHTML(t.rows)}`).join('')}
            ${teach.note ? `<p class="note">${safe(teach.note)}</p>` : ""}
            <div style="display:flex;gap:10px;margin-top:12px;">
              <button class="nav-btn" id="teachBack">← Back</button>
              <button class="nav-btn primary" id="teachDone">Continue →</button>
            </div>
          </div>`;
      }
    } else if (allTables.length > 0) {
      // Single or double table lesson: 2 slides
      if (state.teachSubStep === 0) {
        // Slide 1: Intro + first table
        const firstTable = allTables[0];
        wrap.innerHTML = `
          <div class="teach-media large">
            ${mediaHTML(teach.image || L.image)}
          </div>
          <div class="teach-content">
            <h2>${teach.title || "Learn it"}</h2>
            <p>${safe(teach.intro || "Short, clear explanation goes here.")}</p>
            ${firstTable ? `<h3>${firstTable.title}</h3>${vocabTableHTML(firstTable.rows)}` : ""}
            <button class="nav-btn primary" id="teachNext">Got it →</button>
          </div>`;
      } else {
        // Slide 2: Remaining tables
        const remainingTables = allTables.slice(1);
        wrap.innerHTML = `
          <div class="teach-media large">
            ${mediaHTML(teach.image || L.image)}
          </div>
          <div class="teach-content">
            <h2>${teach.title || "Learn it"}</h2>
            ${remainingTables.map(t => `<h3>${t.title}</h3>${vocabTableHTML(t.rows)}`).join('')}
            ${teach.note ? `<p class="note">${safe(teach.note)}</p>` : ""}
            <div style="display:flex;gap:10px;margin-top:12px;">
              <button class="nav-btn" id="teachBack">← Back</button>
              <button class="nav-btn primary" id="teachDone">Continue →</button>
            </div>
          </div>`;
      }
    } else {
      // Fallback: no tables detected, single slide with everything
      wrap.innerHTML = `
        <div class="teach-media large">
          ${mediaHTML(teach.image || L.image)}
        </div>
        <div class="teach-content">
          <h2>${teach.title || "Learn it"}</h2>
          <p>${safe(teach.intro || "Short, clear explanation goes here.")}</p>
          ${teach.note ? `<p class="note">${safe(teach.note)}</p>` : ""}
          <button class="nav-btn primary" id="teachDone">Got it →</button>
        </div>`;
    }

    stepContainer.appendChild(wrap);
    
    // If media hidden, collapse to one column
    const tm = wrap.querySelector('.teach-media');
    if(tm && getComputedStyle(tm).display === 'none'){
      wrap.classList.add('no-media');
    }

    // Wire up buttons
    const nextBtn = $('#teachNext');
    if (nextBtn) {
      nextBtn.onclick = () => {
        state.teachSubStep++;
        renderStep();
        saveProgress();
      };
    }

    const backBtn = $('#teachBack');
    if (backBtn) {
      backBtn.onclick = () => {
        if (state.teachSubStep > 0) state.teachSubStep--;
        renderStep();
        saveProgress();
      };
    }

    const doneBtn = $('#teachDone');
    if (doneBtn) {
      doneBtn.onclick = () => {
        const nextStep = getNextStep(0);
        if (state.maxStepUnlocked < nextStep) state.maxStepUnlocked = nextStep;
        state.step = nextStep;
        state.teachSubStep = 0; // Reset for next time
        updateStepsUI();
        renderStep();
        saveProgress();
      };
    }
  }

  function renderStep(){
    const L = state.lesson;
    
    // Add exit animation
    stepContainer.style.opacity = '0';
    stepContainer.style.transform = 'translateX(-20px)';
    
    setTimeout(() => {
      stepContainer.innerHTML = "";
      
      if(state.step===0){
        renderTeachStep(L);
      }else if(state.step===1){
      const wrap = document.createElement('div');
      wrap.className = 'read-wrap';
      wrap.innerHTML = `
        <div class="read-media large">
          ${mediaHTML(L.sections?.read?.image)}
        </div>
        <div class="read-content">
          <h2>${L.sections?.read?.title || "Read"}</h2>
          <p style="white-space: pre-wrap;">${safe(L.sections?.read?.passage || "Your reading passage goes here.")}</p>
        </div>`;
      stepContainer.appendChild(wrap);
      const rm = wrap.querySelector('.read-media');
      if(rm && getComputedStyle(rm).display === 'none'){
        wrap.classList.add('no-media');
      }
    }else if(state.step===2){
      const practice = L.sections?.practice || [];
      const answered = practice.filter((q,i) => state.practiceAnswers[i]?.answered).length;
      const total = practice.length;
      
      // Progress header
      const progressHeader = document.createElement('div');
      progressHeader.style.cssText = 'background:white;padding:20px;border-radius:12px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
      progressHeader.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0;">📝 Practice Questions</h2>
          <div style="font-size:1.1rem;color:#666;">
            <span id="practice-progress" style="color:#36c28a;font-weight:600;">${answered}</span> / ${total} completed
          </div>
        </div>
        <div style="width:100%;background:#e0e0e0;height:8px;border-radius:4px;margin-top:12px;overflow:hidden;">
          <div id="practice-bar" style="width:${(answered/total*100)}%;background:#36c28a;height:100%;transition:width 0.3s ease;"></div>
        </div>
      `;
      stepContainer.appendChild(progressHeader);
      
      const container = document.createElement('div');
      practice.forEach((q,idx)=>{
        if(q.type==='mcq'){
          container.appendChild(renderMCQ(q, idx));
        }else if(q.type==='fill'){
          container.appendChild(renderFill(q, idx));
        }else if(q.type==='drag'){
          container.appendChild(renderDragMatch(q, idx));
        }else if(q.type==='write'){
          container.appendChild(renderWrite(q, idx));
        }
      });
      stepContainer.appendChild(container);
      
      // Update progress function (can be called from answer handlers)
      window.updatePracticeProgress = () => {
        const answeredNow = practice.filter((q,i) => state.practiceAnswers[i]?.answered).length;
        const progSpan = document.getElementById('practice-progress');
        const progBar = document.getElementById('practice-bar');
        if(progSpan) progSpan.textContent = answeredNow;
        if(progBar) progBar.style.width = `${(answeredNow/total*100)}%`;
      };
    }else{
      const wrap = document.createElement('div');
      wrap.className = 'review-wrap';
      wrap.innerHTML = `
        <h2>${L.sections?.review?.title || "Review"}</h2>
        <div class="tip">${safe(L.sections?.review?.tip || "Quick tip to remember the rule.")}</div>
        <div class="note">When you click Finish, stars are awarded based on your Practice score.</div>`;
      stepContainer.appendChild(wrap);
    }
    
    // Add enter animation
    setTimeout(() => {
      stepContainer.style.opacity = '1';
      stepContainer.style.transform = 'translateX(0)';
    }, 50);
    
    }, 150); // Close setTimeout from renderStep start
  }

  // ---------- Write (free response, completion-based)
  function renderWrite(q, idx){
    const saved = state.practiceAnswers[idx] || {};
    const card = document.createElement('div');
    card.className = 'practice-item';
    const inputId = `write_${idx}_${Math.random().toString(36).slice(2,7)}`;
    const minChars = Math.max(20, q.minChars || 60);
    const questionText = q.question || q.prompt || "";
    card.innerHTML = `
      <div class="q-text"><strong>Q${idx+1}.</strong> ${safe(questionText)}</div>
      <textarea id="${inputId}" placeholder="Type your answer here..." style="width:100%;min-height:120px;padding:12px;border-radius:10px;border:1px solid #ccc;font-size:1rem;margin-top:10px;"></textarea>
      <div style="display:flex;gap:10px;align-items:center;margin-top:8px;justify-content:space-between;">
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="nav-btn" id="${inputId}_btn">Submit</button>
          <span class="note">Min ${minChars} characters</span>
        </div>
        <span id="${inputId}_counter" style="font-size:0.9rem;color:#666;">0 / ${minChars}</span>
      </div>
    `;
    const ta = card.querySelector(`#${inputId}`);
    const btn = card.querySelector(`#${inputId}_btn`);
    const counter = card.querySelector(`#${inputId}_counter`);
    
    // Character counter update
    const updateCounter = () => {
      const len = (ta.value || "").trim().length;
      counter.textContent = `${len} / ${minChars}`;
      counter.style.color = len >= minChars ? '#36c28a' : '#666';
    };
    
    ta.addEventListener('input', updateCounter);
    
    if(saved.value){ 
      ta.value = saved.value; 
      updateCounter();
    }
    if(saved.answered){
      ta.disabled = true;
      btn.disabled = true;
      btn.textContent = saved.correct ? 'Submitted ✓' : 'Submitted';
      ta.style.borderColor = saved.correct ? '#36c28a' : '#f0ad4e';
    }

    btn.onclick = ()=>{
      const val = (ta.value||"").trim();
      const ok = val.length >= minChars;
      if(ok){
        ta.style.borderColor = '#36c28a';
        btn.textContent = 'Submitted ✓';
        ta.disabled = true; btn.disabled = true;
        toast('Answer saved successfully! ✓');
      }else{
        ta.style.borderColor = '#f66';
        toast(`Write a bit more! You need ${minChars - val.length} more characters.`);
      }
      state.practiceAnswers[idx] = { type:'write', answered:true, correct:ok, value: val };
      saveProgress();
      if(window.updatePracticeProgress) window.updatePracticeProgress();
    };
    return card;
  }

  // ---------- MCQ (stable order + persistence)
  function renderMCQ(q, idx){
    // Support TWO formats:
    // 1. OLD: { prompt, answer: "text" }
    // 2. NEW: { question, correct: index }
    const questionText = q.question || q.prompt || "";
    let correctIndex;
    if(typeof q.correct === 'number'){
      // NEW format: correct is index
      correctIndex = q.correct;
    } else {
      // OLD format: answer is text, find index
      correctIndex = Math.max(0, q.options.findIndex(o => o === q.answer));
    }
    
    const saved = state.practiceAnswers[idx] || {};
    let order = saved.order;
    if(!Array.isArray(order) || order.length !== q.options.length){
      order = shuffledIndices(q.options.length);
      state.practiceAnswers[idx] = {
        type: 'mcq',
        answered: false,
        correct: false,
        selectedIndex: null,
        order
      };
      saveProgress();
    }else{
      state.practiceAnswers[idx] = {
        type: 'mcq',
        answered: saved.answered || false,
        correct: saved.correct || false,
        selectedIndex: (typeof saved.selectedIndex==='number') ? saved.selectedIndex : null,
        order
      };
    }

    const card = document.createElement('div');
    card.className = 'practice-item';
    card.innerHTML = `
      <div class="q-text"><strong>Q${idx+1}.</strong> ${safe(questionText)}</div>
      <div class="mcq-options"></div>`;
    const optionsBox = $('.mcq-options', card);

    order.forEach(origIdx=>{
      const optText = q.options[origIdx];
      const btn = document.createElement('button');
      btn.className = 'mcq-option';
      btn.textContent = optText;

      if(state.practiceAnswers[idx].answered){
        btn.dataset.locked = "1";
        if(origIdx === correctIndex) btn.classList.add('correct');
        if(state.practiceAnswers[idx].selectedIndex === origIdx && origIdx !== correctIndex){
          btn.classList.add('wrong');
        }
      }

      btn.onclick = ()=>{
        if(btn.dataset.locked) return;
        $$('.mcq-option', optionsBox).forEach(b=>b.dataset.locked="1");
        const isCorrect = (origIdx === correctIndex);
        if(isCorrect){ btn.classList.add('correct'); toast('Correct! ✅'); try{ playGood(); }catch(e){} }
        else{
          btn.classList.add('wrong');
          $$('.mcq-option', optionsBox).forEach(b=>{ if(b.textContent===q.answer) b.classList.add('correct'); });
          toast('Not quite.'); try{ playBad(); }catch(e){}
        }
        state.practiceAnswers[idx] = { type:'mcq', answered:true, correct:isCorrect, selectedIndex:origIdx, order };
        saveProgress();
        if(window.updatePracticeProgress) window.updatePracticeProgress();
      };

      optionsBox.appendChild(btn);
    });

    return card;
  }

  // ---------- Fill (persistence)
  function renderFill(q, idx){
    const saved = state.practiceAnswers[idx] || {};
    const card = document.createElement('div');
    card.className = 'practice-item';
    const inputId = `fill_${idx}_${Math.random().toString(36).slice(2,7)}`;
    const questionText = q.question || q.prompt || "";
    card.innerHTML = `
      <div class="q-text"><strong>Q${idx+1}.</strong> ${safe(questionText)}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:10px;">
        <input id="${inputId}" type="text" placeholder="Type your answer" style="flex:1;padding:10px;border-radius:10px;border:1px solid #ccc;font-size:1rem;">
        <button class="nav-btn" id="${inputId}_btn">Check</button>
      </div>
      <div class="note" style="display:none;margin-top:10px;" id="${inputId}_hint"></div>
    `;
    const input = card.querySelector(`#${inputId}`);
    const btn = card.querySelector(`#${inputId}_btn`);
    const hint = card.querySelector(`#${inputId}_hint`);
    const accepted = (q.acceptableAnswers && q.acceptableAnswers.length ? q.acceptableAnswers : [q.answer]).map(a=>a.toLowerCase().trim());

    if(saved.value){ input.value = saved.value; }
    if(saved.answered){
      if(saved.correct){
        input.style.borderColor = '#36c28a';
        input.disabled = true;
        btn.disabled = true;
        btn.textContent = 'Correct';
      }else{
        input.style.borderColor = '#f66';
        hint.style.display = 'block';
        hint.textContent = saved.hint || '';
      }
    }

    btn.onclick = ()=>{
      const val = (input.value||"").toLowerCase().trim();
      const isCorrect = accepted.includes(val);
      if(isCorrect){
        input.style.borderColor = '#36c28a';
        input.disabled = true;
        btn.disabled = true;
        btn.textContent = 'Correct';
        hint.style.display = 'none';
        toast('Nice! ✅'); try{ playGood(); }catch(e){}
      }else{
        input.style.borderColor = '#f66';
        hint.style.display = 'block';
        hint.textContent = q.hint || 'Check spelling/case.';
        toast('Try again.'); try{ playBad(); }catch(e){}
      }
      state.practiceAnswers[idx] = { type:'fill', answered:true, correct:isCorrect, value: input.value, hint: hint.style.display==='block' ? hint.textContent : '' };
      saveProgress();
      if(window.updatePracticeProgress) window.updatePracticeProgress();
    };
    return card;
  }

  // ---------- Drag & Drop Matching (persistence)
  function renderDragMatch(q, idx){
    // Support TWO formats:
    // 1. OLD: { left:[], right:[], answers:{} }
    // 2. NEW: { pairs:[{left,right}] }
    let left, right, answerMap;
    
    if(q.pairs && Array.isArray(q.pairs)){
      // NEW format with pairs
      left = q.pairs.map(p => p.left);
      right = q.pairs.map(p => p.right);
      answerMap = {};
      q.pairs.forEach(p => {
        answerMap[p.left] = p.right;
      });
    } else {
      // OLD format
      left = q.left || [];
      right = q.right || [];
      answerMap = q.answers || {};
    }

    // Build/restore saved state
    const saved = state.practiceAnswers[idx] || {};
    let orderRight = saved.orderRight;
    if(!Array.isArray(orderRight) || orderRight.length !== right.length){
      orderRight = shuffledIndices(right.length);
    }
    const map = saved.map || {}; // {leftIndex: rightIndex}

    // Helpers
    const allFilled = ()=> Object.keys(map).length === left.length && Object.values(map).every(v=> typeof v==='number');
    const evaluate = ()=>{
      const ok = left.every((lTxt, lIdx)=>{
        const rIdx = map[lIdx];
        if(typeof rIdx !== 'number') return false;
        return (answerMap[lTxt] === right[rIdx]);
      });
      state.practiceAnswers[idx] = { type:'drag', answered: true, correct: ok, map, orderRight };
      saveProgress();
  toast(ok ? 'All matched! ✅' : 'Some matches are incorrect.');
  try{ if(ok) playGood(); else playBad(); }catch(e){}
      // Mark correctness styles
      // We’ll simply highlight incorrect slots
      $$('.drop-slot', card).forEach(slot=>{
        const lIndex = parseInt(slot.dataset.leftIndex,10);
        const rIndex = map[lIndex];
        if(typeof rIndex !== 'number') return;
        const correct = (answerMap[left[lIndex]] === right[rIndex]);
        slot.style.borderColor = correct ? '#36c28a' : '#f66';
      });
    };

    const card = document.createElement('div');
    card.className = 'practice-item';
    const questionText = q.question || q.prompt || "";
    card.innerHTML = `
      <div class="q-text" style="margin-bottom:10px;"><strong>Q${idx+1}.</strong> ${safe(questionText)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;">
        <div>
          ${left.map((txt,i)=>`
            <div style="display:flex;align-items:center;gap:8px;margin:8px 0;">
              <div style="min-width:140px;font-weight:700">${safe(txt)}</div>
              <div class="drop-slot" data-left-index="${i}" style="flex:1;min-height:38px;border:2px dashed #bbb;border-radius:10px;padding:6px;display:flex;align-items:center;gap:6px;"></div>
            </div>
          `).join('')}
        </div>
        <div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;" class="drag-bank"></div>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button class="nav-btn" id="checkBtn">Check</button>
            <button class="nav-btn" id="clearBtn">Clear</button>
          </div>
        </div>
      </div>
    `;

    const bank = $('.drag-bank', card);

    // Create chip helper
    const makeChip = (text, rIndex)=>{
      const chip = document.createElement('div');
      chip.className = 'drag-chip';
      chip.draggable = true;
      chip.dataset.rIndex = String(rIndex);
      chip.textContent = text;
      chip.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:999px;background:#fff;border:2px solid #ddd;cursor:grab;user-select:none;box-shadow:0 2px 6px rgba(0,0,0,.08);font-weight:800;';
      chip.addEventListener('dragstart', (e)=>{
        e.dataTransfer.setData('text/plain', rIndex.toString());
      });
      chip.addEventListener('click', ()=>{
        // Click-to-assign: find first empty slot
        const firstEmpty = $$('.drop-slot', card).find(s=>!s.dataset.rIndex);
        if(firstEmpty){
          placeChipIntoSlot(chip, firstEmpty);
        }
      });
      return chip;
    };

    // Drop behavior
    const placeChipIntoSlot = (chip, slot)=>{
      const rIndex = parseInt(chip.dataset.rIndex,10);
      const lIndex = parseInt(slot.dataset.leftIndex,10);
      // If slot already filled, return previous chip to bank
      if(slot.dataset.rIndex){
        const prevR = parseInt(slot.dataset.rIndex,10);
        const oldChip = makeChip(right[prevR], prevR);
        bank.appendChild(oldChip);
      }
      // If chip was in another slot, clear that mapping
      const oldSlot = chip.parentElement?.classList?.contains('drop-slot') ? chip.parentElement : null;
      if(oldSlot){
        delete oldSlot.dataset.rIndex;
        const oldL = parseInt(oldSlot.dataset.leftIndex,10);
        delete map[oldL];
      }

      // Move
      slot.innerHTML = '';
      slot.appendChild(chip);
      slot.dataset.rIndex = String(rIndex);
      chip.style.cursor = 'grabbing';

      // Update map
      map[lIndex] = rIndex;
      state.practiceAnswers[idx] = { type:'drag', answered: allFilled(), correct: false, map, orderRight };
      saveProgress();

      // Remove duplicates from bank
      $$('.drag-chip', bank).forEach(c=>{
        if(parseInt(c.dataset.rIndex,10) === rIndex) c.remove();
      });

      // If every slot filled, auto-check
      if(allFilled()) evaluate();
    };

    // Prepare slots to accept drops
    $$('.drop-slot', card).forEach(slot=>{
      slot.addEventListener('dragover', e=>{ e.preventDefault(); slot.style.background = '#f6faff'; });
      slot.addEventListener('dragleave', ()=>{ slot.style.background = ''; });
      slot.addEventListener('drop', e=>{
        e.preventDefault();
        slot.style.background = '';
        const rIndex = parseInt(e.dataTransfer.getData('text/plain'),10);
        const chip = $(`.drag-chip[data-r-index="${rIndex}"]`) || $(`.drag-chip[data-rindex="${rIndex}"]`);
        // chip might be in bank or another slot; find it
        const chipEl = chip || $$('.drag-chip').find(el=>parseInt(el.dataset.rIndex,10)===rIndex);
        if(chipEl) placeChipIntoSlot(chipEl, slot);
      });
    });

    // Render bank chips in saved stable order
    const assignedR = new Set(Object.values(map).filter(v=>typeof v==='number'));
    orderRight.forEach(rIdx=>{
      if(!assignedR.has(rIdx)){
        bank.appendChild(makeChip(right[rIdx], rIdx));
      }
    });

    // Restore placed chips into slots
    Object.keys(map).forEach(lKey=>{
      const lIndex = parseInt(lKey,10);
      const rIndex = map[lIndex];
      if(typeof rIndex !== 'number') return;
      const slot = $(`.drop-slot[data-left-index="${lIndex}"]`, card);
      if(!slot) return;
      const chip = makeChip(right[rIndex], rIndex);
      placeChipIntoSlot(chip, slot);
    });

    // Buttons
    $('#checkBtn', card).onclick = ()=>{
      if(!allFilled()){ toast('Match all items first.'); return; }
      evaluate();
    };
    $('#clearBtn', card).onclick = ()=>{
      // Reset map & UI
      Object.keys(map).forEach(k=>delete map[k]);
      $$('.drop-slot', card).forEach(s=>{ s.innerHTML=''; delete s.dataset.rIndex; s.style.borderColor = '#bbb'; });
      bank.innerHTML = '';
      orderRight.forEach(rIdx=> bank.appendChild(makeChip(right[rIdx], rIdx)));
      state.practiceAnswers[idx] = { type:'drag', answered:false, correct:false, map, orderRight };
      saveProgress();
    };

    return card;
  }

  // ---------- Init practice state
  function initPracticeStateFromLesson(lesson, savedAnswers){
    const items = (lesson.sections?.practice || []);
    state.practiceTotal = items.length;

    const init = Array.from({length: state.practiceTotal}, (_,i)=>{
      const t = items[i]?.type || 'mcq';
      const base = { type: t, answered: false, correct: false };
      if(t==='mcq'){
        base.order = Array.isArray(savedAnswers?.[i]?.order) ? [...savedAnswers[i].order] : null;
        base.selectedIndex = (typeof savedAnswers?.[i]?.selectedIndex==='number') ? savedAnswers[i].selectedIndex : null;
      }
      if(t==='fill'){
        base.value = savedAnswers?.[i]?.value || '';
        base.hint = savedAnswers?.[i]?.hint || '';
      }
      if(t==='drag'){
        base.map = savedAnswers?.[i]?.map || {};
        base.orderRight = Array.isArray(savedAnswers?.[i]?.orderRight) ? [...savedAnswers[i].orderRight] : null;
      }
      if(t==='write'){
        base.value = savedAnswers?.[i]?.value || '';
      }
      if(savedAnswers && savedAnswers[i]){
        base.answered = !!savedAnswers[i].answered;
        base.correct = !!savedAnswers[i].correct;
      }
      return base;
    });

    state.practiceAnswers = init;
  }

  // ---------- Persistence
  function loadProgress(id){
    try{ return JSON.parse(localStorage.getItem(`progress:${id}`)) || {}; }catch{return {}}
  }
  function saveProgress(){
    localStorage.setItem(`progress:${lessonId}`, JSON.stringify({
      step: state.step,
      maxStepUnlocked: state.maxStepUnlocked,
      teachSubStep: state.teachSubStep,
      practiceAnswers: state.practiceAnswers
    }));
  }
  function loadStars(id){ return parseInt(localStorage.getItem(`stars:${id}`)||"0",10); }
  function saveStars(id, val){ localStorage.setItem(`stars:${id}`, String(val)); }
  function awardGlobalStars(add){
    const countEl = document.getElementById('starsEarned');
    const newVal = loadStars(lessonId);
    countEl.textContent = newVal;
    const DASH = localStorage.getItem('globalStars')||"0";
    localStorage.setItem('globalStars', String(parseInt(DASH,10)+add));
  }

  // ---------- Utils
  function mediaHTML(src){
    if(!src) return `<div style="display:flex;align-items:center;justify-content:center;height:100%;">📘</div>`;
    // Hide the media box if the image 404s so the text can expand full width
    return `<img src="${src}" alt="Lesson image" onerror="this.parentElement && (this.parentElement.style.display='none')" />`;
  }
  function pointsHTML(arr){
    if(!Array.isArray(arr) || !arr.length) return "";
    return `<ul class="teach-points">${arr.map(p=>`<li>${safe(p)}</li>`).join('')}</ul>`;
  }
  // Build a nice HTML table for vocabulary entries
  function vocabTableHTML(rows, columns){
    if(!Array.isArray(rows) || !rows.length) return "";
    // Helper: image cell renderer
    const cellHTML = (val)=>{
      const s = (val??"").toString().trim();
      if(/^images\//i.test(s) && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(s)){
        return `<img src="${s}" alt="" style="max-height:64px;object-fit:contain" onerror="this.style.display='none'"/>`;
      }
      return safe(s);
    };
    // Normalize to arrays of up to 3 columns
    const asArrays = rows.map(r=> Array.isArray(r) ? r : [r.word||"", r.meaning||"", r.example||""]);
    const colCount = Math.min(3, Array.isArray(columns)&&columns.length ? columns.length : Math.max(...asArrays.map(a=>a.length), 3));
    const cols = Array.isArray(columns) && columns.length ? columns.slice(0,colCount) : (colCount===2 ? ['Item','Detail'] : ['Word','Meaning','Example']);
    const padded = asArrays.map(a=>{
      const copy = a.slice(0,colCount);
      while(copy.length<colCount) copy.push("");
      return copy;
    });
    return `
      <div class="vocab-wrap">
        <table class="vocab-table">
          <thead>
            <tr>${cols.map(c=>`<th>${safe(c||'')}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${padded.map(r=>`<tr>${r.map(c=>`<td>${cellHTML(c)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
  // Try to extract a vocabulary table from pipe-separated points ("Word | Meaning | Example")
  function extractVocabFromPoints(points){
    const out = { rows: [], restPoints: [] };
    if(!Array.isArray(points)) return out;
    let capturing = false;
    points.forEach(line=>{
      const str = (line||"").toString();
      const hasPipe = str.includes("|");
      const isHeader = hasPipe && /\bword\b\s*\|\s*\bmeaning\b\s*\|\s*\bexample\b/i.test(str);
      if(isHeader){ capturing = true; return; }
      if(capturing && hasPipe){
        const parts = str.split('|').map(s=>s.trim());
        if(parts.length >= 2){
          const word = parts[0] || "";
          const meaning = parts[1] || "";
          const example = parts.slice(2).join(' | ').trim();
          out.rows.push({word, meaning, example});
          return;
        }
      }
      out.restPoints.push(str);
    });
    return out;
  }
  function safe(s){ return (s??"").toString().replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function shuffledIndices(n){
    const a = Array.from({length:n}, (_,i)=>i);
    for(let i=n-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  function toast(msg){
    let bar = $('#snackbar');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'snackbar';
      bar.className = 'snackbar';
      document.body.appendChild(bar);
    }
    bar.textContent = msg; bar.classList.add('show');
    setTimeout(()=>bar.classList.remove('show'), 1200);
  }
})();