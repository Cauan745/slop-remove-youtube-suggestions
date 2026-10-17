const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadSourceFile, assertDeepEqual } = require('../setup');

const helpers = loadSourceFile('shared/youtube-translation.js', { URL });

describe('YouTube translation helpers', () => {
  it('extracts video IDs from watch, Shorts, embed, and short URLs', () => {
    assert.strictEqual(helpers.slopRysExtractVideoId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
    assert.strictEqual(helpers.slopRysExtractVideoId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
    assert.strictEqual(helpers.slopRysExtractVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
    assert.strictEqual(helpers.slopRysExtractVideoId('https://example.com/watch?v=abcdefghijk'), null);
    assert.strictEqual(helpers.slopRysExtractVideoId('https://fakeyoutube.com/watch?v=abcdefghijk'), null);
    assert.strictEqual(helpers.slopRysExtractVideoId('https://www.youtube.com.evil.com/watch?v=abcdefghijk'), null);
  });

  it('collects titles, descriptions, and thumbnails from renderer data', () => {
    const records = helpers.slopRysCollectVideoMetadata({
      videoRenderer: {
        videoId: 'abcdefghijk',
        title: { runs: [{ text: 'Original title' }] },
        descriptionSnippet: { runs: [{ text: 'Original description' }] },
        thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' }] },
      },
    });
    assertDeepEqual(records.get('abcdefghijk'), {
      id: 'abcdefghijk',
      title: 'Original title',
      description: 'Original description',
      thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    });
  });

  it('selects original and requested audio tracks', () => {
    const encode = value => Buffer.from(value).toString('base64');
    const tracks = [
      { id: `140;${encode('acont lang=fr dubbed-auto')}` },
      { id: `141;${encode('acont lang=en original')}` },
    ];
    assert.strictEqual(helpers.slopRysChooseAudioTrack(tracks, 'original'), tracks[1]);
    assert.strictEqual(helpers.slopRysChooseAudioTrack(tracks, 'fr'), tracks[0]);
  });

  it('prefers manual subtitles and does not use ASR unless allowed', () => {
    const manual = { languageCode: 'en', name: { simpleText: 'English' } };
    const asr = { languageCode: 'en', kind: 'asr' };
    assertDeepEqual(helpers.slopRysChooseSubtitleTrack([asr, manual], 'original', 'en', false), { track: manual, translated: false });
    assert.strictEqual(helpers.slopRysChooseSubtitleTrack([asr], 'original', 'en', false), null);
    assertDeepEqual(helpers.slopRysChooseSubtitleTrack([asr], 'original', 'en', true), { track: asr, translated: false });
  });

  it('sanitizes language settings and builds API URLs without changing the key', () => {
    const settings = helpers.slopRysSanitizeTranslationSettings({
      translation_audio_language: 'xx',
      translation_subtitles_language: 'pt',
      translation_data_api_key: 'key with spaces',
    });
    assert.strictEqual(settings.translation_audio_language, 'original');
    assert.strictEqual(settings.translation_subtitles_language, 'pt');
    const url = new URL(helpers.slopRysBuildDataApiUrl('videos', ['abcdefghijk'], settings.translation_data_api_key));
    assert.strictEqual(url.searchParams.get('key'), 'key with spaces');
    assert.strictEqual(url.searchParams.get('id'), 'abcdefghijk');
  });
});
