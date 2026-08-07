/**
 * My RPG Source - Homepage
 * ------------------------
 * Controls the synchronized Featured Knowledge Card on the desktop artboard
 * and mobile layout. The guarded timer is cleared before every restart.
 */

(() => {
  'use strict';

  if (document.documentElement.dataset.homepageInitialized === 'true') {
    return;
  }
  document.documentElement.dataset.homepageInitialized = 'true';

  const ROTATION_DELAY_MS = 9000;

  const fallbackCards = [
    {
      title: 'Passive Perception',
      categoryName: 'Skills',
      summary:
        'Passive Perception represents what a character notices without actively searching. It can reveal danger, hidden details, or important clues.',
      href: 'codex.html?type=rule&q=Passive%20Perception',
    },
    {
      title: 'Ability Modifier',
      categoryName: 'Character Creation',
      summary:
        'An ability modifier is the bonus or penalty derived from an ability score. It is added to many checks, saves, attacks, and other rolls.',
      href: 'codex.html?type=rule&q=Ability%20Modifier',
    },
    {
      title: 'Armor Class',
      categoryName: 'Combat',
      summary:
        'Armor Class represents how difficult a creature is to hit. An attack normally succeeds when its total equals or exceeds the target’s Armor Class.',
      href: 'codex.html?type=rule&q=Armor%20Class',
    },
    {
      title: 'Concentration',
      categoryName: 'Spellcasting',
      summary:
        'Some spells require concentration to remain active. Taking damage can force a Constitution saving throw, and starting another concentration spell ends the first.',
      href: 'codex.html?type=rule&q=Concentration',
    },
    {
      title: 'Advantage and Disadvantage',
      categoryName: 'Combat',
      summary:
        'Advantage means rolling two d20s and using the higher result. Disadvantage means rolling two d20s and using the lower result.',
      href: 'codex.html?type=rule&q=Advantage%20and%20Disadvantage',
    },
  ];

  const cardContainers = Array.from(document.querySelectorAll('[data-featured-card]'));
  const samples = Array.from(document.querySelectorAll('[data-card-sample]'));
  const metaElements = Array.from(document.querySelectorAll('[data-card-meta]'));
  const titleElements = Array.from(document.querySelectorAll('[data-card-title]'));
  const summaryElements = Array.from(document.querySelectorAll('[data-card-summary]'));
  const linkElements = Array.from(document.querySelectorAll('[data-card-link]'));
  const previousButtons = Array.from(document.querySelectorAll('[data-card-previous]'));
  const pauseButtons = Array.from(document.querySelectorAll('[data-card-pause]'));
  const nextButtons = Array.from(document.querySelectorAll('[data-card-next]'));

  if (
    cardContainers.length === 0 ||
    samples.length === 0 ||
    titleElements.length === 0 ||
    previousButtons.length === 0 ||
    pauseButtons.length === 0 ||
    nextButtons.length === 0
  ) {
    return;
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interactionSources = new Set();

  let cards = shuffleCards(fallbackCards);
  let currentIndex = 0;
  let rotationTimer = null;
  let flipTimer = null;
  let manuallyPaused = reducedMotionQuery.matches;
  let isFlipping = false;
  let pendingIndex = null;

  function shuffleCards(sourceCards) {
    const shuffled = [...sourceCards];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }

  function normalizeCards(payload) {
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];

    return entries
      .filter((entry) => {
        return (
          typeof entry?.title === 'string' &&
          entry.title.trim() &&
          typeof entry?.summary === 'string' &&
          entry.summary.trim() &&
          typeof entry?.globalId === 'string'
        );
      })
      .map((entry) => ({
        title: entry.title.trim(),
        categoryName: [
          entry.edition ? `${entry.edition} rules` : '',
          typeof entry.categoryName === 'string'
            ? entry.categoryName.trim()
            : 'Rules Codex',
        ]
          .filter(Boolean)
          .join(' • '),
        summary: entry.summary.trim(),
        href: `codex.html?entry=${encodeURIComponent(entry.globalId)}`,
      }));
  }

  function setText(elements, value) {
    elements.forEach((element) => {
      element.textContent = value;
    });
  }

  function commitCard(index) {
    currentIndex = (index + cards.length) % cards.length;
    const card = cards[currentIndex];

    setText(metaElements, card.categoryName);
    setText(titleElements, card.title);
    setText(summaryElements, card.summary);

    linkElements.forEach((link) => {
      link.href = card.href;
      link.setAttribute('aria-label', `Read ${card.title} in the Rules Codex`);
    });
  }

  function clearFlipTimer() {
    if (flipTimer !== null) {
      window.clearTimeout(flipTimer);
      flipTimer = null;
    }
  }

  function updateSampleClasses(removeClass, addClass = null) {
    samples.forEach((sample) => {
      sample.classList.remove(removeClass);
      if (addClass) {
        sample.classList.add(addClass);
      }
    });
  }

  function showCard(index, options = {}) {
    if (cards.length === 0) {
      return;
    }

    const targetIndex = (index + cards.length) % cards.length;
    const animate = options.animate !== false && !reducedMotionQuery.matches;

    if (!animate) {
      clearFlipTimer();
      pendingIndex = null;
      isFlipping = false;
      samples.forEach((sample) => {
        sample.classList.remove('is-flipping-out', 'is-flipping-in');
      });
      commitCard(targetIndex);
      return;
    }

    if (isFlipping) {
      pendingIndex = targetIndex;
      return;
    }

    isFlipping = true;
    updateSampleClasses('is-flipping-in', 'is-flipping-out');

    flipTimer = window.setTimeout(() => {
      commitCard(targetIndex);
      updateSampleClasses('is-flipping-out', 'is-flipping-in');

      flipTimer = window.setTimeout(() => {
        updateSampleClasses('is-flipping-in');
        flipTimer = null;
        isFlipping = false;

        if (pendingIndex !== null && pendingIndex !== currentIndex) {
          const queuedIndex = pendingIndex;
          pendingIndex = null;
          showCard(queuedIndex);
        } else {
          pendingIndex = null;
        }
      }, 280);
    }, 240);
  }

  function stopRotation() {
    if (rotationTimer !== null) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function shouldPauseRotation() {
    return (
      manuallyPaused ||
      interactionSources.size > 0 ||
      document.hidden ||
      cards.length < 2
    );
  }

  function startRotation() {
    stopRotation();

    if (shouldPauseRotation()) {
      return;
    }

    rotationTimer = window.setInterval(() => {
      showCard(currentIndex + 1);
    }, ROTATION_DELAY_MS);
  }

  function updatePauseButtons() {
    pauseButtons.forEach((button) => {
      button.textContent = manuallyPaused ? 'Play' : 'Pause';
      button.setAttribute('aria-pressed', manuallyPaused ? 'true' : 'false');
    });
  }

  previousButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showCard(currentIndex - 1);
      startRotation();
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showCard(currentIndex + 1);
      startRotation();
    });
  });

  pauseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      updatePauseButtons();
      startRotation();
    });
  });

  cardContainers.forEach((container) => {
    container.addEventListener('mouseenter', () => {
      interactionSources.add(container);
      stopRotation();
    });

    container.addEventListener('mouseleave', () => {
      interactionSources.delete(container);
      startRotation();
    });

    container.addEventListener('focusin', () => {
      interactionSources.add(container);
      stopRotation();
    });

    container.addEventListener('focusout', (event) => {
      if (!container.contains(event.relatedTarget)) {
        interactionSources.delete(container);
        startRotation();
      }
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopRotation();
    } else {
      startRotation();
    }
  });

  reducedMotionQuery.addEventListener?.('change', (event) => {
    if (event.matches) {
      manuallyPaused = true;
      updatePauseButtons();
      stopRotation();
    }
  });

  updatePauseButtons();
  showCard(Math.floor(Math.random() * cards.length), { animate: false });
  startRotation();

  if (!window.MyRPGCodexData) {
    console.warn('Featured Knowledge Cards are using the built-in fallback set.');
    return;
  }

  window.MyRPGCodexData
    .loadEntries({
      gameSystem: 'dnd5e',
      editions: ['2014', '2024'],
      entryTypes: ['rule'],
    })
    .then((payload) => {
      const loadedCards = normalizeCards(payload);

      if (loadedCards.length === 0) {
        return;
      }

      cards = shuffleCards(loadedCards);
      currentIndex = 0;
      showCard(0, { animate: false });
      startRotation();
    })
    .catch((error) => {
      console.warn(
        'Featured Knowledge Cards are using their built-in fallback set.',
        error
      );
    });
})();
