const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadSourceFile } = require('../setup');

function loadTranslationPage(config) {
  const calls = [];
  let currentTrack = {};
  const player = {
    getAvailableAudioTracks: () => [{ languageCode: 'es', audioIsDefault: true }],
    getPlayerResponse: () => ({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ languageCode: 'es', name: { simpleText: 'Spanish' } }],
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
  it('resolves Original language from the default audio track', () => {
    const page = loadTranslationPage({
      force_original_subtitles: true,
      translation_subtitles_language: 'original',
    });

    assert.strictEqual(page.calls.length, 1);
    assert.strictEqual(page.calls[0].track.languageCode, 'es');
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
