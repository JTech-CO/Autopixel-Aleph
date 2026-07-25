# wplace hover

> Automatically presses i and performs two clicks after the pointer remains still on one location at wplace.live.

## Overview

When the pointer stays within a 4 px radius for the selected dwell time, the extension runs this sequence:

```text
I key: keydown → keypress → keyup → click → click
```

The sequence runs once per location. Moving the pointer outside the tolerance radius or using the mouse wheel arms the trigger again.

## Features

- Dwell detection from **0.1 to 0.5 seconds** in 0.1-second increments
- Default dwell time of **0.5 seconds** for new installations
- Compact Shadow DOM panel with enable/disable and dwell controls
- High-visibility 6 px progress bar that remains visible while the panel is collapsed
- Local preference persistence through `chrome.storage.local`
- Manual `i` trigger support: pressing `i` yourself performs only the two clicks
- No dependencies and no build step

## Installation

1. Open `chrome://extensions` in a Chromium-based browser.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `wplace-hover` directory.
5. Open `https://wplace.live/`.

## Panel Controls

| Control | Values | Default | Purpose |
|---|---:|---:|---|
| Toggle | On / Off | On | Enables or disables automatic dwell triggering |
| Dwell | 0.1 / 0.2 / 0.3 / 0.4 / 0.5 s | 0.5 s | Sets how long the pointer must remain still |
| Collapse | Expanded / Collapsed | Expanded | Hides the slider while keeping the progress bar visible |

## Technical Details

- **Platform:** Chrome Extension, Manifest V3
- **Language:** Vanilla JavaScript
- **UI isolation:** Shadow DOM
- **APIs:** KeyboardEvent, PointerEvent, MouseEvent, requestAnimationFrame, chrome.storage.local
- **Content-script scope:** `wplace.live` and its subdomains

The input hold and sequence gap use render-frame waits instead of fixed millisecond delays. `HOLD_FRAMES = 2` keeps the synthetic key and mouse buttons active long enough for frame-based canvas input handlers while remaining fast. A timeout fallback prevents a sequence from hanging when animation frames are throttled.

The extension does not run while the tab is hidden, the window is unfocused, the pointer is over the panel, or the user is typing in an input field.

## Configuration Constants

```js
const TRIGGER_KEY = 'i';
const MOVE_TOL = 4;
const HOVER_UNIT = 100;
const HOLD_FRAMES = 2;
const GAP_FRAMES = 1;
```

## Project Structure

```text
wplace-hover/
├── manifest.json
├── content.js
├── icons/
│   ├── logo16.png
│   ├── logo48.png
│   └── logo128.png
├── privacy-policy.html
└── README.md
```

## Privacy

The extension makes no network requests and collects no personal data. It stores only the enabled state, dwell time, and panel collapse state locally on the device.

See [privacy-policy.html](privacy-policy.html) for the complete policy.

## License

MIT
