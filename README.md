# AutoPixel-ℵ

**English** | [한국어](README-KR.md)

> A Chrome extension that fills a selected area on wplace.live or youplace.live from your template
> overlay, one synthetic click per pixel. Your cursor is never touched.

## Speed

One cell = `pointermove` > `i` (eyedropper) > click > click, with render-frame waits between the
steps. Measured on a 60 Hz display.

| Preset | ms / cell | px / s |
|---|---|---|
| Safe | 336 | 3.0 |
| Fast *(default)* | 91 | 11.0 |
| Turbo | 68 | 14.7 |
| Turbo + `Current` colour | 51 | 19.5 |

Turbo runs flat out; Fast and Safe are paced to 75 % and 50 % of it. Delay and jitter default to 0.

## Install

No build step, no dependencies.

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked**, select the `autopixel-x` folder.
3. Open `https://wplace.live/` or `https://youplace.live/` with your template overlay showing.

## Use

Everything is in the panel; there are no keyboard shortcuts.

1. **Calibrate**, click the centre of any cell, then a cell `Apart` cells away (default 10).
2. **Select area**, drag a box over the part of the template you want filled.
3. **Start**.

Full guide: [HOW-TO-USE.md](HOW-TO-USE.md).

## Info

- **Version** 2.1.2, MIT licensed
- **Platform** Chrome / Chromium, Manifest V3. Vanilla JavaScript, no remote code
- **Privacy** [privacy-policy.html](<https://jtech-co.github.io/Autopixel-Aleph/privacy-policy.html>). Nothing is collected or transmitted
- **Credits** input-engine approach adapted from
  [JTech-CO/wplace-hover](https://github.com/JTech-CO/wplace-hover) (MIT)

## Disclaimer

An automation tool. These sites may restrict automation and **you are solely responsible** for the
consequences, including account action. Use only your own account and paint charges.
