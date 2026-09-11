(() => {
  'use strict';

  let selected = 'johnny';
  try { selected = localStorage.getItem('johnnyMuscles.selectedCharacter') || 'johnny'; } catch {}
  if (selected !== 'rick') return;

  const toast = document.getElementById('toast');
  if (!toast || toast.dataset.fighterCopyInstalled === 'true') return;
  toast.dataset.fighterCopyInstalled = 'true';

  const rewrite = () => {
    if (/\bJOHNNY\b/i.test(toast.textContent)) {
      toast.textContent = toast.textContent.replace(/\bJOHNNY\b/gi, 'RICK');
    }
  };

  const observer = new MutationObserver(rewrite);
  observer.observe(toast, { childList: true, characterData: true, subtree: true });
  rewrite();
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
