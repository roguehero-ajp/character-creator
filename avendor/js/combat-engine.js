(() => {
  'use strict';

  const ATTACKS = Object.freeze({
    quick: Object.freeze({
      id: 'quick',
      label: 'Quick Cut',
      key: 'J',
      baseDurationMs: 980,
      staminaCost: 9,
      activeStart: 0.43,
      activeEnd: 0.59,
      reachPx: 142,
      startAngle: -54,
      contactAngle: 61,
      endAngle: 38,
      leanPx: 8,
      leanDeg: 2.2
    }),
    committed: Object.freeze({
      id: 'committed',
      label: 'Committed Slash',
      key: 'K',
      baseDurationMs: 1380,
      staminaCost: 17,
      activeStart: 0.46,
      activeEnd: 0.64,
      reachPx: 156,
      startAngle: -82,
      contactAngle: 78,
      endAngle: 52,
      leanPx: 14,
      leanDeg: 4.5
    }),
    thrust: Object.freeze({
      id: 'thrust',
      label: 'Thrust',
      key: 'L',
      baseDurationMs: 1190,
      staminaCost: 13,
      activeStart: 0.49,
      activeEnd: 0.63,
      reachPx: 170,
      startAngle: 74,
      contactAngle: 90,
      endAngle: 82,
      leanPx: 18,
      leanDeg: 1.6,
      thrustExtensionPx: 34
    })
  });

  const SELF_PRACTICE_CAP = 30;
  const MIN_TIMING_SCALE = 0.72;
  const MAX_TIMING_SCALE = 1.58;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function smoothstep(t) {
    const value = clamp(t, 0, 1);
    return value * value * (3 - (2 * value));
  }

  function lerp(start, end, t) {
    return start + ((end - start) * t);
  }

  function getSwordProgress(state) {
    const progress = state?.weaponProgress?.Sword || {};
    return {
      familiarity: clamp(Number(progress.familiarity) || 0, 0, SELF_PRACTICE_CAP),
      combatExperience: Math.max(0, Number(progress.combatExperience) || 0),
      techniques: Array.isArray(progress.techniques) ? progress.techniques : []
    };
  }

  function timingScale(state) {
    const progress = getSwordProgress(state);
    const familiarityRatio = progress.familiarity / SELF_PRACTICE_CAP;
    const combatRatio = clamp(progress.combatExperience / 250, 0, 1);
    const trainedSword = Boolean(
      state
      && Array.isArray(state.practicedSkills)
      && state.practicedSkills.includes('Sword')
    );
    const trainedCredit = trainedSword ? 0.12 : 0;
    return clamp(
      MAX_TIMING_SCALE
      - (familiarityRatio * 0.46)
      - (combatRatio * 0.18)
      - trainedCredit,
      MIN_TIMING_SCALE,
      MAX_TIMING_SCALE
    );
  }

  function staminaMultiplier(state) {
    const progress = getSwordProgress(state);
    const familiarityRatio = progress.familiarity / SELF_PRACTICE_CAP;
    return 1.28 - (familiarityRatio * 0.24);
  }

  function attackTiming(state, attack) {
    const scale = timingScale(state);
    return {
      durationMs: Math.round(attack.baseDurationMs * scale),
      staminaCost: Math.max(1, Math.round(attack.staminaCost * staminaMultiplier(state))),
      activeStart: attack.activeStart,
      activeEnd: attack.activeEnd
    };
  }

  function sampleAttack(attack, progress) {
    const p = clamp(progress, 0, 1);
    const windupEnd = attack.activeStart;
    const followEnd = Math.min(0.84, attack.activeEnd + 0.18);

    let angle;
    let extension = 0;
    let lean = 0;
    let leanDeg = 0;

    if (p < windupEnd) {
      const t = smoothstep(p / windupEnd);
      angle = lerp(28, attack.startAngle, t);
      lean = lerp(0, -attack.leanPx * 0.25, t);
      leanDeg = lerp(0, -attack.leanDeg * 0.35, t);
    } else if (p < attack.activeEnd) {
      const t = smoothstep((p - windupEnd) / (attack.activeEnd - windupEnd));
      angle = lerp(attack.startAngle, attack.contactAngle, t);
      lean = lerp(-attack.leanPx * 0.25, attack.leanPx, t);
      leanDeg = lerp(-attack.leanDeg * 0.35, attack.leanDeg, t);
      if (attack.thrustExtensionPx) extension = lerp(0, attack.thrustExtensionPx, t);
    } else if (p < followEnd) {
      const t = smoothstep((p - attack.activeEnd) / (followEnd - attack.activeEnd));
      angle = lerp(attack.contactAngle, attack.endAngle, t);
      lean = lerp(attack.leanPx, attack.leanPx * 0.55, t);
      leanDeg = lerp(attack.leanDeg, attack.leanDeg * 0.4, t);
      if (attack.thrustExtensionPx) extension = lerp(attack.thrustExtensionPx, 8, t);
    } else {
      const t = smoothstep((p - followEnd) / (1 - followEnd));
      angle = lerp(attack.endAngle, 28, t);
      lean = lerp(attack.leanPx * 0.55, 0, t);
      leanDeg = lerp(attack.leanDeg * 0.4, 0, t);
      if (attack.thrustExtensionPx) extension = lerp(8, 0, t);
    }

    return {
      angle,
      extension,
      lean,
      leanDeg,
      active: p >= attack.activeStart && p <= attack.activeEnd
    };
  }

  window.AvendorCombatEngine = Object.freeze({
    ATTACKS,
    SELF_PRACTICE_CAP,
    clamp,
    attackTiming,
    getSwordProgress,
    timingScale,
    staminaMultiplier,
    sampleAttack
  });
})();
