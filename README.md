# Slop RYS, unofficial fork
#### A Browser Extension

---

## This fork

Slop RYS is an unofficial fork of [Remove YouTube Suggestions](https://github.com/lawrencehook/remove-youtube-suggestions). It keeps the features free and local by removing the paywall, account system, licensing checks, payment flow, remote donor list, and telemetry. Everything runs in the user's browser without a server.

Slop RYS is not affiliated with the original author, YouTube, Mozilla, or Firefox.

**Every change in this fork was vibe coded.**
**The owner of this repository has absolutely no clue how the code works. Use Slop RYS at your own risk.**

---

### What it does
A browser extension that lets you hide recommendations, customize the
interface, and keep YouTube metadata in its original language.

Slop RYS now includes these local translation controls:

- Restore original video titles across watch pages, Shorts, search, home,
  subscriptions, channel lists, notifications, and video cards.
- Restore original descriptions and thumbnails where YouTube exposes the
  source metadata.
- Select the original audio track or a preferred audio language.
- Select original subtitles, a preferred subtitle language, or disable
  subtitles. Automatic subtitles are optional.
- Use an optional personal YouTube Data API v3 key for title, description,
  thumbnail, and channel lookups when page data is not available.

The translation controls do not add an account, telemetry, donor check, or
required remote service. Settings and the API key stay in browser storage.
The API key is sent only to Google's YouTube Data API when that option is
enabled.

The existing RYS controls remain available, including recommendation removal,
Shorts controls, playback controls, account-removal behavior, and local
telemetry-disabled behavior.

### YouTube Data API setup

The API is optional. To use it, create a YouTube Data API v3 key in your own
Google Cloud project, enable the YouTube Data API v3, then open Slop RYS
settings and enable "Use YouTube Data API v3 for metadata". Paste the key into
the local API-key field. Slop RYS does not provide or share an API key.

Without an API key, the extension uses metadata already present in the page,
YouTube's player metadata endpoint, and YouTube's oEmbed endpoint when needed.

### Attribution and licensing

The translation feature was independently implemented to match the practical
user-facing behavior of [YouTube No Translation](https://github.com/YouG-o/YouTube-No-Translation),
Copyright (C) 2025-present YouGo and contributors. No upstream source code,
branding, icons, screenshots, or dependencies were copied. See
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the feature and license
inventory.

The existing Slop RYS code remains under the [MPL-2.0](LICENSE). The exact
upstream [AGPL-3.0-or-later](LICENSE-AGPL-3.0-or-later) text is also included
in this repository and in extension packages. The combined project is not
represented as MPL-only.

---

### Feedback and Support
Share feedback or report an issue:
- [GitHub Issues](https://github.com/Cauan745/slop-remove-youtube-suggestions/issues)

---

### Why I made it
YouTube's recommendation algorithm optimizes for the most _engaging_ videos,
not the ones you actually want to watch. It is easy to lose hours to the
rabbit hole. This extension lets you cut the noise and use YouTube on your
own terms.

The fork is currently distributed from its GitHub repository. A signed Mozilla Add-ons release can be added later.

---

### Development
This project is 100% open source. The original project was created by [Lawrence Hook](https://lawrencehook.com); this fork is maintained independently.

Have a feature request or found a bug? Create a [GitHub issue](https://github.com/Cauan745/slop-remove-youtube-suggestions/issues) or submit a pull request.

```bash
git clone https://github.com/Cauan745/slop-remove-youtube-suggestions.git
cd slop-remove-youtube-suggestions
npm install --global web-ext

./dev.sh firefox     # opens Firefox with the extension loaded
./dev.sh chrome      # builds dist/chrome/; load as unpacked in chrome://extensions
```

For Firefox, `./dev.sh firefox` runs the source tree with the Firefox
manifest. For Chrome, `./dev.sh chrome` copies the source tree to
`dist/chrome/` and uses the Chrome manifest. Both builds include the MPL-2.0
license, the AGPL-3.0-or-later license text, and third-party notices.
