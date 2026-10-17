# YouTube translation controls inventory

This inventory was prepared before implementation from YouTube No Translation
commit `847a28da5e2a58b13bc5ca2d68e5f46383907129` (`v2.25.1`), checked out
from <https://github.com/YouG-o/YouTube-No-Translation>.

## Feature inventory

| Upstream user-facing feature | Slop RYS implementation plan |
| --- | --- |
| Keep video titles in their original language | Add local title restoration for watch pages, Shorts, search, home, subscriptions, channel lists, notifications, mini-player, end screens, cards, and document titles. Use page data first, then optional API data. |
| Keep video descriptions in their original language | Restore watch-page, search-result, history, channel-list, and video-card descriptions from page data or the optional API. |
| Restore original thumbnails | Replace translated or altered video thumbnail URLs with the canonical `i.ytimg.com` video thumbnail URL, with a setting to disable the behavior. |
| Select original or a chosen audio track | Inject a small page-context adapter that uses YouTube's player audio-track methods. Support `original` and supported language codes. |
| Select original, chosen, or disabled subtitles | Use the player captions API. Prefer manual tracks, optionally allow matching ASR tracks, and never request a translated track for the original-language mode. |
| Supported language settings | Add language selectors for audio and subtitles, including original and disabled choices where applicable. |
| YouTube Data API v3 option | Store an optional user-supplied API key locally. Fetch only requested video/channel metadata from Google's API when enabled. Never ship a key or send unrelated browsing data. |
| Browser integration | Keep local `storage` settings, popup/options controls, runtime messages, Chrome MV3 service worker compatibility, and Firefox MV2 compatibility. |
| Local privacy behavior | Do not add accounts, telemetry, donor checks, remote configuration, or a required service. Existing Slop RYS behavior remains local and free. |

## Upstream source and dependency inventory

The upstream repository contains TypeScript content, background, popup, and
utility code; injected page-context JavaScript for audio and subtitles; popup
HTML/CSS; localized messages; Chromium, Firefox, old Firefox, and Safari
manifests; build scripts; tests; and image/icon assets. Its package manifest
uses TypeScript, esbuild, Tailwind, web-ext, and webextension-polyfill as
build dependencies, with no runtime dependency required by the behavior being
ported.

Slop RYS does not copy those source files, build files, dependencies, locale
files, screenshots, icons, or names. The new behavior is written against the
existing Slop RYS DOM and storage architecture. The only upstream material
kept in this repository is the exact AGPL-3.0-or-later license text and the
attribution record in `THIRD-PARTY-NOTICES.md`.

## Licensing inventory

| Component | Origin and rights notice | License treatment |
| --- | --- | --- |
| Existing Slop RYS extension source and assets | Slop RYS fork and its original Remove YouTube Suggestions lineage, as documented by the repository | Existing MPL-2.0 `LICENSE` remains in force. No existing notice is removed. |
| New Slop RYS translation-control implementation | Independently written for this repository | Covered by the repository's MPL-2.0 terms unless a file says otherwise. It does not copy upstream source. |
| Upstream YouTube No Translation reference project | YouGo, <https://github.com/YouG-o/YouTube-No-Translation> | `LICENSE-AGPL-3.0-or-later` preserves the exact GNU AGPL v3 text. Attribution and the non-copying scope are recorded in `THIRD-PARTY-NOTICES.md`. |
| Upstream images, icons, screenshots, logos, names, and website content | YouTube No Translation repository | Not copied or distributed. Slop RYS assets and names remain in use. |
| Existing server dependencies | Listed in `server/package-lock.json` with package license metadata | Unchanged. No dependency is copied into the browser extension. |

## Open compatibility limits to test

YouTube changes its DOM and player APIs without notice. The implementation
must fail closed: if original metadata or a requested track is unavailable,
leave the current content alone or disable subtitles according to the setting.
Live YouTube behavior remains a manual-browser test item in addition to unit
tests for parsing, settings, API requests, DOM selectors, and player-track
selection.
