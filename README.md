# AutoPixel-ℵ

Chrome extension for painting selected areas on Wplace.
Current build: **2.2.0 (overlay fix 2)**.

[한국어](README-KR.md) | [Quick start](HOW-TO-USE.md) | [Changes](CHANGES.md)

## Install

1. Extract the ZIP and open chrome://extensions.
2. Enable Developer mode, choose **Load unpacked**, and select the autopixel-aleph folder.
3. Disable older copies and reload the Wplace tab. Reload the extension after updating its files.

## Features

- Rectangle, ellipse and freehand selection with add/subtract.
- Official template comparison on the map and in Alliance, without an extra PNG.
- Transparent-cell skipping and optional matching-color skipping.
- Color confirmation before painting, with unconfirmed cells left unpainted.
- Safe/Fast/Turbo ceilings of 10/20/30 px/s.

Keep the official template in build view and use **Overlay (i)** with **Official auto**.
The first connection may take a few seconds. **Current color** does not compare the official template.
Manual PNG and separate-canvas comparison modes are also available.

Pixel data is processed in the browser. Save and Publish buttons are not pressed.
[Privacy policy](privacy-policy.html) | Input engine: [wplace-hover](https://github.com/JTech-CO/wplace-hover)
