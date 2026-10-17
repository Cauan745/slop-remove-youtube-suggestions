const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadSourceFile, resetStorage, setStorageData, getStorageData } = require('../setup');

const LOCAL_FEATURES = [
  'remove_video_thumbnails',
  'blur_video_thumbnails',
  'shrink_video_thumbnails',
  'disable_play_on_hover',
  'remove_header',
  'remove_chat',
];

function domStubs() {
  const attrs = {};
  const documentElement = {
    setAttribute: (key, value) => { attrs[key] = String(value); },
    getAttribute: key => (key in attrs ? attrs[key] : null),
    removeAttribute: key => { delete attrs[key]; },
    hasAttribute: key => key in attrs,
    toggleAttribute: () => {},
  };
  return {
    document: {
      documentElement,
      hidden: true,
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    location: { href: 'https://www.youtube.com/watch?v=local' },
    window: {},
  };
}

async function runContentScriptInit() {
  const stubs = domStubs();
  const utils = loadSourceFile('shared/utils.js', stubs);
  const shared = loadSourceFile('shared/main.js');
  loadSourceFile('content-script/main.js', {
    ...stubs,
    qs: utils.qs,
    qsa: utils.qsa,
    resultsPageRegex: utils.resultsPageRegex,
    homepageRegex: utils.homepageRegex,
    shortsRegex: utils.shortsRegex,
    videoPageRegex: utils.videoPageRegex,
    channelRegex: utils.channelRegex,
    subsRegex: utils.subsRegex,
    checkSchedule: utils.checkSchedule,
    DEFAULT_SETTINGS: shared.DEFAULT_SETTINGS,
    migrateRevealSettings: shared.migrateRevealSettings,
  });
  await Promise.resolve();
  return stubs.document.documentElement;
}

describe('Settings persistence across content-script initialization', () => {
  beforeEach(() => resetStorage());

  it('keeps every feature available without account or license state', async () => {
    const seed = {};
    LOCAL_FEATURES.forEach(id => { seed[id] = true; });
    setStorageData(seed);

    const effectiveSettings = await runContentScriptInit();
    LOCAL_FEATURES.forEach(id => {
      assert.strictEqual(effectiveSettings.getAttribute(id), 'true');
    });
    const storedSettings = getStorageData();
    LOCAL_FEATURES.forEach(id => assert.strictEqual(storedSettings[id], true));
  });
});
