// Copyright (C) 2026 Slop RYS contributors
// This file is an independent implementation for Slop RYS.
// SPDX-License-Identifier: MPL-2.0

(function () {
  const ids = [
    'translation_audio_language', 'translation_subtitles_language',
    'translation_subtitles_allow_asr', 'translation_use_data_api',
    'translation_data_api_key', 'translation_debug_log',
  ];

  function value(id, fallback) {
    return document.getElementById(id) || fallback;
  }

  function addOptions(select, items, includeDisabled) {
    if (!select) return;
    select.innerHTML = '';
    if (includeDisabled) select.append(new Option('Disabled', 'disabled'));
    select.append(new Option('Original language', 'original'));
    SLOP_RYS_TRANSLATION_LANGUAGES.forEach(([code, name]) => select.append(new Option(name, code)));
  }

  async function settings() {
    const stored = await browser.storage.local.get();
    return slopRysSanitizeTranslationSettings(stored);
  }

  async function save(key, nextValue) {
    await browser.storage.local.set({ [key]: nextValue });
  }

  async function init() {
    const audio = value('translation_audio_language');
    const subtitles = value('translation_subtitles_language');
    const asr = value('translation_subtitles_allow_asr');
    const dataApi = value('translation_use_data_api');
    const apiKey = value('translation_data_api_key');
    const debugLog = value('translation_debug_log');
    addOptions(audio, SLOP_RYS_TRANSLATION_LANGUAGES, false);
    addOptions(subtitles, SLOP_RYS_TRANSLATION_LANGUAGES, true);
    const current = await settings();
    audio.value = current.translation_audio_language;
    subtitles.value = current.translation_subtitles_language;
    asr.checked = current.translation_subtitles_allow_asr;
    dataApi.checked = current.translation_use_data_api;
    apiKey.value = current.translation_data_api_key;
    debugLog.checked = current.translation_debug_log;
    apiKey.closest('.translation_api_key_row')?.classList.toggle('translation_api_key_hidden', !dataApi.checked);

    audio.addEventListener('change', () => save('translation_audio_language', audio.value));
    subtitles.addEventListener('change', () => save('translation_subtitles_language', subtitles.value));
    asr.addEventListener('change', () => save('translation_subtitles_allow_asr', asr.checked));
    dataApi.addEventListener('change', async () => {
      await save('translation_use_data_api', dataApi.checked);
      apiKey.closest('.translation_api_key_row')?.classList.toggle('translation_api_key_hidden', !dataApi.checked);
    });
    apiKey.addEventListener('change', () => save('translation_data_api_key', apiKey.value.trim()));
    debugLog.addEventListener('change', () => save('translation_debug_log', debugLog.checked));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
