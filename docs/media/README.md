# README media

Screenshots used by the root [README](../../README.md) and the full
[screenshot tour](../SCREENSHOTS.md).

## What's here

| | Count | Format |
|---|---|---|
| Desktop screens | 28 | PNG, 1600px wide |
| Phone companion | 8 | JPEG, 1200px tall (`mobile/phone-*.jpg`) |
| Responsive web | 16 | PNG, 900px tall (`mobile/responsive-*.png`) |

Roughly 9 MB in total.

## How these were produced

The raw captures (1920×866 desktop, full-resolution phone shots) live in
`_local/mockups-raw/`, which is untracked — only the processed copies are
committed, so the repo carries one copy rather than two.

`_local/process_shots.py` does the conversion:

1. **Crops the bottom 66px** of every desktop shot. That strip carries the
   `NetworkStatus` badge (`Network TUNNEL` / `Network LOCAL`), a development-only
   component that would otherwise appear in every screenshot of a supposedly
   finished product.
2. **Downscales** to 1600px wide (desktop) or 1200px tall (phone) and re-encodes.
3. **Blurs nothing** — `REDACTIONS` is intentionally empty. The mechanism is kept
   so a future screenshot can be redacted by adding one line.

To regenerate after re-capturing, put the new files in `_local/mockups-raw/` and:

```bash
./astro-engine/venv/Scripts/python.exe _local/process_shots.py
```

> The script needs Pillow, which is installed in the astro-engine venv but is
> **not** in `requirements.txt` — it is a documentation tool, not a runtime
> dependency of the engine.

## Adding a new screenshot

1. Capture at 1920 wide, signed in, **after dark** — a midday capture shows an
   empty sky and near-zero scores, which makes the product look broken.
2. Drop it in `_local/mockups-raw/`, add a `raw name -> published name` entry to
   `DESKTOP` in the script, and re-run it.
3. Reference the published name from `README.md` or `SCREENSHOTS.md`.
