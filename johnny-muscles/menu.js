(() => {
  'use strict';

  const STORAGE_KEY = 'johnnyMuscles.selectedCharacter';
  const STORY_ART_PARTS = 11;
  const STORY_ART_REV = '0.11.5';

  const panels = [...document.querySelectorAll('[data-panel]')];
  const openers = [...document.querySelectorAll('[data-open-panel]')];
  const closers = [...document.querySelectorAll('[data-close-panel]')];

  const storyPanel = document.getElementById('story-panel');
  const storyViewport = document.getElementById('story-viewport');
  const storyPages = storyViewport ? [...storyViewport.querySelectorAll('.story-page')] : [];
  const storyDots = [...document.querySelectorAll('[data-story-dot]')];
  const storyPrev = document.getElementById('story-prev');
  const storyNext = document.getElementById('story-next');
  const storyStart = document.getElementById('story-start');
  const storyPageCount = document.getElementById('story-page-count');
  const storyArtStatus = document.getElementById('story-art-status');
  const storyToolbar = document.querySelector('.story-toolbar');

  const characterPanel = document.getElementById('character-panel');
  const characterStatus = document.getElementById('character-status');
  const sheet = document.getElementById('character-sheet');
  const slides = sheet ? [...sheet.querySelectorAll('.character-slide')] : [];
  const prevButton = document.getElementById('character-prev');
  const nextButton = document.getElementById('character-next');
  const count = document.getElementById('character-count');
  const name = document.getElementById('selector-name');
  const tagline = document.getElementById('selector-tagline');
  const selectButton = document.getElementById('character-select-button');

  const johnnyConceptSheet = document.querySelector('#character-johnny .concept-sheet');
  if (johnnyConceptSheet) {
    johnnyConceptSheet.classList.add('character-comic-card');
    johnnyConceptSheet.innerHTML = `
      <div class="story-art-frame story-art-page-4 character-comic-art" role="img" aria-label="Johnny Muscles posing heroically in the final page of the origin comic."></div>
      <div class="character-comic-caption">
        <strong>Playable now</strong>
        <span>Origin comic hero splash</span>
      </div>`;
  }

  const storyFrames = [...document.querySelectorAll('.story-art-frame')];

  let lastFocus = null;
  let currentIndex = 0;
  let characterPointerStartX = null;
  let characterPointerStartY = null;
  let storyIndex = 0;
  let storyPointerStartX = null;
  let storyPointerStartY = null;
  let storyArtPromise = null;
  let storyArtObjectUrl = null;
  let transcriptVisible = false;

  const transcriptToggle = (() => {
    if (!storyToolbar) return null;
    const button = document.createElement('button');
    button.id = 'story-transcript-toggle';
    button.className = 'story-transcript-toggle';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'story-viewport');
    button.textContent = 'Show text transcript';
    storyToolbar.appendChild(button);
    return button;
  })();

  function visiblePanel() {
    return panels.find(panel => panel.classList.contains('visible')) || null;
  }

  function focusableElements(panel) {
    if (!panel) return [];
    return [...panel.querySelectorAll(
      'a[href]:not([hidden]), button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
    )].filter(element => !element.closest('[hidden]'));
  }

  function closePanels({ restoreFocus = true } = {}) {
    const returnTarget = lastFocus;
    panels.forEach(panel => {
      panel.classList.remove('visible');
      panel.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
    lastFocus = null;
    if (restoreFocus && returnTarget instanceof HTMLElement) returnTarget.focus();
  }

  function openPanel(id, opener) {
    const panel = document.getElementById(id);
    if (!panel) return;

    closePanels({ restoreFocus: false });
    lastFocus = opener || document.activeElement;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (panel === storyPanel) showStoryPage(0);
    if (panel === storyPanel || panel === characterPanel) loadStoryArt();

    const heading = panel.querySelector('.panel-head h2');
    if (heading instanceof HTMLElement) heading.focus();
  }

  function selectedCharacter() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'johnny';
    } catch {
      return 'johnny';
    }
  }

  function saveSelectedCharacter(character) {
    try {
      localStorage.setItem(STORAGE_KEY, character);
    } catch {
      // Selection still works for the current page when storage is unavailable.
    }
  }

  function updateHomeStatus() {
    if (!characterStatus) return;
    characterStatus.textContent = selectedCharacter() === 'johnny'
      ? 'Active fighter: Johnny Muscles'
      : 'Choose a fighter';
  }

  function showSlide(nextIndex) {
    if (!slides.length) return;
    currentIndex = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const active = index === currentIndex;
      slide.classList.toggle('is-active', active);
      slide.hidden = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });

    const active = slides[currentIndex];
    const character = active.dataset.character || '';
    const characterName = active.dataset.name || '';
    const status = active.dataset.status || 'locked';
    const characterTagline = active.dataset.tagline || '';

    if (count) count.textContent = `${currentIndex + 1} / ${slides.length}`;
    if (name) name.textContent = characterName;
    if (tagline) tagline.textContent = characterTagline;

    if (selectButton) {
      const playable = status === 'playable';
      const selected = selectedCharacter() === character;
      selectButton.disabled = !playable;
      selectButton.setAttribute('aria-pressed', String(playable && selected));
      selectButton.textContent = playable
        ? (selected ? `${characterName} Selected` : `Select ${characterName}`)
        : 'Locked';
      selectButton.setAttribute('aria-label', playable
        ? (selected ? `${characterName} is selected` : `Select ${characterName}`)
        : `${characterName} is locked`);
    }
  }

  function stepCharacter(direction) {
    showSlide(currentIndex + direction);
  }

  function showStoryPage(nextIndex) {
    if (!storyPages.length) return;
    storyIndex = Math.max(0, Math.min(nextIndex, storyPages.length - 1));

    storyPages.forEach((page, index) => {
      const active = index === storyIndex;
      page.classList.toggle('is-active', active);
      page.hidden = !active;
      page.setAttribute('aria-hidden', String(!active));
    });

    storyDots.forEach((dot, index) => {
      const active = index === storyIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'page');
      else dot.removeAttribute('aria-current');
    });

    if (storyPageCount) storyPageCount.textContent = `Page ${storyIndex + 1} / ${storyPages.length}`;
    if (storyPrev) storyPrev.disabled = storyIndex === 0;
    if (storyNext) storyNext.disabled = storyIndex === storyPages.length - 1;
    if (storyStart) storyStart.hidden = storyIndex !== storyPages.length - 1;
  }

  function stepStory(direction) {
    showStoryPage(storyIndex + direction);
  }

  function setTranscriptVisible(visible) {
    transcriptVisible = Boolean(visible);
    storyViewport?.classList.toggle('story-transcript-visible', transcriptVisible);
    if (transcriptToggle) {
      transcriptToggle.setAttribute('aria-expanded', String(transcriptVisible));
      transcriptToggle.textContent = transcriptVisible ? 'Hide text transcript' : 'Show text transcript';
    }
  }

  function base64ToObjectUrl(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  }

  async function loadStoryArt() {
    if (storyArtObjectUrl) return storyArtObjectUrl;
    if (storyArtPromise) return storyArtPromise;

    storyArtPromise = (async () => {
      try {
        if (storyArtStatus) {
          storyArtStatus.textContent = 'Loading comic art…';
          storyArtStatus.className = 'story-art-status';
        }

        const requests = Array.from({ length: STORY_ART_PARTS }, (_, index) => {
          const part = String(index + 1).padStart(2, '0');
          return fetch(`story-art/${part}.txt?rev=${STORY_ART_REV}`, { cache: 'force-cache' })
            .then(response => {
              if (!response.ok) throw new Error(`Comic art part ${part} returned ${response.status}`);
              return response.text();
            });
        });

        const parts = await Promise.all(requests);
        const base64 = parts.join('').replace(/\s+/g, '');
        if (!base64 || !/^[A-Za-z0-9+/]+=*$/.test(base64)) throw new Error('Comic art data was incomplete');

        storyArtObjectUrl = base64ToObjectUrl(base64);
        storyFrames.forEach(frame => {
          frame.style.backgroundImage = `url("${storyArtObjectUrl}")`;
        });
        document.documentElement.classList.add('story-art-ready');

        if (storyArtStatus) {
          storyArtStatus.textContent = 'Comic art ready';
          storyArtStatus.className = 'story-art-status ready';
        }
        return storyArtObjectUrl;
      } catch (error) {
        console.error('Could not load Johnny Muscles comic art:', error);
        if (storyPanel?.classList.contains('visible')) setTranscriptVisible(true);
        if (storyArtStatus) {
          storyArtStatus.textContent = 'Comic art unavailable. Text transcript shown.';
          storyArtStatus.className = 'story-art-status error';
        }
        return null;
      }
    })();

    return storyArtPromise;
  }

  openers.forEach(button => button.addEventListener('click', () => openPanel(button.dataset.openPanel, button)));
  closers.forEach(button => button.addEventListener('click', () => closePanels()));

  panels.forEach(panel => {
    panel.addEventListener('pointerdown', event => {
      if (event.target === panel) closePanels();
    });
  });

  prevButton?.addEventListener('click', () => stepCharacter(-1));
  nextButton?.addEventListener('click', () => stepCharacter(1));

  selectButton?.addEventListener('click', () => {
    const active = slides[currentIndex];
    if (!active || active.dataset.status !== 'playable') return;
    saveSelectedCharacter(active.dataset.character || 'johnny');
    updateHomeStatus();
    showSlide(currentIndex);
  });

  sheet?.addEventListener('pointerdown', event => {
    characterPointerStartX = event.clientX;
    characterPointerStartY = event.clientY;
  });

  sheet?.addEventListener('pointerup', event => {
    if (characterPointerStartX === null || characterPointerStartY === null) return;
    const dx = event.clientX - characterPointerStartX;
    const dy = event.clientY - characterPointerStartY;
    characterPointerStartX = null;
    characterPointerStartY = null;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    stepCharacter(dx < 0 ? 1 : -1);
  });

  sheet?.addEventListener('pointercancel', () => {
    characterPointerStartX = null;
    characterPointerStartY = null;
  });

  storyPrev?.addEventListener('click', () => stepStory(-1));
  storyNext?.addEventListener('click', () => stepStory(1));
  transcriptToggle?.addEventListener('click', () => setTranscriptVisible(!transcriptVisible));

  storyDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = Number(dot.dataset.storyDot);
      if (Number.isInteger(index)) showStoryPage(index);
    });
  });

  storyViewport?.addEventListener('pointerdown', event => {
    storyPointerStartX = event.clientX;
    storyPointerStartY = event.clientY;
  });

  storyViewport?.addEventListener('pointerup', event => {
    if (storyPointerStartX === null || storyPointerStartY === null) return;
    const dx = event.clientX - storyPointerStartX;
    const dy = event.clientY - storyPointerStartY;
    storyPointerStartX = null;
    storyPointerStartY = null;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    stepStory(dx < 0 ? 1 : -1);
  });

  storyViewport?.addEventListener('pointercancel', () => {
    storyPointerStartX = null;
    storyPointerStartY = null;
  });

  document.addEventListener('keydown', event => {
    const panel = visiblePanel();
    if (!panel) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closePanels();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = focusableElements(panel);
      if (!focusable.length) return;
      const activeIndex = focusable.indexOf(document.activeElement);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (activeIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeIndex === 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (panel === storyPanel) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepStory(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepStory(1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        showStoryPage(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        showStoryPage(storyPages.length - 1);
      }
      return;
    }

    if (panel === characterPanel) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepCharacter(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepCharacter(1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        showSlide(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        showSlide(slides.length - 1);
      }
    }
  });

  window.addEventListener('pagehide', () => {
    if (storyArtObjectUrl) URL.revokeObjectURL(storyArtObjectUrl);
  }, { once: true });

  updateHomeStatus();
  showSlide(0);
  showStoryPage(0);
})();
