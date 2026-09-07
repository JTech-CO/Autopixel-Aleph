# AutoPixel-ℵ 2.2.0

This build is **2.2.0 (overlay fix 2)** and discovers official module roles without a fixed filename list. The first connection may take a few seconds. Replace the previous ZIP contents, reload the extension, and reload the game tab.
[한국어](README-KR.md)

Load this folder as an unpacked Chrome extension, disable older copies, and reload the Wplace tab as well as the extension.

Open the official template, calibrate the grid, select an area, choose **Overlay (i)** and **Official auto**, then Start. No second PNG, image dimensions or template anchor are required.

## Official auto

On the map, keep the native template build view visible. The extension reads the official quantized template and comparison state. It temporarily enables the official incorrect-pixel highlight and restores the previous choice when the run ends.

In the Alliance Pixel editor and HQ, the adapter observes the specific template renderer's source data and compares the underlying board canvas. It uses the current dragged placement. If the template was open before the adapter attached, close and reopen the official overlay once.

Transparent/outside cells are not painted. Exact matches are skipped when enabled. Unknown, unloaded or unsupported data never falls through to painting. Completed wrong-color samples are retried at most three times, then left unpainted so the remaining cells can continue. An outstanding sample is awaited before any retry. Current-color mode does not use official-template comparisons.

## Input and speed

Two i presses arm the picker. The first click samples; a new picker-to-paint transition and the expected palette color must be confirmed before the paint click. Equal successive i results do not prove the board is already correct. Repeated colors still require a fresh completed sample.

Safe, Fast and Turbo have ceilings of 10, 20 and 30 px/s. Slow sampling/rendering lowers throughput. There are no catch-up paint bursts.

Rectangle, ellipse, freehand, union/subtraction, modal placement, pause/stop and input guards remain available. PNG snapshot and separate-canvas modes retain the older optional manual workflow.

## Validation and limits

Tests use browser fixtures reflecting public Wplace source, including delayed sampling and 1,000 alternating-color cells. They do not establish live-game error rates or server acceptance. Comparison uses the game's loaded state; another player's changes may not have arrived yet. Versioned site adapters stop on unsupported structures and may need updating after Wplace changes.

Read CHANGES.md and tests/README.md for evidence and test commands. Pixel data stays in browser memory. The extension does not press Save/Publish. Original input engine credit: https://github.com/JTech-CO/wplace-hover
