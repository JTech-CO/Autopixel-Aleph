# AutoPixel-ℵ: How to use (v2.1.4)

Per cell: **pointer move > `i` (colour pick) > click > click**, with render-frame waits between the
steps. Nothing touches your real cursor.

Everything is driven from the panel. There are no keyboard shortcuts.

## 1. Setup

1. `chrome://extensions` > **Developer mode** > **Load unpacked** > the `autopixel-x` folder.
2. Open `https://wplace.live/` or `https://youplace.live/` and bring up your template overlay on
   the map.
3. The panel appears at the top left. Drag it by its header to move it, and use the chevron at its
   top right to collapse it to a third of its height. Collapsed it still shows the progress bar,
   Start / Stop and the status line, so you can leave it that way during a run.
4. Drag the bottom edge to make the panel shorter. Only the padding shrinks, never the type, and it
   stops at the height the content needs, so nothing is ever clipped. It cannot be made taller than
   its default.

`Overlay (i)` mode needs the template overlay drawn on the map, because the site's `i` eyedropper
picks the colour under the pointer. Without one, switch the colour source to `Current` and pick a
palette colour yourself.

A non-Latin IME does not need switching off: a `KeyI` event is dispatched directly, so input-method
state is irrelevant.

## 2. Calibrate

Do this once per zoom level.

1. Click **Calibrate**. The screen switches to a crosshair.
2. Click the **centre of any cell**, then the centre of a cell **`Apart` cells away** (default 10).
3. The panel reports the measured size, e.g. `12.40 px`.

**Stop** cancels an in-progress calibration, and so does clicking **Calibrate** again.

A bigger `Apart` is more accurate: measuring one cell multiplies its error across the whole run,
measuring across many divides it. For drawings around 65 cells wide, 10 to 20 works well.

If the grid does not sit on the template, the two controls on the `Cell` row fix it: `-` / `+`
change the cell size by 0.05 px, and the arrows next to them shift the whole grid by one pixel.

Changing zoom or resizing the window invalidates the calibration; the panel says so.

## 3. Select an area

Click **Select area** and drag a box over the template. On release it snaps to the grid and the
readout shows `8 x 5 = 40 px`.

- **Show grid** toggles the grid lines (drawn when cells are 5 px or larger and the area is 40,000
  cells or fewer).
- The arrows on the `Area` row move the area one cell at a time. **Clear** resets the area only.
- Cells outside the viewport cannot be clicked. The status line reports `N off-screen`.

## 4. Settings

### Speed

| Preset | Frames | Pace | ms / cell at 60 Hz | px / s |
|---|---|---|---|---|
| **Safe** | 10 | 50 % | 336 | 3.0 |
| **Fast** (default) | 4 | 75 % | 91 | 11.0 |
| **Turbo** | 4 | 100 % | 68 | 14.7 |

Turbo runs flat out. Fast has the same input timing and is simply held to 75 % of the rate the run
would otherwise reach. Safe is held to 50 % and keeps longer holds, which is what makes it the tier
to fall back to when cells get missed. The pace is measured per cell rather than assumed, because
once the site itself is the bottleneck an extra frame wait disappears into work the page was doing
anyway.

**Custom** exposes the four underlying values and is never paced (use Delay instead):

- **move** frames to wait after moving the pointer, so the page registers the new position
- **hold** frames a key or button stays down. At least 1, or inputs get dropped
- **gap** frames between steps
- **click** clicks per cell, 2 by default

If cells start getting missed, raise **hold** first.

### Colour, order, limits

- **Overlay (i)** presses `i` on every cell to read the template colour. **Current** skips `i` and
  paints with the palette colour already selected, about a third faster, good for solid fills.
- **Snake** (default), **Rows**, **Cols**, **Random**. No cursor actually travels, so none is faster
  than the others; Random just avoids a predictable sweep.
- **Delay** ms between cells and **Jitter** % around it, both 0 by default. **Limit** caps the cells
  painted in one run, useful for pacing against your paint charges.

### Guards

- **Map guard** stops the run on a wheel, drag or keystroke. Map movement invalidates the
  calibration, so leaving this on is the safe choice.
- **Canvas only** skips a cell that does not land on a drawing surface, so the run never clicks one
  of the site's own buttons. The surface is learned from where you calibrated, and any `<canvas>`
  counts, so a template overlay stacked on the map is fine. Cells it rejects are reported as
  `N covered by the page`.

The run also pauses when the tab stops being visible, and resumes when you come back.

## 5. Run

Click **Start**. Progress shows as `120 / 400 · 14.6 px/s · 19s` and painted cells shade in on the
overlay. The same button becomes **Pause** and then **Resume**; **Stop** ends the run. The estimate
shown before starting uses the frame interval measured on this machine, so it holds on a 120 Hz
display too.

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| Nothing gets painted | Tab focused and visible? Try `Safe`. Keep `hold` at 1 or more |
| Cells missed, or wrong colours | Raise `hold` and `gap`, or confirm with `Safe` |
| Grid drifts off the template | Fine-tune with `-` / `+` and the grid arrows on the `Cell` row, or recalibrate with a larger `Apart` |
| `N off-screen` | Part of the area is outside the window. Pan the map or shrink the area |
| `N covered by the page` | Those cells sit under the site's own UI. Scroll it away or move the area |
| `"Canvas only" rejected every cell` | The guard could not recognise this site's drawing surface. Recalibrate so it learns from your click, or untick **Canvas only** |
| Pauses immediately | **Map guard** saw a real click, scroll or keystroke |
| Slower than the estimate | Background tabs get throttled frames. Keep the tab in front |
| Colours are not the template's | Confirm the overlay is drawn and the source is `Overlay (i)` |

## 7. Cautions

- Do not move the map while a run is going. Any pan or zoom throws every coordinate off.
- This spends paint charges. Check `W x H` before starting, and use `Limit` to work in batches.
- Automation may be against the site's rules, and you are responsible for the consequences.
