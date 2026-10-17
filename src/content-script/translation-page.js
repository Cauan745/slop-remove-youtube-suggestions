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

  function audioTrackLanguage(track) {
    return baseLanguage(track?.languageCode || decodeTrack(track?.id).language);
  }

  function sameSubtitleTrack(left, right) {
    if (!left || !right) return false;
    return baseLanguage(left.languageCode) === baseLanguage(right.languageCode) &&
      Boolean(left.kind) === Boolean(right.kind) &&
      baseLanguage(left.translationLanguage?.languageCode) === baseLanguage(right.translationLanguage?.languageCode);
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

  function originalAudioLanguage(response, player) {
    let availableTracks = [];
    try {
      availableTracks = typeof player.getAvailableAudioTracks === 'function'
        ? player.getAvailableAudioTracks() || []
        : [];
    } catch (error) {}

    const declaredLanguage = baseLanguage(
      response?.videoDetails?.defaultAudioLanguage || response?.videoDetails?.defaultLanguage || ''
    );
    if (declaredLanguage) return declaredLanguage;

    const originalTrack = availableTracks.find(track =>
      track?.isOriginal || decodeTrack(track?.id).original
    );
    if (originalTrack) return audioTrackLanguage(originalTrack);

    // If YouTube exposes only one audio language, it is safe to use it as the
    // source language. With multiple tracks and no source marker, choosing the
    // default track can select a localized dub instead of the original.
    const availableLanguages = new Set(availableTracks.map(audioTrackLanguage).filter(Boolean));
    if (availableLanguages.size === 1) return availableLanguages.values().next().value;

    const responseAudioTracks = (response?.streamingData?.adaptiveFormats || [])
      .map(format => format.audioTrack)
      .filter(Boolean);
    const responseLanguages = new Set(responseAudioTracks.map(audioTrackLanguage).filter(Boolean));
    if (responseLanguages.size === 1) return responseLanguages.values().next().value;

    return '';
  }

  function applySubtitles(player, config) {
    if (typeof player.getOption !== 'function' || typeof player.setOption !== 'function') return;
    let response;
    let tracks;
    try {
      response = typeof player.getPlayerResponse === 'function' ? player.getPlayerResponse() : null;
      tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    } catch (error) { return; }
    const preference = config.translation_subtitles_language || 'disabled';
    let current;
    try { current = player.getOption('captions', 'track'); } catch (error) { current = null; }

    if (!config.force_original_subtitles) {
      if (sameSubtitleTrack(current, lastAppliedSubtitleTrack)) {
        try { player.setOption('captions', 'track', {}); } catch (error) {}
      }
      lastAppliedSubtitleTrack = null;
      return;
    }

    if (preference === 'disabled') {
      if (current?.languageCode) {
        try { player.setOption('captions', 'track', {}); } catch (error) {}
      }
      lastAppliedSubtitleTrack = null;
      userDisabledSubtitles = false;
      return;
    }

    // A manual click on YouTube's CC button or the C shortcut leaves the
    // player without a track. Respect that choice instead of re-enabling the
    // preferred track on the next mutation/interval pass. Ignore the brief
    // empty state while setOption() is still loading a newly selected track.
    if (userDisabledSubtitles) return;
    if (lastAppliedSubtitleTrack && !current?.languageCode) {
      if (Date.now() - lastSubtitleSelectionAt >= SUBTITLE_SELECTION_GRACE_MS) {
        userDisabledSubtitles = true;
      }
      return;
    }

    const originalAsrTracks = preference === 'original'
      ? tracks?.filter(track => track.kind === 'asr' && !track.translationLanguage) || []
      : [];
    const asrLanguages = new Set(originalAsrTracks.map(track => baseLanguage(track.languageCode)).filter(Boolean));
    const unambiguousAsr = asrLanguages.size === 1 ? originalAsrTracks[0] : null;
    const declaredLanguage = preference === 'original' ? originalAudioLanguage(response, player) : '';
    const wanted = preference === 'original'
      ? declaredLanguage || baseLanguage(unambiguousAsr?.languageCode)
      : baseLanguage(preference);
    const manualTracks = tracks?.filter(track => !track.kind && !track.translationLanguage) || [];
    const manual = manualTracks.find(track => baseLanguage(track.languageCode) === wanted);
    // When no ASR track is exposed, YouTube's single manual track is the only
    // safe source-language fallback.
    let target = preference === 'original' && !unambiguousAsr && manualTracks.length === 1
      ? manualTracks[0]
      : manual;
    if (!target && config.translation_subtitles_allow_asr) {
      target = tracks?.find(track => track.kind === 'asr' && !track.translationLanguage && baseLanguage(track.languageCode) === wanted);
      if (!target && preference !== 'original') {
        const source = tracks?.find(track => track.kind === 'asr' && !track.translationLanguage);
        if (source) target = { ...source, translationLanguage: { languageCode: preference, languageName: preference } };
      }
    }
    if (!target) {
      if (sameSubtitleTrack(current, lastAppliedSubtitleTrack)) {
        try { player.setOption('captions', 'track', {}); } catch (error) {}
      }
      lastAppliedSubtitleTrack = null;
      return;
    }
    if (sameSubtitleTrack(current, target)) {
      lastAppliedSubtitleTrack = target;
      return;
    }
    lastAppliedSubtitleTrack = target;
    lastSubtitleSelectionAt = Date.now();
    try { player.setOption('captions', 'track', target); } catch (error) {}
  }

  function apply() {
    const player = playerElement();
    if (!player) return;
    const config = settings();
    applyAudio(player, config);
    applySubtitles(player, config);
  }

  const SUBTITLE_SELECTION_GRACE_MS = 2000;
  let lastAppliedSubtitleTrack = null;
  let lastSubtitleSelectionAt = 0;
  let userDisabledSubtitles = false;

  window.addEventListener('slop-rys-translation-settings-changed', () => {
    const config = settings();
    userDisabledSubtitles = false;
    if (config.force_original_subtitles && config.translation_subtitles_language !== 'disabled') {
      lastAppliedSubtitleTrack = null;
      lastSubtitleSelectionAt = 0;
    }
    apply();
  });
  document.addEventListener('yt-navigate-finish', () => {
    userDisabledSubtitles = false;
    lastAppliedSubtitleTrack = null;
    lastSubtitleSelectionAt = 0;
    apply();
  });
  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  apply();
  window.setInterval(apply, 1500);
})();
