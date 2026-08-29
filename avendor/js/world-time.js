(() => {
  'use strict';

  const DAYPARTS = Object.freeze(['dawn', 'day', 'dusk', 'night']);
  const DEFAULT_DAYPART = 'dusk';
  const STORAGE_KEY = 'avendorDaypart';
  const CHANGE_EVENT = 'avendor:daypartchange';

  const stage = document.getElementById('walk-stage');
  const overlay = document.getElementById('daypart-overlay');
  const cycleButton = document.getElementById('daypart-cycle');

  function normalizeDaypart(value) {
    const normalized = String(value || '').toLowerCase();
    return DAYPARTS.includes(normalized) ? normalized : null;
  }

  function readInitialDaypart() {
    const params = new URLSearchParams(window.location.search);
    return normalizeDaypart(params.get('daypart'))
      || normalizeDaypart(sessionStorage.getItem(STORAGE_KEY))
      || DEFAULT_DAYPART;
  }

  let currentDaypart = readInitialDaypart();

  function updateButton(daypart) {
    if (!cycleButton) return;
    cycleButton.textContent = `Daypart: ${daypart}`;
    cycleButton.dataset.daypart = daypart;
    cycleButton.setAttribute('aria-label', `Current daypart ${daypart}. Click to cycle time-of-day lighting.`);
  }

  function setDaypart(daypart, options = {}) {
    const resolved = normalizeDaypart(daypart);
    if (!resolved) {
      throw new TypeError(`Unknown Avendor daypart: ${daypart}`);
    }

    const previous = currentDaypart;
    currentDaypart = resolved;

    if (stage) stage.dataset.daypart = resolved;
    if (overlay) overlay.dataset.daypart = resolved;
    updateButton(resolved);

    if (options.persist !== false) {
      sessionStorage.setItem(STORAGE_KEY, resolved);
    }

    if (previous !== resolved || options.forceEvent) {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {
        detail: { daypart: resolved, previousDaypart: previous }
      }));
    }

    return resolved;
  }

  function getDaypart() {
    return currentDaypart;
  }

  function cycleDaypart() {
    const index = DAYPARTS.indexOf(currentDaypart);
    return setDaypart(DAYPARTS[(index + 1) % DAYPARTS.length]);
  }

  if (cycleButton) {
    cycleButton.addEventListener('click', cycleDaypart);
  }

  setDaypart(currentDaypart, { persist: false, forceEvent: true });

  window.AvendorWorldTime = Object.freeze({
    DAYPARTS,
    DEFAULT_DAYPART,
    CHANGE_EVENT,
    getDaypart,
    setDaypart,
    cycleDaypart
  });
})();
