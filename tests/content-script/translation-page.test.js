const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadSourceFile } = require('../setup');

function loadTranslationPage(config, {
  videoLanguage = 'es',
  availableLanguage = 'es',
  captionTracks = [{ languageCode: 'es', name: { simpleText: 'Spanish' } }],
} = {}) {
  const calls = [];
  let currentTrack = {};
  const player = {
    getAvailableAudioTracks: () => [{ languageCode: availableLanguage, audioIsDefault: true }],
    getPlayerResponse: () => ({
      videoDetails: { defaultAudioLanguage: videoLanguage },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks,
        },
      },
    }),
    getOption: () => currentTrack,
    setOption: (category, option, track) => {
      calls.push({ category, option, track });
      currentTrack = track;
    },
  };
  const listeners = {};
  const localStorage = {
    getItem: () => JSON.stringify(config),
  };
  const window = {
    __slopRysTranslationPageLoaded: false,
    addEventListener: (type, listener) => { listeners[type] = listener; },
    setInterval: () => {},
  };
  const document = {
    documentElement: {},
    addEventListener: () => {},
    getElementById: id => id === 'movie_player' ? player : null,
  };

  loadSourceFile('content-script/translation-page.js', {
    window,
    document,
    location: { pathname: '/watch' },
    localStorage,
    MutationObserver: class { observe() {} },
  });

  return { calls, listeners, setConfig: next => { localStorage.getItem = () => JSON.stringify(next); } };
}

describe('YouTube translation page subtitle controls', () => {
  it('uses the declared video language instead of the first ambiguous ASR track', () => {
    const page = loadTranslationPage({
      force_original_subtitles: true,
      translation_subtitles_language: 'original',
    }, {
      videoLanguage: 'pt',
      availableLanguage: 'pt',
      captionTracks: [
        { languageCode: 'en', kind: 'asr', name: { simpleText: 'English (auto-generated)' } },
        { languageCode: 'pt', kind: 'asr', name: { simpleText: 'Portuguese (auto-generated)' } },
        { languageCode: 'en', name: { simpleText: 'English' } },
        { languageCode: 'pt', name: { simpleText: 'Portuguese' } },
      ],
    });

    assert.strictEqual(page.calls.length, 1);
    assert.strictEqual(page.calls[0].track.languageCode, 'pt');
  });

  it('clears the extension-selected subtitle when the option is disabled', () => {
    const page = loadTranslationPage({
      force_original_subtitles: true,
      translation_subtitles_language: 'original',
    });

    page.setConfig({
      force_original_subtitles: false,
      translation_subtitles_language: 'original',
    });
    page.listeners['slop-rys-translation-settings-changed']();

    assert.strictEqual(Object.keys(page.calls.at(-1).track).length, 0);
  });
});
