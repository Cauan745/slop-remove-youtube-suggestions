# Third-party notices

## YouTube No Translation

Slop RYS implements user-facing behavior requested from the following project:

<https://github.com/YouG-o/YouTube-No-Translation>

The upstream project is Copyright (C) 2025-present YouGo and contributors. It
is licensed under the GNU Affero General Public License, version 3 or any
later version. The exact AGPL-3.0-or-later text is included in
`LICENSE-AGPL-3.0-or-later` and is included in extension source/package
artifacts. The license text itself is Copyright (C) 2007 Free Software
Foundation, Inc.

Slop RYS does not copy upstream source files, build scripts, dependencies,
locale files, screenshots, icons, logos, website content, or the upstream
project name. The translation controls in `src/shared/youtube-translation.js`,
`src/content-script/youtube-translation.js`,
`src/content-script/translation-page.js`, and the related options files are
independent Slop RYS implementations based on the documented behavior and
public YouTube interfaces. No upstream copyright header is being removed or
rewritten because no upstream source file is copied into those files.

## Slop RYS and existing components

The existing Slop RYS source and assets remain under the repository's Mozilla
Public License, version 2.0, in `LICENSE`. This includes the original RYS
settings, account-removal changes, telemetry-removal changes, local browser
storage behavior, content styling, and existing extension assets. The MPL-2.0
license and its notices remain in the repository and in distributed extension
packages.

This notice does not claim that the repository is MPL-only. The repository
ships both the MPL-2.0 text and the upstream AGPL-3.0-or-later text so the
license and attribution context remains available to users of source and
extension packages.
