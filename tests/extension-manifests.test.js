const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

describe('browser manifests', () => {
  for (const file of ['src/chrome_manifest.json', 'src/firefox_manifest.json']) {
    it(`${file} includes translation scripts, API access, and package notices`, () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      assert.ok(manifest.content_scripts[0].js.includes('/shared/youtube-translation.js'));
      assert.ok(manifest.content_scripts[0].js.includes('/content-script/youtube-translation.js'));
      const permissions = [...(manifest.permissions || []), ...(manifest.host_permissions || [])];
      assert.ok(permissions.includes('https://www.googleapis.com/youtube/v3/*'));
      const resources = manifest.web_accessible_resources.flatMap(item => typeof item === 'string' ? [item] : item.resources);
      assert.ok(resources.includes('/content-script/translation-page.js'));
      assert.ok(fs.existsSync(path.join(root, 'src/LICENSE-AGPL-3.0-or-later')));
      assert.ok(fs.existsSync(path.join(root, 'src/THIRD-PARTY-NOTICES.md')));
    });
  }
});

describe('translation settings menu', () => {
  it('declares a separate Language and translation section', () => {
    const shared = fs.readFileSync(path.join(root, 'src/shared/main.js'), 'utf8');
    const options = fs.readFileSync(path.join(root, 'src/options/main.js'), 'utf8');
    const bodyStyles = fs.readFileSync(path.join(root, 'src/options/body.css'), 'utf8');
    assert.match(shared, /name: "Language and translation",\s+tags: "Language and translation"/);
    assert.match(options, /name === 'Language and translation'/);
    assert.match(bodyStyles, /#sidebar[\s\S]*overflow-y:\s*auto/);
  });
});
