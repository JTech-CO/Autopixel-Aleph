# AutoPixel

> 2.2.0: native template comparison without a second PNG, verified sampling, and 10/20/30 px/s ceilings.

**English** | [한국어](README-KR.md)

Automation tools for placing pixels on [wplace.live](https://wplace.live/) and
[youplace.live](https://youplace.live/) from a template overlay.

| | [**AutoPixel-ℵ**](autopixel-aleph/README.md) | [AutoPixel](legacy/README.md) |
|---|---|---|
| Platform | Chrome / Chromium extension (MV3) | Windows + AutoHotkey v2 |
| Input | Synthetic events inside the page | Real mouse and keyboard |
| Uses your cursor | No | Yes, for the whole run |
| Status | Maintained | Frozen, see [LEGACY.md](legacy/LEGACY.md) |

## AutoPixel-ℵ

Select a rectangle, ellipse or freehand outline over your template and it walks the grid, one synthetic click sequence per cell. The
waits between the steps are render frames rather than fixed sleeps, which is where the speed comes
from; the approach is adapted from
[JTech-CO/wplace-hover](https://github.com/JTech-CO/wplace-hover).

- [README](autopixel-aleph/README.md) · [How to use](autopixel-aleph/HOW-TO-USE.md)
- Install: `chrome://extensions` → Developer mode → **Load unpacked** → `autopixel-aleph/`

## Layout

```text
AutoPixel/
├── autopixel-aleph/ # Chrome extension (v2.2.0) — the active build
├── autopixel-x/     # Original extension — unchanged
├── legacy/          # Frozen AHK release and Aleph 2.1.4 copy
├── README.md
└── README-KR.md
```

## ⚠️ Disclaimer

Both tools automate input. These sites may restrict automation, and **you are solely responsible**
for the consequences, including account action. Use only your own account and paint charges.
MIT licensed.
