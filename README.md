# DayCounter

Did I take my pill today? Tap the phone on an NFC tag and know for sure.

**Live:** https://joanp6.github.io/DayCounter/

## How it works

An NFC tag (NTAG213) stuck on a drawer holds the URL `https://joanp6.github.io/DayCounter/?nfc=1`.
Tapping it with an Android phone opens the page, which:

- records today's intake with the current time if there is none yet → **✅ Registrado hoy a las HH:MM**;
- otherwise does nothing and shows **Ya registrado hoy a las HH:MM**, with a *Corregir hora* button;
- removes `?nfc=1` from the URL, so reloading never records twice.

Opening it without the parameter (app icon, reload) only shows today's status, with a manual *Registrar ahora* button.
One intake per calendar day, in the device's local time zone.

## Privacy

There is no backend and no analytics. Records live only in the browser's `localStorage` on your phone.

## Stack

Static site served from GitHub Pages: vanilla HTML, CSS and ES modules, with no framework and no build step.
It's an installable PWA (manifest + service worker with an offline cache).

```
app/            # published to GitHub Pages
├─ index.html
├─ styles.css
├─ manifest.webmanifest
├─ sw.js
├─ icons/
└─ src/
   ├─ core.js     # pure logic: dayKey, register, editTime (clock injected)
   ├─ storage.js  # localStorage adapter (all access in try/catch)
   └─ main.js     # DOM wiring
```

## Setup

1. **Enable Pages:** repo *Settings → Pages → Source: GitHub Actions*. Every push to `main` deploys `app/`.
2. **Write the tag** with the *NFC Tools* app: *Write → Add a record → URL/URI* → `https://joanp6.github.io/DayCounter/?nfc=1` → *Write*, then hold the NTAG213 tag to the phone. Don't rename the repo afterwards: the URL on the tag would break.
3. **Install the PWA:** open the URL in Chrome on Android → ⋮ menu → *Add to Home screen* → *Install*.

Run locally with any static server, for example `npx serve app`.

## Limitations

- Clearing Chrome's site data deletes the history.
- Android only reads NFC tags while the screen is unlocked.

## License

MIT
