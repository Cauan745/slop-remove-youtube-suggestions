// Copyright (C) 2026 Slop RYS contributors
// This file is an independent implementation for Slop RYS.
// SPDX-License-Identifier: MPL-2.0

(function () {
  if (window.top !== window && !location.pathname.startsWith('/embed/')) return;

  const api = typeof browser !== 'undefined' ? browser : chrome;
  const manager = {
    settings: { ...SLOP_RYS_TRANSLATION_DEFAULTS },
    metadata: new Map(),
    channelMetadata: new Map(),
    initialMetadata: new Map(),
    pending: false,
    observer: null,
    pageScriptInjected: false,
  };

  function debug(...args) {
    if (manager.settings.translation_debug_log) console.debug('[Slop RYS translation]', ...args);
  }

  function readJsonScript(name) {
    const scripts = Array.from(document.scripts || []);
    for (const script of scripts) {
      const text = script.textContent || '';
      const marker = `${name} =`;
      const index = text.indexOf(marker);
      if (index < 0) continue;
      const start = text.indexOf('{', index);
      if (start < 0) continue;
      let depth = 0;
      let quoted = false;
      let escaped = false;
      for (let i = start; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') quoted = false;
          continue;
        }
        if (char === '"') quoted = true;
        else if (char === '{') depth += 1;
        else if (char === '}' && --depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch (error) { break; }
        }
      }
    }
    return null;
  }

  function collectInitialMetadata() {
    manager.initialMetadata = new Map();
    const player = readJsonScript('ytInitialPlayerResponse');
    const initial = readJsonScript('ytInitialData');
    slopRysCollectVideoMetadata(player, manager.initialMetadata);
    slopRysCollectVideoMetadata(initial, manager.initialMetadata);
    if (player?.videoDetails?.videoId) {
      manager.initialMetadata.set(player.videoDetails.videoId, {
        id: player.videoDetails.videoId,
        title: player.videoDetails.title || null,
        description: player.videoDetails.shortDescription || null,
        thumbnail: slopRysThumbnailFromData(player.videoDetails.thumbnail),
        playerResponse: player,
      });
    }
    return player;
  }

  function videoIdFromElement(element) {
    const link = element?.closest?.('a[href]') || element;
    return slopRysExtractVideoId(link?.href || link?.getAttribute?.('href') || '');
  }

  function remember(element, key, value) {
    if (!element.hasAttribute(key)) element.setAttribute(key, value);
  }

  function setText(element, value, marker) {
    if (!element || !value || element.getAttribute(marker) === value) return;
    remember(element, `data-slop-rys-original-${marker}`, element.textContent || '');
    element.textContent = value;
    element.setAttribute(marker, value);
    element.setAttribute('translate', 'no');
  }

  function setTitle(value) {
    if (!value) return;
    const selectors = [
      'ytd-watch-metadata h1 yt-formatted-string', 'ytd-watch-metadata h1',
      '#title h1', 'h1.title', 'ytm-watch-metadata h1',
    ];
    selectors.flatMap(selector => Array.from(document.querySelectorAll(selector))).forEach(element => setText(element, value, 'data-slop-rys-original-title'));
    const current = document.title || '';
    const count = current.match(/^\(\d+\)\s*/)?.[0] || '';
    const suffix = /\s-\sYouTube$/i.test(current) ? ' - YouTube' : '';
    if (!document.documentElement.hasAttribute('data-slop-rys-original-document-title')) {
      document.documentElement.setAttribute('data-slop-rys-original-document-title', current);
    }
    if (current !== `${count}${value}${suffix}`) document.title = `${count}${value}${suffix}`;
  }

  function setDescription(element, value) {
    if (!element || !value || element.getAttribute('data-slop-rys-description') === value) return;
    remember(element, 'data-slop-rys-original-description', element.innerHTML || '');
    element.textContent = value;
    element.setAttribute('data-slop-rys-description', value);
    element.setAttribute('translate', 'no');
  }

  function setThumbnail(image, videoId, preferred) {
    if (!image || !videoId) return;
    if (image.getAttribute('data-slop-rys-video-id') === videoId) return;
    if (image.hasAttribute('data-slop-rys-original-thumbnail')) {
      image.removeAttribute('data-slop-rys-original-thumbnail');
    }
    const url = preferred || slopRysCanonicalThumbnail(videoId);
    if (!url || image.src === url) return;
    image.setAttribute('data-slop-rys-original-thumbnail', image.currentSrc || image.src || '');
    image.src = url;
    image.removeAttribute('srcset');
    image.setAttribute('data-slop-rys-video-id', videoId);
  }

  function pageVideoId() {
    return slopRysExtractVideoId(location.href);
  }

  async function fetchApiMetadata(ids) {
    if (!manager.settings.translation_use_data_api || !manager.settings.translation_data_api_key || !ids.length) return new Map();
    const result = new Map();
    const url = slopRysBuildDataApiUrl('videos', ids.slice(0, 50), manager.settings.translation_data_api_key);
    if (!url) return result;
    try {
      const response = await fetch(url);
      if (!response.ok) return result;
      const data = await response.json();
      (data.items || []).forEach(item => result.set(item.id, {
        id: item.id,
        title: item.snippet?.title || null,
        description: item.snippet?.description || null,
        thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || null,
      }));
    } catch (error) {
      debug('YouTube Data API request failed', error);
    }
    return result;
  }

  async function fetchApiChannels(ids) {
    if (!manager.settings.translation_use_data_api || !manager.settings.translation_data_api_key || !ids.length) return new Map();
    const result = new Map();
    const url = slopRysBuildDataApiUrl('channels', ids.slice(0, 50), manager.settings.translation_data_api_key);
    if (!url) return result;
    try {
      const response = await fetch(url);
      if (!response.ok) return result;
      const data = await response.json();
      (data.items || []).forEach(item => result.set(item.id, {
        id: item.id,
        title: item.snippet?.title || null,
        description: item.snippet?.description || null,
      }));
    } catch (error) {
      debug('YouTube Data API channel request failed', error);
    }
    return result;
  }

  async function fetchOembed(videoId) {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (!response.ok) return null;
      const data = await response.json();
      return { id: videoId, title: data.title || null, description: null, thumbnail: data.thumbnail_url || null };
    } catch (error) {
      return null;
    }
  }

  function innerTubeApiKey() {
    for (const script of Array.from(document.scripts || [])) {
      const match = (script.textContent || '').match(/INNERTUBE_API_KEY[^:]*:\s*["']([^"']+)["']/);
      if (match) return match[1];
    }
    return null;
  }

  async function fetchInnerTube(videoId) {
    const key = innerTubeApiKey();
    if (!key) return null;
    try {
      const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          videoId,
          context: { client: { clientName: 'WEB', clientVersion: '2.20260101.00.00' } },
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        id: videoId,
        title: data.videoDetails?.title || null,
        description: data.videoDetails?.shortDescription || null,
        thumbnail: slopRysThumbnailFromData(data.videoDetails?.thumbnail),
        playerResponse: data,
      };
    } catch (error) {
      debug('YouTube player metadata request failed', error);
      return null;
    }
  }

  async function metadataFor(ids) {
    const missing = ids.filter(id => !manager.metadata.has(id));
    const apiMetadata = await fetchApiMetadata(missing);
    apiMetadata.forEach((value, key) => manager.metadata.set(key, value));
    for (const id of missing) {
      if (manager.metadata.has(id)) continue;
      const initial = manager.initialMetadata.get(id);
      if (initial) manager.metadata.set(id, { ...initial });
    }
    const unresolved = missing.filter(id => {
      const value = manager.metadata.get(id);
      return !value || !value.title || !value.description;
    });
    for (let i = 0; i < Math.min(unresolved.length, 20); i += 1) {
      const value = await fetchInnerTube(unresolved[i]);
      if (value) manager.metadata.set(value.id, { ...manager.metadata.get(value.id), ...value });
    }
    const stillUnresolved = unresolved.filter(id => !manager.metadata.has(id) || !manager.metadata.get(id)?.title);
    for (let i = 0; i < stillUnresolved.length; i += 8) {
      const batch = await Promise.all(stillUnresolved.slice(i, i + 8).map(fetchOembed));
      batch.filter(Boolean).forEach(value => manager.metadata.set(value.id, value));
    }
    return manager.metadata;
  }

  function processBrowsing(metadata) {
    const titleElements = Array.from(document.querySelectorAll(
      '#video-title, h3 a[href*="watch"] span, h3 a[href*="shorts"] span, '
      + 'ytd-video-renderer a#video-title, ytd-rich-item-renderer #video-title, '
      + 'ytm-video-card-renderer h3, ytm-compact-video-renderer #video-title, '
      + 'ytd-notification-renderer #video-title'
    ));
    titleElements.forEach(element => {
      const id = videoIdFromElement(element);
      const value = id && metadata.get(id);
      if (manager.settings.preserve_original_titles && value?.title) setText(element, value.title, 'data-slop-rys-original-title');
      if (manager.settings.restore_original_thumbnails && id) {
        const image = element.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytm-video-card-renderer, ytd-notification-renderer')?.querySelector('img');
        setThumbnail(image, id, value?.thumbnail);
      }
      if (manager.settings.preserve_original_descriptions && value?.description) {
        const container = element.closest('ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer') || element.parentElement;
        const description = container?.querySelector('.metadata-snippet-text, #description-text, #description');
        setDescription(description, value.description);
      }
    });
  }

  function processMain(metadata, playerResponse) {
    const id = pageVideoId();
    const value = id && metadata.get(id);
    if (!value) return;
    if (manager.settings.preserve_original_titles && value.title) setTitle(value.title);
    if (manager.settings.preserve_original_descriptions && value.description) {
      const descriptions = document.querySelectorAll('#description-inline-expander, #description, ytd-watch-metadata #description, ytm-expandable-video-description-body-renderer');
      descriptions.forEach(element => setDescription(element, value.description));
    }
    if (manager.settings.restore_original_thumbnails) {
      document.querySelectorAll('ytd-player img, ytd-watch-flexy img').forEach(image => setThumbnail(image, id, value.thumbnail));
    }
    if (playerResponse?.videoDetails?.videoId) {
      try {
        localStorage.setItem('slop-rys-translation-player-response', JSON.stringify(playerResponse));
      } catch (error) {}
    }
  }

  function channelIdFromElement(element) {
    const link = element?.closest?.('a[href*="/channel/"]') || element;
    const href = link?.href || link?.getAttribute?.('href') || '';
    return href.match(/\/channel\/(UC[A-Za-z0-9_-]+)/)?.[1] || null;
  }

  function processChannels(channelMetadata) {
    if (!manager.settings.preserve_original_titles && !manager.settings.preserve_original_descriptions) return;
    const roots = Array.from(document.querySelectorAll('ytd-channel-renderer, ytd-channel-name, ytd-c4-tabbed-header-renderer, ytm-channel-list-item-renderer'));
    roots.forEach(root => {
      const id = channelIdFromElement(root);
      const value = id && channelMetadata.get(id);
      if (!value) return;
      if (manager.settings.preserve_original_titles) {
        const name = root.querySelector('#channel-title, #channel-name, ytd-channel-name #text, yt-formatted-string#text, h3');
        setText(name, value.title, 'data-slop-rys-original-channel-title');
      }
      if (manager.settings.preserve_original_descriptions) {
        const description = root.querySelector('#description, yt-formatted-string#description');
        setDescription(description, value.description);
      }
    });
  }

  function restore() {
    document.querySelectorAll('[data-slop-rys-original-title], [data-slop-rys-original-channel-title]').forEach(element => {
      const marker = element.hasAttribute('data-slop-rys-original-channel-title') ? 'data-slop-rys-original-channel-title' : 'data-slop-rys-original-title';
      const original = element.getAttribute(`data-slop-rys-original-${marker}`);
      if (original !== null) element.textContent = original;
      element.removeAttribute(marker);
      element.removeAttribute(`data-slop-rys-original-${marker}`);
    });
    document.querySelectorAll('[data-slop-rys-original-description]').forEach(element => {
      const original = element.getAttribute('data-slop-rys-original-description');
      if (original !== null) element.innerHTML = original;
      element.removeAttribute('data-slop-rys-description');
      element.removeAttribute('data-slop-rys-original-description');
    });
    document.querySelectorAll('[data-slop-rys-original-thumbnail]').forEach(image => {
      image.src = image.getAttribute('data-slop-rys-original-thumbnail') || image.src;
      image.removeAttribute('data-slop-rys-original-thumbnail');
      image.removeAttribute('data-slop-rys-video-id');
    });
    const originalDocumentTitle = document.documentElement.getAttribute('data-slop-rys-original-document-title');
    if (originalDocumentTitle !== null) {
      document.title = originalDocumentTitle;
      document.documentElement.removeAttribute('data-slop-rys-original-document-title');
    }
  }

  function syncPageSettings() {
    try {
      localStorage.setItem('slop-rys-translation-settings', JSON.stringify(manager.settings));
      window.dispatchEvent(new Event('slop-rys-translation-settings-changed'));
    } catch (error) {}
    if (!manager.pageScriptInjected) {
      const script = document.createElement('script');
      script.src = api.runtime.getURL('content-script/translation-page.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
      manager.pageScriptInjected = true;
    }
  }

  async function process() {
    if (manager.pending) return;
    manager.pending = true;
    try {
      if (manager.settings.global_enable === false) {
        restore();
        return;
      }
      const playerResponse = collectInitialMetadata();
      const ids = Array.from(document.querySelectorAll('a[href]')).map(videoIdFromElement).filter(Boolean);
      const currentId = pageVideoId();
      if (currentId) ids.push(currentId);
      const metadata = await metadataFor(Array.from(new Set(ids)).slice(0, 80));
      const channelIds = Array.from(document.querySelectorAll('a[href*="/channel/"]'))
        .map(element => channelIdFromElement(element)).filter(Boolean);
      const apiChannels = await fetchApiChannels(Array.from(new Set(channelIds)));
      apiChannels.forEach((value, key) => manager.channelMetadata.set(key, value));
      processBrowsing(metadata);
      processMain(metadata, playerResponse);
      processChannels(manager.channelMetadata);
      syncPageSettings();
    } finally {
      manager.pending = false;
    }
  }

  async function load() {
    let stored = {};
    try { stored = await api.storage.local.get(); } catch (error) { debug('Settings unavailable', error); }
    manager.settings = slopRysSanitizeTranslationSettings({ ...stored, ...stored.translation_settings });
    manager.settings.global_enable = stored.global_enable !== false;
    await process();
  }

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const changed = Object.keys(changes).some(key => key === 'global_enable' || key.startsWith('preserve_original_') || key.startsWith('restore_original_') || key.startsWith('force_original_') || key.startsWith('translation_'));
    if (changed) {
      const disabling = Object.entries(changes).some(([key, change]) =>
        ['preserve_original_titles', 'preserve_original_descriptions', 'restore_original_thumbnails'].includes(key) && change.newValue === false
      );
      if (disabling) restore();
      const changedSettings = Object.fromEntries(
        Object.entries(changes).map(([key, change]) => [key, change.newValue])
      );
      manager.settings = slopRysSanitizeTranslationSettings({ ...manager.settings, ...changedSettings });
      if ('global_enable' in changedSettings) manager.settings.global_enable = changedSettings.global_enable;
      syncPageSettings();
      manager.metadata.clear();
      manager.channelMetadata.clear();
      load();
    }
  });

  const schedule = () => {
    if (manager.observer) return;
    manager.observer = new MutationObserver(() => {
      clearTimeout(schedule.timer);
      schedule.timer = setTimeout(process, 250);
    });
    manager.observer.observe(document.documentElement, { childList: true, subtree: true });
  };
  document.addEventListener('yt-navigate-finish', () => { manager.metadata.clear(); manager.channelMetadata.clear(); process(); });
  window.addEventListener('popstate', () => { manager.metadata.clear(); manager.channelMetadata.clear(); process(); });
  schedule();
  load();
})();
