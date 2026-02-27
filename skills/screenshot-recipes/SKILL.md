---
name: screenshot-recipes
description: Use this skill when the user asks to analyze documentation/site visuals or create screenshots via project Make recipes (`shot`, `shot-astro`, `shot-web`) in Docker.
---

# Screenshot Recipes

## When To Use
Use this skill when the user asks to:
- make screenshots of project docs (Astro/Starlight);
- make screenshots of external/public websites;
- compare visual states between pages or resolutions;
- collect image evidence before UI review/analysis.

## Source Of Truth
- `recipies/playwright.mk`
- `scripts/playwright/capture.mjs`
- `docker/astro.yml`
- `docker/playwright.yml`

## Defaults And Rules
- Use Make recipes, not ad-hoc Playwright commands, unless explicitly asked.
- Default screenshot resolution in recipes is `1920x1080`.
- Output directory is `var/screenshots/` unless user requests another path.
- For docs screenshots, prefer `make shot-astro` (it starts `astro` service as needed).
- For external websites, use `make shot-web`.
- Keep filenames explicit and deterministic (`pinia-home.png`, `docs-index-1920.png`, etc.).

## Standard Commands
1. Astro docs screenshot:
```bash
make shot-astro OUT=var/screenshots/astro-home.png
```

2. Astro docs screenshot with custom resolution:
```bash
make shot-astro RESOLUTION=2560x1440 OUT=var/screenshots/astro-home-2560.png
```

3. External website screenshot:
```bash
make shot-web URL=https://pinia.vuejs.org/ OUT=var/screenshots/pinia-home.png
```

4. External website screenshot with custom viewport:
```bash
make shot-web URL=https://example.com RESOLUTION=1366x768 OUT=var/screenshots/example-1366.png
```

5. Full control via base recipe:
```bash
make shot URL=https://example.com WIDTH=1280 HEIGHT=720 WAIT_MS=1500 FULL_PAGE=1 OUT=var/screenshots/example-full.png
```

## Verification
- Check resulting file exists:
```bash
ls -la var/screenshots/<name>.png
```
- Verify final image dimensions:
```bash
file var/screenshots/<name>.png
```

## Reporting Pattern
- Mention which recipe was used.
- Provide exact output path(s).
- Confirm resulting resolution.
