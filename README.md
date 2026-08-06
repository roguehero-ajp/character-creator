/**
 * My RPG Source - Codex Data Layer
 * --------------------------------
 * Loads the versioned Codex manifest and normalizes collection files into one
 * game-system and edition-aware entry model. This file deliberately contains
 * no page rendering so the standalone Codex and builder drawer can share it.
 */

(() => {
  'use strict';

  const MANIFEST_URL = 'data/codex/manifest.json';
  const DEFAULT_ENTRY_TYPES = ['rule', 'ancestry', 'background', 'feat', 'equipment', 'spell', 'item'];
  const jsonCache = new Map();

  async function fetchJson(url) {
    if (!jsonCache.has(url)) {
      jsonCache.set(
        url,
        fetch(url, { cache: 'no-cache' }).then((response) => {
          if (!response.ok) {
            throw new Error(`Codex data request failed for ${url} (${response.status}).`);
          }

          return response.json();
        })
      );
    }

    return jsonCache.get(url);
  }

  function getGameSystem(manifest, gameSystemId) {
    return (manifest?.gameSystems || []).find((system) => system.id === gameSystemId) || null;
  }

  function getEdition(gameSystem, editionId) {
    return (gameSystem?.editions || []).find((edition) => edition.id === editionId) || null;
  }

  function createGlobalId(gameSystemId, editionId, entryType, localId) {
    return [gameSystemId, editionId, entryType, localId].join(':');
  }

  function normalizeV2Entries(payload, collection, gameSystem, edition) {
    if (
      payload?.schemaVersion !== 2 ||
      !Array.isArray(payload.entries) ||
      payload.gameSystem !== gameSystem.id ||
      payload.edition !== edition.id
    ) {
      throw new Error(`Invalid Codex v2 payload for ${collection.id}.`);
    }

    const allowedTypes = new Set(collection.entryTypes || payload.entryTypes || []);
    const fallbackType = allowedTypes.size === 1 ? Array.from(allowedTypes)[0] : null;
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    const categoryGroups = {};

    allowedTypes.forEach((entryType) => {
      categoryGroups[entryType] = categories;
    });

    const entries = payload.entries
      .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string')
      .map((entry) => {
        const entryType = entry.entryType || fallbackType;

        if (!entryType || !allowedTypes.has(entryType)) {
          throw new Error(`${collection.id} contains an unsupported entry type.`);
        }

        return {
          ...entry,
          localId: entry.id,
          globalId: createGlobalId(gameSystem.id, edition.id, entryType, entry.id),
          name: entry.title,
          type: entryType,
          entryType,
          gameSystem: gameSystem.id,
          gameSystemName: gameSystem.name,
          edition: edition.id,
          editionName: edition.name,
          source: entry.sourceDocument || payload.sourceDocument || edition.source,
          sourceType: entry.sourceType || 'original-explanation',
          collectionId: collection.id,
        };
      });

    return { entries, categories, categoryGroups };
  }

  function normalizeLegacySrdEntries(payload, collection, gameSystem, edition) {
    if (!payload || !Array.isArray(payload.entries)) {
      throw new Error(`Invalid legacy SRD payload for ${collection.id}.`);
    }

    const allowedTypes = new Set(collection.entryTypes || []);

    const entries = payload.entries
      .filter((entry) => {
        return (
          entry &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          entry.edition === edition.id &&
          allowedTypes.has(entry.type)
        );
      })
      .map((entry) => ({
        ...entry,
        localId: entry.id,
        globalId: createGlobalId(gameSystem.id, edition.id, entry.type, entry.id),
        entryType: entry.type,
        gameSystem: gameSystem.id,
        gameSystemName: gameSystem.name,
        editionName: edition.name,
        sourceType: 'licensed-srd-text',
        collectionId: collection.id,
      }));

    return { entries, categories: [], categoryGroups: {} };
  }

  async function loadCollection(collection, gameSystem, edition) {
    const payload = await fetchJson(collection.url);

    if (collection.adapter === 'codex-v2') {
      return normalizeV2Entries(payload, collection, gameSystem, edition);
    }

    if (collection.adapter === 'legacy-srd') {
      return normalizeLegacySrdEntries(payload, collection, gameSystem, edition);
    }

    throw new Error(`Unsupported Codex adapter: ${collection.adapter || 'not specified'}.`);
  }

  async function loadManifest() {
    const manifest = await fetchJson(MANIFEST_URL);

    if (manifest?.schemaVersion !== 2 || !Array.isArray(manifest.gameSystems)) {
      throw new Error('The Codex manifest is missing or uses an unsupported schema.');
    }

    return manifest;
  }

  async function loadEntries(options = {}) {
    const manifest = await loadManifest();
    const gameSystemId = options.gameSystem || manifest.defaultGameSystem;
    const gameSystem = getGameSystem(manifest, gameSystemId);

    if (!gameSystem) {
      throw new Error(`Unknown Codex game system: ${gameSystemId}.`);
    }

    const requestedEditionIds = Array.isArray(options.editions) && options.editions.length
      ? options.editions
      : (gameSystem.editions || []).map((edition) => edition.id);

    const requestedTypes = new Set(
      Array.isArray(options.entryTypes) && options.entryTypes.length
        ? options.entryTypes
        : DEFAULT_ENTRY_TYPES
    );

    const selectedEditions = requestedEditionIds
      .map((editionId) => getEdition(gameSystem, editionId))
      .filter(Boolean);

    const jobs = [];

    selectedEditions.forEach((edition) => {
      (edition.collections || []).forEach((collection) => {
        const collectionTypes = collection.entryTypes || [];
        const isRelevant = collectionTypes.some((entryType) => requestedTypes.has(entryType));

        if (isRelevant) {
          jobs.push(loadCollection(collection, gameSystem, edition));
        }
      });
    });

    const results = await Promise.all(jobs);
    const entries = [];
    const categoryMapsByType = new Map();

    results.forEach((result) => {
      result.entries.forEach((entry) => {
        if (requestedTypes.has(entry.entryType)) {
          entries.push(entry);
        }
      });

      Object.entries(result.categoryGroups || {}).forEach(([entryType, categories]) => {
        if (!categoryMapsByType.has(entryType)) {
          categoryMapsByType.set(entryType, new Map());
        }

        const map = categoryMapsByType.get(entryType);
        categories.forEach((category) => {
          if (!map.has(category.id)) {
            map.set(category.id, category);
          }
        });
      });
    });

    const categoryGroups = {};
    categoryMapsByType.forEach((categoryMap, entryType) => {
      categoryGroups[entryType] = Array.from(categoryMap.values());
    });

    return {
      manifest,
      gameSystem,
      editions: selectedEditions,
      categories: categoryGroups.rule || [],
      categoryGroups,
      entries,
    };
  }

  function clearCache() {
    jsonCache.clear();
  }

  window.MyRPGCodexData = Object.freeze({
    loadManifest,
    loadEntries,
    getGameSystem,
    getEdition,
    createGlobalId,
    clearCache,
  });
})();
