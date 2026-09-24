# AutoPixel-ℵ

Chrome extension exclusively for painting selected areas on Wplace.
Current build: **2.2.1 (Variable fill 1)**.

[한국어](README-KR.md) | [Quick start](HOW-TO-USE.md) | [Changes](CHANGES.md)

## Install

1. Extract the ZIP and open chrome://extensions.
2. Enable Developer mode, choose **Load unpacked**, and select the autopixel-aleph folder.
3. Disable older copies and reload the Wplace tab. Reload the extension after updating its files.

## Features

- Rectangle, ellipse and freehand selection with add/subtract.
- Official template comparison on the map and in Alliance, without an extra PNG.
- Optional **Variable fill** reuses verified colors on same-color cells. Enable it under Overlay (i).
- Live template changes recheck the selected area without recalibration or a page reload.
- Transparent-cell skipping and optional matching-color skipping.
- Color confirmation before painting, with unconfirmed cells left unpainted.
- Safe 10 and Fast 20 px/s; Turbo targets 25 for sampling and 30 for verified color reuse or Current color.

Keep the official template in build view and use **Overlay (i)** with **Official auto**.
The first connection may take a few seconds. **Current color** paints only template cells matching the color selected at Start, skipping transparent and completed cells when matching-color skipping is enabled.
Manual PNG and separate-canvas comparison modes are also available.

Pixel data is processed in the browser. Save and Publish buttons are not pressed.
[Privacy policy](https://jtech-co.github.io/Autopixel-Aleph/autopixel-aleph/privacy-policy.html) | Input engine: [wplace-hover](https://github.com/JTech-CO/wplace-hover)
