/**
 * My RPG Source - Ability Score Builder
 * --------------------------------------
 *
 * Adds:
 *  - Manual base-score entry
 *  - Standard Array
 *  - 4d6, drop the lowest
 *  - 3d6 house-rule generation
 *  - Drag, drop, tap, and keyboard score assignment
 *  - Official 27-point Point Buy
 *  - Persistent base scores that remain separate from
 *    Race and Background bonuses
 *
 * This module deliberately takes control of #roll-btn before
 * the older ui.js click handler runs. No ui.js rewrite is needed.
 */

(() => {
  'use strict';

  const calc =
    window.CharacterCalculations;

  const STAT_IDS =
    calc?.STAT_INPUTS ||
    [
      'str',
      'dex',
      'con',
      'int',
      'wis',
      'cha'
    ];

  const STAT_LABELS =
    Object.freeze({
      str:
        'Strength',

      dex:
        'Dexterity',

      con:
        'Constitution',

      int:
        'Intelligence',

      wis:
        'Wisdom',

      cha:
        'Charisma'
    });

  const STANDARD_ARRAY =
    Object.freeze([
      15,
      14,
      13,
      12,
      10,
      8
    ]);

  const POINT_BUY_COSTS =
    Object.freeze({
      8:
        0,

      9:
        1,

      10:
        2,

      11:
        3,

      12:
        4,

      13:
        5,

      14:
        7,

      15:
        9
    });

  const STATE_VERSION = 1;

  const state = {
    method:
      'manual',

    pool: [],

    assignments:
      createEmptyAssignments(),

    selectedTokenId:
      '',

    previousMethod:
      'manual',

    pointBuyDraft:
      createPointBuyScores(),

    initialized:
      false,

    manualTimer:
      null
  };


  /* ========================================================
     SMALL HELPERS
     ======================================================== */

  function createEmptyAssignments() {
    return Object.fromEntries(
      STAT_IDS.map(
        (stat) => [
          stat,
          null
        ]
      )
    );
  }


  function createPointBuyScores() {
    return Object.fromEntries(
      STAT_IDS.map(
        (stat) => [
          stat,
          8
        ]
      )
    );
  }


  function number(
    value,
    fallback = 10
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;
  }


  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }


  function safeJsonParse(
    value,
    fallback
  ) {
    try {
      return JSON.parse(
        value
      );
    } catch (_) {
      return fallback;
    }
  }


  function getElements() {
    return {
      document:
        document.getElementById(
          'character-document'
        ),

      statsGrid:
        document.querySelector(
          '.stats-grid'
        ),

      methodSelect:
        document.getElementById(
          'stat-method'
        ),

      actionButton:
        document.getElementById(
          'roll-btn'
        ),

      workspace:
        document.getElementById(
          'ability-score-workspace'
        ),

      tray:
        document.getElementById(
          'ability-score-tray'
        ),

      tokenList:
        document.getElementById(
          'ability-score-token-list'
        ),

      trayMessage:
        document.getElementById(
          'ability-score-tray-message'
        ),

      clearButton:
        document.getElementById(
          'ability-score-clear-btn'
        ),

      hiddenState:
        document.getElementById(
          'ability-score-state'
        ),

      pointBuyBackdrop:
        document.getElementById(
          'point-buy-backdrop'
        ),

      pointBuyRemaining:
        document.getElementById(
          'point-buy-remaining'
        ),

      pointBuyMessage:
        document.getElementById(
          'point-buy-message'
        ),

      pointBuyOk:
        document.getElementById(
          'point-buy-ok'
        ),

      pointBuyCancel:
        document.getElementById(
          'point-buy-cancel'
        ),

      pointBuyReset:
        document.getElementById(
          'point-buy-reset'
        )
    };
  }


  function getStatInput(
    stat
  ) {
    return document.getElementById(
      stat
    );
  }


  function getBaseInput(
    stat
  ) {
    return document.getElementById(
      `base-${stat}`
    );
  }


  function getToken(
    tokenId
  ) {
    return state.pool.find(
      (token) =>
        token.id === tokenId
    ) || null;
  }


  function getAssignedStat(
    tokenId
  ) {
    return (
      STAT_IDS.find(
        (stat) =>
          state.assignments[
            stat
          ] === tokenId
      ) ||
      ''
    );
  }


  function getBaseScores() {
    return Object.fromEntries(
      STAT_IDS.map(
        (stat) => {
          const hidden =
            getBaseInput(
              stat
            );

          const visible =
            getStatInput(
              stat
            );

          return [
            stat,
            number(
              hidden?.value ??
              visible?.dataset?.base ??
              visible?.value,
              10
            )
          ];
        }
      )
    );
  }


  /* ========================================================
     DOM CONSTRUCTION
     ======================================================== */

  function createWorkspace() {
    const elements =
      getElements();

    if (
      !elements.statsGrid ||
      !elements.document
    ) {
      return false;
    }

    if (
      document.getElementById(
        'ability-score-workspace'
      )
    ) {
      return true;
    }

    const workspace =
      document.createElement(
        'div'
      );

    workspace.id =
      'ability-score-workspace';

    workspace.className =
      'ability-score-workspace';

    const tray =
      document.createElement(
        'aside'
      );

    tray.id =
      'ability-score-tray';

    tray.className =
      'ability-score-tray';

    tray.hidden =
      true;

    tray.setAttribute(
      'aria-label',
      'Available ability scores'
    );

    tray.innerHTML = `
      <div class="ability-score-tray-title">
        Available Scores
      </div>

      <div
        id="ability-score-token-list"
        class="ability-score-token-list"
      ></div>

      <div
        id="ability-score-tray-message"
        class="ability-score-tray-message"
      ></div>

      <button
        type="button"
        id="ability-score-clear-btn"
        class="ability-score-clear-btn"
      >
        Clear
      </button>
    `;

    elements.statsGrid
      .parentNode
      .insertBefore(
        workspace,
        elements.statsGrid
      );

    workspace.appendChild(
      tray
    );

    workspace.appendChild(
      elements.statsGrid
    );

    createHiddenStorage(
      workspace
    );

    createPointBuyModal();

    return true;
  }


  function createHiddenStorage(
    workspace
  ) {
    const storage =
      document.createElement(
        'div'
      );

    storage.className =
      'ability-score-hidden-storage';

    storage.setAttribute(
      'aria-hidden',
      'true'
    );

    STAT_IDS.forEach(
      (stat) => {
        const visible =
          getStatInput(
            stat
          );

        const initialBase =
          number(
            visible?.dataset?.base ??
            visible?.value,
            10
          );

        const hidden =
          document.createElement(
            'input'
          );

        hidden.type =
          'hidden';

        hidden.id =
          `base-${stat}`;

        hidden.value =
          String(
            initialBase
          );

        storage.appendChild(
          hidden
        );

        if (visible) {
          visible.dataset.base =
            String(
              initialBase
            );
        }
      }
    );

    const hiddenState =
      document.createElement(
        'input'
      );

    hiddenState.type =
      'hidden';

    hiddenState.id =
      'ability-score-state';

    hiddenState.value =
      JSON.stringify(
        serializeState()
      );

    storage.appendChild(
      hiddenState
    );

    /*
     * Keep hidden storage after the visible stat fields.
     * During save restoration, the final hidden base values
     * therefore win over temporarily restored displayed scores.
     */
    workspace.appendChild(
      storage
    );
  }


  function createPointBuyModal() {
    if (
      document.getElementById(
        'point-buy-backdrop'
      )
    ) {
      return;
    }

    const backdrop =
      document.createElement(
        'div'
      );

    backdrop.id =
      'point-buy-backdrop';

    backdrop.className =
      'point-buy-backdrop';

    backdrop.hidden =
      true;

    backdrop.innerHTML = `
      <section
        class="point-buy-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-buy-title"
        aria-describedby="point-buy-description"
      >
        <header class="point-buy-header">
          <div>
            <h2 id="point-buy-title">
              27-Point Buy
            </h2>

            <p id="point-buy-description">
              Choose a base score from 8 to 15 for each ability.
            </p>
          </div>

          <div class="point-buy-counter">
            <span>Points Remaining</span>

            <strong id="point-buy-remaining">
              27
            </strong>
          </div>
        </header>

        <div class="point-buy-rows">
          ${
            STAT_IDS.map(
              (stat) => `
                <div
                  class="point-buy-row"
                  data-point-buy-stat="${stat}"
                >
                  <span class="point-buy-label">
                    ${STAT_LABELS[stat]}
                  </span>

                  <button
                    type="button"
                    class="point-buy-step"
                    data-point-buy-action="decrease"
                    data-point-buy-stat="${stat}"
                    aria-label="Decrease ${STAT_LABELS[stat]}"
                  >
                    −
                  </button>

                  <output
                    id="point-buy-value-${stat}"
                    class="point-buy-value"
                    for="point-buy-minus-${stat} point-buy-plus-${stat}"
                  >
                    8
                  </output>

                  <button
                    type="button"
                    class="point-buy-step"
                    data-point-buy-action="increase"
                    data-point-buy-stat="${stat}"
                    aria-label="Increase ${STAT_LABELS[stat]}"
                  >
                    +
                  </button>

                  <span
                    id="point-buy-cost-${stat}"
                    class="point-buy-cost"
                  >
                    Cost: 0
                  </span>
                </div>
              `
            ).join('')
          }
        </div>

        <div
          id="point-buy-message"
          class="point-buy-message"
          aria-live="polite"
        ></div>

        <footer class="point-buy-actions">
          <button
            type="button"
            id="point-buy-reset"
            class="point-buy-secondary"
          >
            Reset to 8
          </button>

          <span class="point-buy-action-spacer"></span>

          <button
            type="button"
            id="point-buy-cancel"
            class="point-buy-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            id="point-buy-ok"
            class="point-buy-primary"
          >
            OK
          </button>
        </footer>
      </section>
    `;

    document.body.appendChild(
      backdrop
    );
  }


  /* ========================================================
     PERSISTENT BASE SCORES
     ======================================================== */

  function serializeState() {
    return {
      version:
        STATE_VERSION,

      method:
        state.method,

      pool:
        state.pool,

      assignments:
        state.assignments
    };
  }


  function persistState({
    notify =
      true
  } = {}) {
    const hidden =
      getElements()
        .hiddenState;

    if (!hidden) {
      return;
    }

    hidden.value =
      JSON.stringify(
        serializeState()
      );

    if (notify) {
      hidden.dispatchEvent(
        new Event(
          'change',
          {
            bubbles:
              true
          }
        )
      );
    }
  }


  function setBaseScore(
    stat,
    value,
    {
      notify =
        true
    } = {}
  ) {
    const cleanValue =
      number(
        value,
        10
      );

    const visible =
      getStatInput(
        stat
      );

    const hidden =
      getBaseInput(
        stat
      );

    if (visible) {
      visible.dataset.base =
        String(
          cleanValue
        );
    }

    if (hidden) {
      hidden.value =
        String(
          cleanValue
        );

      if (notify) {
        hidden.dispatchEvent(
          new Event(
            'change',
            {
              bubbles:
                true
            }
          )
        );
      }
    }
  }


  function setBaseScores(
    scores,
    {
      notify =
        true
    } = {}
  ) {
    STAT_IDS.forEach(
      (stat) => {
        setBaseScore(
          stat,
          scores[
            stat
          ],
          {
            notify:
              false
          }
        );
      }
    );

    if (notify) {
      const hidden =
        getBaseInput(
          STAT_IDS[0]
        );

      hidden?.dispatchEvent(
        new Event(
          'change',
          {
            bubbles:
              true
          }
        )
      );
    }
  }


  function syncBaseInputsToDatasets() {
    STAT_IDS.forEach(
      (stat) => {
        const hidden =
          getBaseInput(
            stat
          );

        const visible =
          getStatInput(
            stat
          );

        if (
          hidden &&
          visible
        ) {
          visible.dataset.base =
            String(
              number(
                hidden.value,
                10
              )
            );
        }
      }
    );
  }


  /* ========================================================
     EXISTING RULE ENGINE BRIDGE
     ======================================================== */

  function reapplyCharacterRules() {
    syncBaseInputsToDatasets();

    const origins =
      window.CharacterOrigins;

    const backgrounds =
      window.CharacterBackgrounds;

    if (
      origins?.active &&
      typeof origins
        .applyOriginRules ===
        'function'
    ) {
      /*
       * In 2024 mode, origins.js dispatches
       * character:origin-applied and backgrounds.js then
       * reapplies the active Background bonuses.
       */
      origins.applyOriginRules();
    } else {
      STAT_IDS.forEach(
        (stat) => {
          const input =
            getStatInput(
              stat
            );

          if (input) {
            input.value =
              String(
                number(
                  input.dataset.base,
                  10
                )
              );
          }
        }
      );

      if (
        backgrounds?.active &&
        typeof backgrounds
          .applyBackgroundRules ===
          'function'
      ) {
        backgrounds.applyBackgroundRules({
          resetScores:
            false
        });
      } else {
        calc?.refreshAll?.();
      }
    }

    calc?.refreshAll?.();

    document.dispatchEvent(
      new CustomEvent(
        'character:base-scores-changed',
        {
          detail: {
            method:
              state.method,

            baseScores:
              getBaseScores()
          }
        }
      )
    );
  }


  /* ========================================================
     DICE AND SCORE POOLS
     ======================================================== */

  function rollDice(
    count,
    sides
  ) {
    return Array.from(
      {
        length:
          count
      },
      () =>
        Math.floor(
          Math.random() *
          sides
        ) + 1
    );
  }


  function roll4d6DropLowest() {
    const rolls =
      rollDice(
        4,
        6
      ).sort(
        (a, b) =>
          a - b
      );

    return rolls
      .slice(1)
      .reduce(
        (
          total,
          value
        ) =>
          total +
          value,
        0
      );
  }


  function roll3d6() {
    return rollDice(
      3,
      6
    ).reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    );
  }


  function createPool(
    values,
    method
  ) {
    state.method =
      method;

    state.pool =
      values
        .map(
          (
            value,
            index
          ) => ({
            id:
              `${method}-${Date.now()}-${index}`,

            value:
              number(
                value,
                10
              )
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            second.value -
            first.value
        );

    state.assignments =
      createEmptyAssignments();

    state.selectedTokenId =
      '';

    setBaseScores(
      Object.fromEntries(
        STAT_IDS.map(
          (stat) => [
            stat,
            10
          ]
        )
      )
    );

    persistState();

    configureModeUi();
    renderTray();
    reapplyCharacterRules();
  }


  function generateForMethod(
    method
  ) {
    if (
      method ===
      'standard-array'
    ) {
      createPool(
        STANDARD_ARRAY,
        method
      );

      return;
    }

    if (
      method ===
      '4d6'
    ) {
      createPool(
        Array.from(
          {
            length:
              6
          },
          roll4d6DropLowest
        ),
        method
      );

      return;
    }

    if (
      method ===
      '3d6'
    ) {
      createPool(
        Array.from(
          {
            length:
              6
          },
          roll3d6
        ),
        method
      );
    }
  }


  /* ========================================================
     SCORE ASSIGNMENT
     ======================================================== */

  function assignTokenToStat(
    tokenId,
    targetStat
  ) {
    const token =
      getToken(
        tokenId
      );

    if (
      !token ||
      !STAT_IDS.includes(
        targetStat
      )
    ) {
      return;
    }

    const sourceStat =
      getAssignedStat(
        tokenId
      );

    const displacedTokenId =
      state.assignments[
        targetStat
      ];

    if (
      sourceStat ===
      targetStat
    ) {
      state.selectedTokenId =
        '';

      renderTray();

      return;
    }

    state.assignments[
      targetStat
    ] =
      tokenId;

    setBaseScore(
      targetStat,
      token.value
    );

    if (sourceStat) {
      if (
        displacedTokenId &&
        displacedTokenId !==
          tokenId
      ) {
        const displacedToken =
          getToken(
            displacedTokenId
          );

        state.assignments[
          sourceStat
        ] =
          displacedTokenId;

        setBaseScore(
          sourceStat,
          displacedToken?.value ??
          10
        );
      } else {
        state.assignments[
          sourceStat
        ] =
          null;

        setBaseScore(
          sourceStat,
          10
        );
      }
    }

    state.selectedTokenId =
      '';

    persistState();
    renderTray();
    reapplyCharacterRules();
  }


  function unassignToken(
    tokenId
  ) {
    const stat =
      getAssignedStat(
        tokenId
      );

    if (!stat) {
      return;
    }

    state.assignments[
      stat
    ] =
      null;

    setBaseScore(
      stat,
      10
    );

    state.selectedTokenId =
      '';

    persistState();
    renderTray();
    reapplyCharacterRules();
  }


  function clearAssignments() {
    state.assignments =
      createEmptyAssignments();

    state.selectedTokenId =
      '';

    setBaseScores(
      Object.fromEntries(
        STAT_IDS.map(
          (stat) => [
            stat,
            10
          ]
        )
      )
    );

    persistState();
    renderTray();
    reapplyCharacterRules();
  }


  /* ========================================================
     SCORE TRAY RENDERING
     ======================================================== */

  function renderTray() {
    const elements =
      getElements();

    if (
      !elements.tokenList ||
      !elements.trayMessage
    ) {
      return;
    }

    elements.tokenList
      .replaceChildren();

    state.pool.forEach(
      (token) => {
        const assignedStat =
          getAssignedStat(
            token.id
          );

        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'ability-score-token';

        button.draggable =
          true;

        button.dataset.tokenId =
          token.id;

        button.setAttribute(
          'aria-pressed',
          state.selectedTokenId ===
            token.id
            ? 'true'
            : 'false'
        );

        if (assignedStat) {
          button.classList.add(
            'assigned'
          );
        }

        if (
          state.selectedTokenId ===
          token.id
        ) {
          button.classList.add(
            'selected'
          );
        }

        button.innerHTML = `
          <strong>
            ${token.value}
          </strong>

          <span>
            ${
              assignedStat
                ? STAT_LABELS[
                    assignedStat
                  ].slice(
                    0,
                    3
                  ).toUpperCase()
                : 'Free'
            }
          </span>
        `;

        button.title =
          assignedStat
            ? `Assigned to ${STAT_LABELS[assignedStat]}. Click twice to return it, or drag it to another ability.`
            : 'Drag this score onto an ability, or click it and then click an ability.';

        button.addEventListener(
          'dragstart',
          (event) => {
            event.dataTransfer
              ?.setData(
                'text/plain',
                token.id
              );

            if (
              event.dataTransfer
            ) {
              event.dataTransfer
                .effectAllowed =
                'move';
            }

            state.selectedTokenId =
              token.id;

            renderTray();
          }
        );

        button.addEventListener(
          'click',
          () => {
            if (
              state.selectedTokenId ===
              token.id
            ) {
              if (assignedStat) {
                unassignToken(
                  token.id
                );
              } else {
                state.selectedTokenId =
                  '';

                renderTray();
              }

              return;
            }

            state.selectedTokenId =
              token.id;

            renderTray();
          }
        );

        button.addEventListener(
          'keydown',
          (event) => {
            if (
              (
                event.key ===
                  'Backspace' ||
                event.key ===
                  'Delete'
              ) &&
              assignedStat
            ) {
              event.preventDefault();

              unassignToken(
                token.id
              );
            }
          }
        );

        elements.tokenList
          .appendChild(
            button
          );
      }
    );

    const assignedCount =
      Object.values(
        state.assignments
      ).filter(Boolean)
        .length;

    if (
      state.pool.length ===
      0
    ) {
      elements.trayMessage
        .textContent =
        'Generate six scores, then assign them.';
    } else if (
      assignedCount ===
      STAT_IDS.length
    ) {
      elements.trayMessage
        .textContent =
        'All six scores assigned.';
    } else if (
      state.selectedTokenId
    ) {
      elements.trayMessage
        .textContent =
        'Now click an ability score.';
    } else {
      elements.trayMessage
        .textContent =
        `${assignedCount} of 6 assigned.`;
    }

    markDropTargets();
  }


  function markDropTargets() {
    STAT_IDS.forEach(
      (stat) => {
        const input =
          getStatInput(
            stat
          );

        const row =
          input?.closest(
            '.stat-row'
          );

        if (!row) {
          return;
        }

        const tokenId =
          state.assignments[
            stat
          ];

        row.classList.toggle(
          'score-assigned',
          Boolean(tokenId)
        );

        row.classList.toggle(
          'score-drop-ready',
          Boolean(
            state.selectedTokenId
          )
        );

        row.dataset.assignedTokenId =
          tokenId ||
          '';
      }
    );
  }


  function bindDropTargets() {
    STAT_IDS.forEach(
      (stat) => {
        const input =
          getStatInput(
            stat
          );

        const row =
          input?.closest(
            '.stat-row'
          );

        if (
          !input ||
          !row ||
          row.dataset
            .abilityDropBound ===
            'true'
        ) {
          return;
        }

        row.dataset
          .abilityDropBound =
          'true';

        row.addEventListener(
          'dragover',
          (event) => {
            if (
              state.method ===
                'standard-array' ||
              state.method ===
                '4d6' ||
              state.method ===
                '3d6'
            ) {
              event.preventDefault();

              row.classList.add(
                'drag-over'
              );
            }
          }
        );

        row.addEventListener(
          'dragleave',
          () => {
            row.classList.remove(
              'drag-over'
            );
          }
        );

        row.addEventListener(
          'drop',
          (event) => {
            event.preventDefault();

            row.classList.remove(
              'drag-over'
            );

            const tokenId =
              event.dataTransfer
                ?.getData(
                  'text/plain'
                ) ||
              state.selectedTokenId;

            assignTokenToStat(
              tokenId,
              stat
            );
          }
        );

        row.addEventListener(
          'click',
          (event) => {
            if (
              !state.selectedTokenId ||
              state.method ===
                'manual' ||
              state.method ===
                'point-buy'
            ) {
              return;
            }

            if (
              event.target.closest(
                '.codex-info-btn'
              )
            ) {
              return;
            }

            assignTokenToStat(
              state.selectedTokenId,
              stat
            );
          }
        );
      }
    );
  }


  /* ========================================================
     POINT BUY
     ======================================================== */

  function calculatePointBuyCost(
    scores
  ) {
    return STAT_IDS.reduce(
      (
        total,
        stat
      ) =>
        total +
        (
          POINT_BUY_COSTS[
            scores[
              stat
            ]
          ] ??
          0
        ),
      0
    );
  }


  function getPointBuyStartingScores() {
    const current =
      getBaseScores();

    const valid =
      STAT_IDS.every(
        (stat) =>
          current[
            stat
          ] >= 8 &&
          current[
            stat
          ] <= 15 &&
          Number.isInteger(
            current[
              stat
            ]
          )
      ) &&
      calculatePointBuyCost(
        current
      ) <= 27;

    return valid
      ? current
      : createPointBuyScores();
  }


  function renderPointBuy() {
    const elements =
      getElements();

    const spent =
      calculatePointBuyCost(
        state.pointBuyDraft
      );

    const remaining =
      27 -
      spent;

    if (
      elements
        .pointBuyRemaining
    ) {
      elements
        .pointBuyRemaining
        .textContent =
        String(
          remaining
        );

      elements
        .pointBuyRemaining
        .dataset
        .status =
        remaining === 0
          ? 'complete'
          : 'remaining';
    }

    STAT_IDS.forEach(
      (stat) => {
        const value =
          state.pointBuyDraft[
            stat
          ];

        const valueOutput =
          document.getElementById(
            `point-buy-value-${stat}`
          );

        const costOutput =
          document.getElementById(
            `point-buy-cost-${stat}`
          );

        const decrease =
          document.querySelector(
            `[data-point-buy-action="decrease"][data-point-buy-stat="${stat}"]`
          );

        const increase =
          document.querySelector(
            `[data-point-buy-action="increase"][data-point-buy-stat="${stat}"]`
          );

        if (valueOutput) {
          valueOutput.textContent =
            String(
              value
            );
        }

        if (costOutput) {
          costOutput.textContent =
            `Cost: ${
              POINT_BUY_COSTS[
                value
              ]
            }`;
        }

        if (decrease) {
          decrease.disabled =
            value <= 8;
        }

        if (increase) {
          const nextValue =
            value +
            1;

          const addedCost =
            nextValue <= 15
              ? POINT_BUY_COSTS[
                  nextValue
                ] -
                POINT_BUY_COSTS[
                  value
                ]
              : Infinity;

          increase.disabled =
            value >= 15 ||
            addedCost >
              remaining;
        }
      }
    );

    if (
      elements
        .pointBuyMessage
    ) {
      elements
        .pointBuyMessage
        .textContent =
        remaining === 0
          ? 'All 27 points have been spent.'
          : `${remaining} ${
              remaining === 1
                ? 'point remains'
                : 'points remain'
            } unspent.`;
    }
  }


  function adjustPointBuy(
    stat,
    direction
  ) {
    if (
      !STAT_IDS.includes(
        stat
      )
    ) {
      return;
    }

    const current =
      state.pointBuyDraft[
        stat
      ];

    const next =
      clamp(
        current +
        direction,
        8,
        15
      );

    const draft = {
      ...state.pointBuyDraft,

      [stat]:
        next
    };

    if (
      calculatePointBuyCost(
        draft
      ) >
      27
    ) {
      return;
    }

    state.pointBuyDraft =
      draft;

    renderPointBuy();
  }


  function openPointBuy({
    preservePreviousMethod =
      true
  } = {}) {
    const elements =
      getElements();

    if (
      !elements
        .pointBuyBackdrop
    ) {
      return;
    }

    if (
      preservePreviousMethod
    ) {
      state.previousMethod =
        state.method;
    }

    state.pointBuyDraft =
      state.method ===
        'point-buy'
        ? getPointBuyStartingScores()
        : createPointBuyScores();

    renderPointBuy();

    elements
      .pointBuyBackdrop
      .hidden =
      false;

    document.body.classList.add(
      'point-buy-open'
    );

    window.setTimeout(
      () => {
        document
          .querySelector(
            '.point-buy-step:not(:disabled)'
          )
          ?.focus();
      },
      0
    );
  }


  function closePointBuy() {
    const backdrop =
      getElements()
        .pointBuyBackdrop;

    if (backdrop) {
      backdrop.hidden =
        true;
    }

    document.body.classList.remove(
      'point-buy-open'
    );
  }


  function cancelPointBuy() {
    closePointBuy();

    const methodSelect =
      getElements()
        .methodSelect;

    state.method =
      state.previousMethod ||
      'manual';

    if (methodSelect) {
      methodSelect.value =
        state.method;
    }

    configureModeUi();
    persistState();
  }


  function commitPointBuy() {
    state.method =
      'point-buy';

    state.pool = [];

    state.assignments =
      createEmptyAssignments();

    state.selectedTokenId =
      '';

    setBaseScores(
      state.pointBuyDraft
    );

    const methodSelect =
      getElements()
        .methodSelect;

    if (methodSelect) {
      methodSelect.value =
        'point-buy';
    }

    persistState();
    closePointBuy();
    configureModeUi();
    renderTray();
    reapplyCharacterRules();
  }


  function bindPointBuyControls() {
    const elements =
      getElements();

    elements
      .pointBuyBackdrop
      ?.querySelectorAll(
        '[data-point-buy-action]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              const direction =
                button.dataset
                  .pointBuyAction ===
                'increase'
                  ? 1
                  : -1;

              adjustPointBuy(
                button.dataset
                  .pointBuyStat,
                direction
              );
            }
          );
        }
      );

    elements
      .pointBuyReset
      ?.addEventListener(
        'click',
        () => {
          state.pointBuyDraft =
            createPointBuyScores();

          renderPointBuy();
        }
      );

    elements
      .pointBuyCancel
      ?.addEventListener(
        'click',
        cancelPointBuy
      );

    elements
      .pointBuyOk
      ?.addEventListener(
        'click',
        commitPointBuy
      );

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key ===
            'Escape' &&
          !getElements()
            .pointBuyBackdrop
            ?.hidden
        ) {
          event.preventDefault();

          cancelPointBuy();
        }
      }
    );
  }


  /* ========================================================
     MODE CONTROLS
     ======================================================== */

  function getActionButtonText(
    method
  ) {
    const labels = {
      manual:
        'Manual Mode Active',

      'standard-array':
        'Reset Standard Array',

      '4d6':
        'Roll Six 4d6 Scores',

      '3d6':
        'Roll Six 3d6 Scores',

      'point-buy':
        'Open 27-Point Buy'
    };

    return (
      labels[
        method
      ] ||
      'Generate Scores'
    );
  }


  function configureModeUi() {
    const elements =
      getElements();

    const poolMode =
      [
        'standard-array',
        '4d6',
        '3d6'
      ].includes(
        state.method
      );

    if (elements.tray) {
      elements.tray.hidden =
        !poolMode;
    }

    STAT_IDS.forEach(
      (stat) => {
        const input =
          getStatInput(
            stat
          );

        if (!input) {
          return;
        }

        input.readOnly =
          state.method !==
          'manual';

        input.classList.toggle(
          'ability-score-drop-target',
          poolMode
        );

        input.setAttribute(
          'aria-readonly',
          input.readOnly
            ? 'true'
            : 'false'
        );
      }
    );

    if (
      elements
        .actionButton
    ) {
      elements
        .actionButton
        .textContent =
        getActionButtonText(
          state.method
        );

      elements
        .actionButton
        .disabled =
        state.method ===
        'manual';
    }

    if (
      elements
        .methodSelect &&
      elements
        .methodSelect
        .value !==
        state.method
    ) {
      elements
        .methodSelect
        .value =
        state.method;
    }

    renderTray();
  }


  function handleMethodChange(
    event
  ) {
    const requested =
      event.target.value;

    /*
     * storage.js dispatches synthetic change events while loading.
     * Do not generate, reset, or overwrite saved score data during
     * that restoration pass. character:restored rebuilds the UI
     * from the saved hidden fields afterward.
     */
    if (!event.isTrusted) {
      state.method =
        requested;

      configureModeUi();

      return;
    }

    if (
      requested ===
      'point-buy'
    ) {
      state.previousMethod =
        state.method;

      if (
        event.isTrusted
      ) {
        openPointBuy({
          preservePreviousMethod:
            false
        });

        return;
      }

      state.method =
        'point-buy';

      configureModeUi();
      persistState({
        notify:
          false
      });

      return;
    }

    state.method =
      requested;

    state.selectedTokenId =
      '';

    if (
      requested ===
      'standard-array'
    ) {
      generateForMethod(
        requested
      );

      return;
    }

    if (
      requested ===
      'manual'
    ) {
      /*
       * Keep the existing base scores and simply unlock them.
       */
      configureModeUi();
      persistState();
      reapplyCharacterRules();

      return;
    }

    /*
     * A dice method waits for the Generate button.
     * Existing scores remain in place until the roll occurs.
     */
    state.pool = [];
    state.assignments =
      createEmptyAssignments();

    configureModeUi();
    persistState();
  }


  function handleActionButton(
    event
  ) {
    /*
     * This capture listener prevents the legacy ui.js and
     * backgrounds.js Roll Stats handlers from also firing.
     */
    event.preventDefault();
    event.stopImmediatePropagation();

    if (
      state.method ===
      'point-buy'
    ) {
      openPointBuy();

      return;
    }

    if (
      [
        'standard-array',
        '4d6',
        '3d6'
      ].includes(
        state.method
      )
    ) {
      generateForMethod(
        state.method
      );
    }
  }


  function bindModeControls() {
    const elements =
      getElements();

    elements
      .methodSelect
      ?.addEventListener(
        'change',
        handleMethodChange
      );

    elements
      .actionButton
      ?.addEventListener(
        'click',
        handleActionButton,
        {
          capture:
            true
        }
      );

    elements
      .clearButton
      ?.addEventListener(
        'click',
        clearAssignments
      );
  }


  /* ========================================================
     MANUAL MODE
     ======================================================== */

  function commitManualInput(
    stat,
    value,
    {
      immediate =
        false
    } = {}
  ) {
    if (
      state.method !==
      'manual'
    ) {
      return;
    }

    setBaseScore(
      stat,
      value
    );

    window.clearTimeout(
      state.manualTimer
    );

    if (immediate) {
      reapplyCharacterRules();

      return;
    }

    state.manualTimer =
      window.setTimeout(
        reapplyCharacterRules,
        180
      );
  }


  function bindManualInputs() {
    STAT_IDS.forEach(
      (stat) => {
        const input =
          getStatInput(
            stat
          );

        if (
          !input ||
          input.dataset
            .abilityScoreBound ===
            'true'
        ) {
          return;
        }

        input.dataset
          .abilityScoreBound =
          'true';

        input.addEventListener(
          'input',
          () => {
            commitManualInput(
              stat,
              input.value
            );
          }
        );

        input.addEventListener(
          'change',
          () => {
            commitManualInput(
              stat,
              input.value,
              {
                immediate:
                  true
              }
            );
          }
        );
      }
    );
  }


  /* ========================================================
     RESTORATION
     ======================================================== */

  function restoreStateFromHidden() {
    const elements =
      getElements();

    const stored =
      safeJsonParse(
        elements
          .hiddenState
          ?.value,
        null
      );

    if (
      stored &&
      typeof stored ===
        'object'
    ) {
      state.method =
        String(
          stored.method ||
          elements
            .methodSelect
            ?.value ||
          'manual'
        );

      state.pool =
        Array.isArray(
          stored.pool
        )
          ? stored.pool
              .map(
                (token) => ({
                  id:
                    String(
                      token.id ||
                      ''
                    ),

                  value:
                    number(
                      token.value,
                      10
                    )
                })
              )
              .filter(
                (token) =>
                  token.id
              )
          : [];

      state.assignments = {
        ...createEmptyAssignments(),

        ...(
          stored.assignments &&
          typeof stored.assignments ===
            'object'
            ? stored.assignments
            : {}
        )
      };
    } else {
      state.method =
        elements
          .methodSelect
          ?.value ||
        'manual';
    }

    syncBaseInputsToDatasets();

    if (
      elements
        .methodSelect
    ) {
      elements
        .methodSelect
        .value =
        state.method;
    }

    configureModeUi();
    renderTray();
  }


  function bindRestoration() {
    document.addEventListener(
      'character:restored',
      () => {
        window.setTimeout(
          () => {
            restoreStateFromHidden();
            reapplyCharacterRules();
          },
          0
        );
      }
    );
  }


  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function init() {
    if (
      state.initialized
    ) {
      return;
    }

    if (
      !createWorkspace()
    ) {
      console.warn(
        'Ability Score Builder could not find the current stats grid.'
      );

      return;
    }

    state.initialized =
      true;

    bindDropTargets();
    bindPointBuyControls();
    bindModeControls();
    bindManualInputs();
    bindRestoration();

    restoreStateFromHidden();
    reapplyCharacterRules();

    document.dispatchEvent(
      new CustomEvent(
        'ability-scores:ready',
        {
          detail: {
            methods: [
              'manual',
              'standard-array',
              '4d6',
              '3d6',
              'point-buy'
            ]
          }
        }
      )
    );
  }


  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.CharacterAbilityScores =
    Object.freeze({
      get method() {
        return state.method;
      },

      get baseScores() {
        return getBaseScores();
      },

      get pool() {
        return state.pool.map(
          (token) => ({
            ...token
          })
        );
      },

      generate:
        generateForMethod,

      openPointBuy,

      clearAssignments,

      reapply:
        reapplyCharacterRules
    });


  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once:
          true
      }
    );
  } else {
    init();
  }

})();
