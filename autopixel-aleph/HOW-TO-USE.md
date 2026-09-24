# Quick start

1. After installing or updating, reload the extension and the Wplace tab.
2. Open the official template in build view.
3. Calibrate the grid and select a rectangle, ellipse or freehand area.
4. Choose **Official auto** with **Overlay (i)** or **Current color**.
5. Select Safe, Fast or Turbo, then press **Start**.

Safe and Fast have 10/20 px/s ceilings. Turbo targets 25 for Overlay and 30 for Current color. The first connection may take a few seconds.
No extra PNG or template dimensions are needed. Transparent cells are skipped; matching colors are skipped when enabled.

During a run, template changes recheck the same area automatically. After completion, press Start again for a new template. Calibration and selection are kept unless the view moves or zooms.

Enable **Variable fill** below Overlay (i) to sample once per same-color run. It is off by default and requires Official auto. Turbo targets 25 px/s while sampling and 30 px/s while reusing a verified color.

Current color paints only template cells of the color selected at Start. A changed selection stops the run.

If an Alliance template cannot be read, close and reopen it. Cells that fail color confirmation remain unpainted.
Use **Stop** to end a run.

[Installation and features](README.md)
