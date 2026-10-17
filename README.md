# Slop RYS — Unofficial fork
#### A Browser Extension

---

## This fork

Slop RYS is an unofficial fork of [Remove YouTube Suggestions](https://github.com/lawrencehook/remove-youtube-suggestions). It keeps the features free and local by removing the paywall, account system, licensing checks, payment flow, remote donor list, and telemetry. Everything runs in the user's browser without a server.

Slop RYS is not affiliated with the original author, YouTube, Mozilla, or Firefox.

**Every change in this fork was vibe coded.**

---

### What it does
A browser extension that lets you hide recommendations, customize the interface, and take control of your YouTube experience.

---

### Feedback and Support
Share feedback or report an issue:
- [GitHub Issues](https://github.com/Cauan745/slop-remove-youtube-suggestions/issues)
- [Google Form](https://docs.google.com/forms/d/1AzQQxTWgG6M5N87jinvXKQkGS6Mehzg19XV4mjteTK0/edit)

---

### Why I made it
YouTube's recommendation algorithm optimizes for the most _engaging_ videos, not the ones you actually want to watch — and it's easy to lose hours to the rabbit hole. This extension lets you cut the noise and use YouTube on your own terms.

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
./dev.sh chrome      # builds dist/chrome/ — load as unpacked in chrome://extensions
```
