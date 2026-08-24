(() => {
  'use strict';

  const PlayerState = window.AvendorPlayerState;
  const Sprite = window.AvendorSpriteEngine?.LayeredSprite;
  if (!PlayerState || !Sprite) {
    throw new Error('Character creator requires player-state.js and sprite-engine.js.');
  }

  const form = document.getElementById('character-form');
  const nameInput = document.getElementById('character-name');
  const backgroundSelect = document.getElementById('background-select');
  const statEditor = document.getElementById('stat-editor');
  const skillPicker = document.getElementById('skill-picker');
  const pointsRemaining = document.getElementById('points-remaining');
  const skillsChosen = document.getElementById('skills-chosen');
  const backgroundName = document.getElementById('background-name');
  const backgroundDescription = document.getElementById('background-description');
  const backgroundSkill = document.getElementById('background-skill');
  const previewCanvas = document.getElementById('hero-preview');
  const previewName = document.getElementById('preview-name');
  const previewBackground = document.getElementById('preview-background');
  const sheetName = document.getElementById('sheet-name');
  const sheetBackground = document.getElementById('sheet-background');
  const sheetStats = document.getElementById('sheet-stats');
  const naturalSkills = document.getElementById('natural-skills');
  const practicedList = document.getElementById('practiced-list');
  const reputationList = document.getElementById('reputation-list');
  const healthBar = document.getElementById('health-bar');
  const staminaBar = document.getElementById('stamina-bar');
  const willBar = document.getElementById('will-bar');
  const healthValue = document.getElementById('health-value');
  const staminaValue = document.getElementById('stamina-value');
  const willValue = document.getElementById('will-value');
  const saveStatus = document.getElementById('save-status');
  const saveButton = document.getElementById('save-character');
  const resetButton = document.getElementById('reset-character');
  const beginButton = document.getElementById('begin-character');
  const bodyButtons = [...document.querySelectorAll('[data-body]')];

  const hero = new Sprite(previewCanvas, { body: 'male' });
  let state = PlayerState.load();
  let statusTimer = 0;

  function setStatus(message, isError = false) {
    window.clearTimeout(statusTimer);
    saveStatus.textContent = message;
    saveStatus.classList.toggle('error', isError);
    statusTimer = window.setTimeout(() => {
      saveStatus.textContent = 'Prototype ready.';
      saveStatus.classList.remove('error');
    }, 2800);
  }

  function populateBackgrounds() {
    backgroundSelect.textContent = '';
    for (const [key, definition] of Object.entries(PlayerState.BACKGROUNDS)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = definition.name;
      backgroundSelect.appendChild(option);
    }
  }

  function populateSkillPicker() {
    skillPicker.textContent = '';
    for (const skill of PlayerState.PRACTICED_SKILLS) {
      const label = document.createElement('label');
      label.className = 'skill-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = skill;
      input.addEventListener('change', () => {
        const background = PlayerState.getBackground(state);
        if (skill === background.skill) return;

        if (input.checked) {
          if (state.practicedSkills.length >= 2) {
            input.checked = false;
            setStatus('Choose only two additional practiced skills.', true);
            return;
          }
          state.practicedSkills.push(skill);
        } else {
          state.practicedSkills = state.practicedSkills.filter((item) => item !== skill);
        }
        render();
      });
      const span = document.createElement('span');
      span.textContent = skill;
      label.append(input, span);
      skillPicker.appendChild(label);
    }
  }

  async function setBody(body) {
    state.body = body === 'female' ? 'female' : 'male';
    for (const button of bodyButtons) {
      const selected = button.dataset.body === state.body;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    await hero.setBody(state.body);
    hero.setMotion('idle', 'south');
    hero.draw();
  }

  function renderStatEditor() {
    pointsRemaining.textContent = String(PlayerState.pointsRemaining(state));
    statEditor.querySelectorAll('.stat-row').forEach((row) => {
      const key = row.dataset.stat;
      const output = row.querySelector('output');
      const minus = row.querySelector('[data-action="minus"]');
      const plus = row.querySelector('[data-action="plus"]');
      output.textContent = String(state.stats[key]);
      minus.disabled = state.stats[key] <= PlayerState.BASE_STAT;
      plus.disabled = state.stats[key] >= PlayerState.STAT_MAX || PlayerState.pointsRemaining(state) <= 0;
    });
  }

  function renderBackground() {
    const background = PlayerState.getBackground(state);
    backgroundSelect.value = state.background;
    backgroundName.textContent = background.name;
    backgroundDescription.textContent = background.description;
    backgroundSkill.textContent = background.skill;
    previewBackground.textContent = background.name;
    sheetBackground.textContent = background.name;

    skillPicker.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const isGranted = input.value === background.skill;
      input.disabled = isGranted;
      input.checked = isGranted || state.practicedSkills.includes(input.value);
      input.closest('.skill-option').classList.toggle('granted', isGranted);
    });
  }

  function renderSheetStats() {
    sheetStats.textContent = '';
    for (const key of PlayerState.STAT_KEYS) {
      const item = document.createElement('div');
      item.innerHTML = `<span>${PlayerState.STAT_LABELS[key]}</span><strong>${state.stats[key]}</strong>`;
      sheetStats.appendChild(item);
    }
  }

  function renderNaturalSkills() {
    naturalSkills.textContent = '';
    for (const skill of PlayerState.naturalSkills(state)) {
      const item = document.createElement('div');
      item.title = skill.formula;
      item.innerHTML = `<span>${skill.name}</span><strong>${skill.rating}</strong>`;
      naturalSkills.appendChild(item);
    }
  }

  function renderResources() {
    const resources = PlayerState.derivedResources(state);
    const maximums = { health: 110, stamina: 110, will: 95 };
    const entries = [
      ['health', resources.health, healthBar, healthValue],
      ['stamina', resources.stamina, staminaBar, staminaValue],
      ['will', resources.will, willBar, willValue]
    ];
    for (const [key, value, bar, label] of entries) {
      bar.style.width = `${Math.min(100, (value / maximums[key]) * 100)}%`;
      label.textContent = String(value);
    }
  }

  function renderLists() {
    practicedList.textContent = '';
    PlayerState.allPracticedSkills(state).forEach((skill, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${skill}</span><b>${index === 0 ? 'Background' : 'Novice'}</b>`;
      practicedList.appendChild(li);
    });
    if (state.practicedSkills.length === 0) {
      const li = document.createElement('li');
      li.className = 'muted-list-item';
      li.textContent = 'Choose two additional skills.';
      practicedList.appendChild(li);
    }

    reputationList.textContent = '';
    for (const [faction, standing] of Object.entries(state.reputation)) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${faction}</span><b>${standing}</b>`;
      reputationList.appendChild(li);
    }
  }

  function renderIdentity() {
    const name = state.name || 'Unnamed';
    previewName.textContent = name;
    sheetName.textContent = name;
  }

  function render() {
    state = PlayerState.sanitize(state);
    nameInput.value = state.name;
    skillsChosen.textContent = String(state.practicedSkills.length);
    renderIdentity();
    renderStatEditor();
    renderBackground();
    renderSheetStats();
    renderNaturalSkills();
    renderResources();
    renderLists();
  }

  function savePrototype(message = 'Character prototype saved locally.') {
    state.name = nameInput.value.trim();
    state = PlayerState.save(state);
    render();
    setStatus(message);
  }

  function canBegin() {
    if (!state.name.trim()) {
      setStatus('Give the character a name first.', true);
      nameInput.focus();
      return false;
    }
    if (PlayerState.pointsRemaining(state) !== 0) {
      setStatus('Spend all 8 prototype statistic points first.', true);
      return false;
    }
    if (state.practicedSkills.length !== 2) {
      setStatus('Choose two additional practiced skills first.', true);
      return false;
    }
    return true;
  }

  statEditor.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.stat-row');
    const key = row?.dataset.stat;
    if (!key) return;

    if (button.dataset.action === 'plus') {
      if (PlayerState.pointsRemaining(state) <= 0 || state.stats[key] >= PlayerState.STAT_MAX) return;
      state.stats[key] += 1;
    } else if (state.stats[key] > PlayerState.BASE_STAT) {
      state.stats[key] -= 1;
    }
    render();
  });

  bodyButtons.forEach((button) => {
    button.addEventListener('click', () => void setBody(button.dataset.body));
  });

  nameInput.addEventListener('input', () => {
    state.name = nameInput.value.trimStart().slice(0, 32);
    renderIdentity();
  });

  backgroundSelect.addEventListener('change', () => {
    state.background = backgroundSelect.value;
    const granted = PlayerState.getBackground(state).skill;
    state.practicedSkills = state.practicedSkills.filter((skill) => skill !== granted).slice(0, 2);
    render();
  });

  saveButton.addEventListener('click', () => savePrototype());

  resetButton.addEventListener('click', () => {
    state = PlayerState.createDefault();
    PlayerState.clear();
    void setBody(state.body);
    render();
    setStatus('Character prototype reset.');
  });

  beginButton.addEventListener('click', () => {
    state.name = nameInput.value.trim();
    if (!canBegin()) return;
    savePrototype('Character created. Entering Briarwell...');
    window.setTimeout(() => {
      window.location.href = 'walk-test.html';
    }, 240);
  });

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      savePrototype('Ctrl+S: character prototype saved locally.');
    }
  });

  async function boot() {
    populateBackgrounds();
    populateSkillPicker();
    form.addEventListener('submit', (event) => event.preventDefault());
    render();
    await setBody(state.body);
  }

  void boot();
})();
