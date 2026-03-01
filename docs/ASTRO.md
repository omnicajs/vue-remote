# Astro + Starlight Docs

Astro/Starlight-based documentation site for `@omnicajs/vue-remote`.

## Layout

- Source pages and assets live in `web/`.
- Astro config is in root: `astro.config.ts`.
- Starlight content lives in `web/content/docs/`.
- Static build output goes to `dist-web/`.
- Astro cache is stored in `var/cache/astro/`.
- Service directory `.astro/` in root is a symlink to `var/.astro/`
  (created by `yarn docs:prepare`).

## Notes on compatibility

- Starlight is an Astro integration and does not require React in your project.
- It does not affect `vite`/`vitest` flows used by the library source and tests.
- Docs are built as static HTML, so they are crawler-friendly by default.

## Local development

```bash
yarn install
yarn docs:dev
```

## Build

```bash
ASTRO_TELEMETRY_DISABLED=1 yarn docs:build
```

## Preview

```bash
yarn docs:preview
```

`dist-web/index.html` should be viewed through a web server (`docs:preview` or
`docs:dev`), not opened as a direct `file://` URL.

After build, HTML links are relativized automatically, so IDE local preview
modes (for example PhpStorm `Open in browser`) also load assets correctly.

## GitHub Pages

- Workflow: `.github/workflows/docs-pages.yml`
- It builds docs from `web/` and publishes a composed Pages payload.
- Branch `main` updates `latest` docs at site root.
- Release tags (`v*`) publish immutable snapshots to `versions/<tag>/`.
- Deployment payload is persisted in service branch `docs-pages-store`.
