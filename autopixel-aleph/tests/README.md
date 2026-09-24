# Regression checks

Install Node.js and Playwright in your test environment, then run:

    node autopixel-aleph/tests/regression.cjs

Chrome's standard Windows installation is used by default. Set CHROME_PATH to a Chrome executable
and PLAYWRIGHT_PATH to your installed Playwright package if needed.

The suite uses intercepted local fixture pages only; no game account, server or pixels are modified.
It tests native/nested modal placement and recovery, visible controls, lasso/ellipse masks,
add/subtract, persistence and traversal, guards, exact/transparent skips, repeated runs, stopping,
incremental overlay equality, non-preserved WebGL sampling, unknown-buffer rejection, and
communication between page and isolated extension worlds.

results.json records regression results. benchmark.json compares 80 cells / 160 click events with the
same viewport and default Fast profile, color comparison disabled. Timings vary with machine and load.
The retained snapshots/autopixel-aleph-2.2.0-wplace-update-1 directory is required for this comparison. alliance.png shows the fixture,
not a screenshot from the live game.


The suite covers native composited-canvas snapshots, transparency without a board, explicit full-PNG
anchoring, hook cleanup and 30 fps timing regression checks for the current engine.
throttled-benchmark.json reports the controlled 30 fps results. It validates delayed palette events
in the fixture but does not verify the live site's asynchronous palette/paint acknowledgements.
Public source research in research/ is not needed to run tests and is excluded from distributions.


Also run node autopixel-aleph/tests/native-regression.cjs.
It checks original native template coordinates, 1,000 delayed sampler responses,
same-color transitions, transparent/correct skips, strict speed ceilings,
timeout/incorrect-color stops, and the Alliance modal adapter.
native-results.json contains results; official-auto.png and alliance-auto.png are
local fixtures, not live Wplace screenshots.

The adapter reads observed same-origin script sources, identifies their roles and validates exports before importing matching modules.
Map comparison reads the native build layer. Alliance observation is limited to the
site's semantically identified renderer method; no global WebGL or requestAnimationFrame wrapper is
added. Its WeakMap stores source references rather than copying each frame.


The suite also covers late-created/replaced palettes, completed wrong-color retries,
850ms sampling, and restart after an interrupted request completes.
The benchmark uses the retained 2.2.0 (Wplace update 1) build.

## Overlay connection fix 1

Set NATIVE_SITE_BUILD=current to run the native suite against the newly verified
module filenames; omit it to test the earlier site build.
Additional cases cover updated module names, evicted Resource Timing records,
unknown module names, and known names with incompatible exports.
The optional NATIVE_BASELINE_BRIDGE points to an external pre-fix bridge file for
failure reproduction; normal tests do not require it.
live-module-check.json records a read-only check of actual public site interfaces.
It does not represent live-account painting.


## Overlay connection fix 2

Set NATIVE_SITE_BUILD=renamed and NATIVE_EXPORT_ALIASES=1 to run the full native
suite with arbitrary filenames and renamed exports. The test modules expose
real role interfaces; arbitrary filenames are not added to the adapter.
Coverage includes source discovery, incompatible exports, ignored unrelated
modules, slow reads, recovery after temporary failures, and Stop during discovery.
NATIVE_BASELINE_BRIDGE can point to an external overlay-fix-1 bridge to reproduce
the fixed-filename failure. The regular suite does not need that file.
live-discovery-check.json records the actual site's automatic module discovery
without login or paint actions. Source research is excluded from release ZIPs.


## Wplace update 1

Native Current color now filters the official template to the color selected at
Start. Tests cover all speed presets, matching/transparent/other-color skips,
one paint click per cell, changed selections, live rechecks, Alliance and empty
areas. Manual comparison modes retain their existing behavior.

Native Overlay Turbo targets 25 px/s with at least 1/30 second between paint
clicks. A 120-cell test adds frame-delayed hover, 18ms sample responses and deferred
palette focus. The separate 1,000-cell test includes longer variable delays, so
its throughput is expected to be lower. These are local fixtures, not measurements
of a logged-in user's game or server persistence.

## Live overlay fix 1

Tests replace template buffers and map layers, mutate existing pixels, update
Alliance render sources, and reveal changes in already visited cells. They also
cover replacement during sampling, stale progress with identical bounds, temporary
layer removal, final-pass checks, Stop and unchanged calibration/selection.
Ordinary paint progress must not restart a run. LIVE_BASELINE=1 uses the saved
pre-fix sources in snapshots/autopixel-aleph-2.2.0-wplace-update-1/ to reproduce the missed-cell failure.
Native reads detect source and placement changes; batches of up to 128 visited
cells are checked every 250ms, with a full check before finishing.
These checks do not keep painting after a completed run.

## Variable fill 1

Variable fill is off by default and is offered only for native Overlay.
The first cell and each changed color still use two i presses and a completed
sample. A verified same-color cell can use one paint click. Every click retains
the native comparison and palette check. Pause/resume, template revisions,
pending samples and new runs invalidate reuse. Current color filtering is unchanged.

Cases cover mixed and solid runs, all speed ceilings, skips, palette changes
during pacing, pause/Stop, stale replies, incorrect samples, native failures,
Alliance and live template replacement. The mixed 1,000-cell fixture uses 100
samples and 900 reused colors. Results measure local fixtures, not live server saves.
The pre-change build is in snapshots/autopixel-aleph-2.2.0-live-overlay-fix-1.
