// Copyright (C) 2026 Slop RYS contributors
// This file is an independent implementation for Slop RYS.
// SPDX-License-Identifier: MPL-2.0

(function () {
  if (window.__slopRysTranslationPageLoaded) return;
  window.__slopRysTranslationPageLoaded = true;

  function baseLanguage(value) {
    return typeof value === 'string' ? value.toLowerCase().split('-')[0] : '';
  }

  function decodeTrack(id) {
    if (typeof id !== 'string' || !id.includes(';')) return { language: '', original: false };
    try {
      const decoded = atob(id.split(';')[1]).replace(/[^\x20-\x7E]/g, '');
      const language = decoded.match(/lang[^A-Za-z]+([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)/i);
      return { language: language ? baseLanguage(language[1]) : '', original: /original/i.test(decoded) };
    } catch (error) {
      return { language: '', original: false };
    }
  }

  function playerElement() {
    return document.getElementById(location.pathname.startsWith('/shorts') ? 'shorts-player' : 'movie_player') ||
      document.getElementById('c4-player');
  }

  function settings() {
    try {
      return JSON.parse(localStorage.getItem('slop-rys-translation-settings') || '{}');
    } catch (error) {
      return {};
    }
  }

  function applyAudio(player, config) {
    if (!config.force_original_audio || typeof player.getAvailableAudioTracks !== 'function' || typeof player.setAudioTrack !== 'function') return;
    let tracks;
    try { tracks = player.getAvailableAudioTracks(); } catch (error) { return; }
    if (!Array.isArray(tracks) || tracks.length < 2) return;
    const preference = config.translation_audio_language || 'original';
    let target = tracks.find(track => preference === 'original' ? decodeTrack(track.id).original : decodeTrack(track.id).language === baseLanguage(preference));
    if (!target) return;
    try {
      const current = typeof player.getAudioTrack === 'function' ? player.getAudioTrack() : null;
      if (current && current.id === target.id) return;
      player.setAudioTrack(target);
    } catch (error) {
      // The player can disappear during SPA navigation.
    }
  }

  function originalAudioLanguage(response) {
    const defaultAudio = response?.streamingData?.adaptiveFormats?.find(format => format.audioTrack?.audioIsDefault)?.audioTrack;
    return baseLanguage(defaultAudio?.id?.split('.')[0] || response?.videoDetails?.defaultAudioLanguage || '');
  }

  function applySubtitles(player, config) {
    if (!config.force_original_subtitles || typeof player.getOption !== 'function' || typeof player.setOption !== 'function') return;
    let response;
    let tracks;
    try {
      response = typeof player.getPlayerResponse === 'function' ? player.getPlayerResponse() : null;
      tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    } catch (error) { return; }
    const preference = config.translation_subtitles_language || 'disabled';
    let current;
    try { current = player.getOption('captions', 'track'); } catch (error) { current = null; }
    if (preference === 'disabled') {
      if (!current || !current.languageCode) return;
      try { player.setOption('captions', 'track', {}); } catch (error) {}
      return;
    }
    const wanted = preference === 'original' ? originalAudioLanguage(response) : baseLanguage(preference);
    const manual = tracks?.find(track => !track.kind && !track.translationLanguage && baseLanguage(track.languageCode) === wanted);
    let target = manual;
    if (!target && config.translation_subtitles_allow_asr) {
      target = tracks?.find(track => track.kind === 'asr' && baseLanguage(track.languageCode) === wanted);
      if (!target && preference !== 'original') {
        const source = tracks?.find(track => track.kind === 'asr' && !track.translationLanguage);
        if (source) target = { ...source, translationLanguage: { languageCode: preference, languageName: preference } };
      }
    }
    if (!target) {
      if (current?.languageCode) {
        try { player.setOption('captions', 'track', {}); } catch (error) {}
      }
      return;
    }
    const sameLanguage = baseLanguage(current?.languageCode) === baseLanguage(target.languageCode);
    const sameKind = Boolean(current?.kind) === Boolean(target.kind);
    const sameTranslation = baseLanguage(current?.translationLanguage?.languageCode) === baseLanguage(target.translationLanguage?.languageCode);
    if (sameLanguage && sameKind && sameTranslation) return;
    try { player.setOption('captions', 'track', target); } catch (error) {}
  }

  function apply() {
    const player = playerElement();
    if (!player) return;
    const config = settings();
    applyAudio(player, config);
    applySubtitles(player, config);
  }

  window.addEventListener('slop-rys-translation-settings-changed', apply);
  document.addEventListener('yt-navigate-finish', apply);
  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  apply();
  window.setInterval(apply, 1500);
})();
