/**
 * My RPG Source - Privacy-safe analytics events
 * ------------------------------------------------
 * GA4 Measurement ID: G-N3252YKGQX
 *
 * The Google tag itself is installed once in each HTML <head>. This file adds
 * product events without sending character names, notes, ability scores,
 * imported/exported JSON, email addresses, or typed Codex search terms.
 */

(() => {
  'use strict';

  if (document.documentElement.dataset.mrsAnalyticsInitialized === 'true') {
    return;
  }
  document.documentElement.dataset.mrsAnalyticsInitialized = 'true';

  const MEASUREMENT_ID = 'G-N3252YKGQX';
  const MAX_TEXT_LENGTH = 100;
  const seenKnowledgeCards = new WeakSet();
  let codexSearchTimer = null;

  function normalizeText(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_TEXT_LENGTH);
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  function sanitizeParams(params = {}) {
    const sanitized = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      if (typeof value === 'number') {
        if (Number.isFinite(value)) {
          sanitized[key] = value;
        }
        return;
      }

      if (typeof value === 'boolean') {
        sanitized[key] = value;
        return;
      }

      const text = normalizeText(String(value));
      if (text) {
        sanitized[key] = text;
      }
    });

    return sanitized;
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') {
      return;
    }

    const safeEventName = normalizeText(eventName)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40);

    if (!safeEventName) {
      return;
    }

    window.gtag('event', safeEventName, sanitizeParams({
      source_page: getPageKind(),
      ...params,
    }));
  }

  function getPageKind() {
    const explicit = document.body?.dataset?.pageKind;
    if (explicit) {
      return normalizeText(explicit);
    }

    const path = window.location.pathname.toLowerCase();

    if (path.includes('/guides/')) return 'guide';
    if (path.endsWith('/news.html')) return 'news';
    if (path.endsWith('/builder.html')) return 'builder';
    if (path.endsWith('/codex.html')) return 'codex';
    if (path.endsWith('/faq.html')) return 'faq';
    if (path.endsWith('/about.html')) return 'about';
    if (path.endsWith('/contact.html')) return 'contact';
    if (path.endsWith('/privacy.html')) return 'privacy';
    if (path.endsWith('/legal.html')) return 'legal';
    if (path.endsWith('/404.html')) return '404';
    return 'homepage';
  }

  function getEditionFromUrl(url = window.location.href) {
    try {
      const parsed = new URL(url, window.location.href);
      const edition = parsed.searchParams.get('edition');
      return edition === '2014' || edition === '2024' ? edition : '';
    } catch (error) {
      return '';
    }
  }

  function getCodexEntryId(href) {
    if (!href) {
      return '';
    }

    try {
      const parsed = new URL(href, window.location.href);
      return normalizeText(parsed.searchParams.get('entry') || '');
    } catch (error) {
      return '';
    }
  }

  function trackInitialPageContext() {
    const pageKind = getPageKind();

    if (pageKind === 'builder') {
      track('builder_open', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
      });
      return;
    }

    if (pageKind === 'news') {
      track('news_index_open');
      return;
    }

    if (pageKind === 'news-article') {
      track('news_article_open', {
        article_id: normalizeText(document.body.dataset.articleId || ''),
      });
      return;
    }

    if (pageKind === 'guide') {
      track('guide_open', {
        guide_id: normalizeText(document.body.dataset.guideId || ''),
      });
    }
  }

  function trackKnowledgeCard(element) {
    if (!element || seenKnowledgeCards.has(element)) {
      return;
    }

    const topicId = normalizeText(
      element.dataset.knowledge ||
      element.dataset.codexId ||
      element.dataset.knowledgeKey ||
      ''
    );

    seenKnowledgeCards.add(element);
    track('knowledge_card_open', {
      game_system: 'dnd5e',
      edition: getEditionFromUrl() || '2024',
      topic_id: topicId,
    });
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const explicit = target.closest('[data-analytics-event]');
    if (explicit) {
      track(explicit.dataset.analyticsEvent, {
        item_id: normalizeText(explicit.dataset.analyticsId || ''),
        item_type: normalizeText(explicit.dataset.analyticsType || ''),
        edition: normalizeText(explicit.dataset.analyticsEdition || ''),
      });
    }

    const idTarget = target.closest('[id]');
    const id = idTarget?.id || '';

    if (id === 'export-json-btn') {
      track('character_export', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
        export_type: 'json',
      });
    } else if (id === 'import-json-btn') {
      track('character_import', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
      });
    } else if (id === 'print-blank-btn') {
      track('sheet_print', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
        output_type: 'blank_print',
      });
    } else if (id === 'export-btn') {
      track('sheet_print', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
        output_type: 'pdf',
      });
    } else if (id === 'level-up-btn') {
      track('level_up_open', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
      });
    }

    const builderLink = target.closest('a[href*="builder.html?edition="]');
    if (builderLink) {
      track('edition_select', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl(builderLink.href),
      });
    }

    const getStarted = target.closest('.hotspot-start, .mobile-portal-cta');
    if (getStarted) {
      track('homepage_get_started');
    }

    const tooltipCodexLink = target.closest('.kt-codex-link');
    if (tooltipCodexLink) {
      track('knowledge_card_codex_click', {
        game_system: 'dnd5e',
        edition: getEditionFromUrl() || '2024',
        entry_id: getCodexEntryId(tooltipCodexLink.href),
      });
    }

    const featuredCodexLink = target.closest('[data-card-link]');
    if (featuredCodexLink) {
      track('featured_card_codex_click', {
        entry_id: getCodexEntryId(featuredCodexLink.href),
      });
    }

    const codexSummary = target.closest('.codex-entry > summary');
    if (codexSummary) {
      const entry = codexSummary.closest('.codex-entry');
      track('codex_entry_open', {
        entry_id: normalizeText(entry?.dataset?.entryId || ''),
      });
    }

    const codexRelated = target.closest('[data-open-entry]');
    if (codexRelated) {
      track('codex_entry_open', {
        entry_id: normalizeText(codexRelated.dataset.openEntry || ''),
        navigation_type: 'related_entry',
      });
    }
  }

  function handleKnowledgePointer(event) {
    const target = event.target instanceof Element
      ? event.target.closest('[data-knowledge], [data-codex-id], [data-knowledge-key]')
      : null;
    trackKnowledgeCard(target);
  }

  function handleCodexFilterChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    track('codex_filter_change', {
      filter_name: normalizeText(target.id || target.name || 'filter'),
      filter_value: normalizeText(target.value),
    });
  }

  function handleCodexSearch(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.id !== 'codex-search') {
      return;
    }

    window.clearTimeout(codexSearchTimer);
    codexSearchTimer = window.setTimeout(() => {
      // Privacy safeguard: only the query length is sent, never the typed text.
      track('codex_search', {
        query_length: target.value.trim().length,
        edition: normalizeText(document.getElementById('codex-edition')?.value || ''),
        entry_type: normalizeText(document.getElementById('codex-type')?.value || ''),
      });
    }, 1200);
  }

  function handleLevelUpComplete(event) {
    const detail = event.detail || {};

    track('level_up_complete', {
      game_system: 'dnd5e',
      edition: normalizeText(detail.edition || ''),
      character_level: safeNumber(detail.characterLevel),
      class_level: safeNumber(detail.classLevel),
      hp_method: normalizeText(detail.hpMethod || ''),
    });
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerover', handleKnowledgePointer, { passive: true });
    document.addEventListener('focusin', handleKnowledgePointer);
    document.addEventListener('change', handleCodexFilterChange);
    document.addEventListener('input', handleCodexSearch);
    document.addEventListener('character:leveled-up', handleLevelUpComplete);
  }

  window.MyRPGAnalytics = Object.freeze({
    measurementId: MEASUREMENT_ID,
    track,
    trackVideoStart(videoId, extra = {}) {
      track('guide_video_start', {
        video_id: normalizeText(videoId),
        ...extra,
      });
    },
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindEvents();
      trackInitialPageContext();
    }, { once: true });
  } else {
    bindEvents();
    trackInitialPageContext();
  }
})();
