# Development

This guide contains repository-specific setup and maintenance notes. End-user installation and usage stay in the project [`README.md`](../README.md).

## References

- Architecture overview: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- Astro docs setup and publishing notes: [`docs/ASTRO.md`](./ASTRO.md)
- Docs source: `web/content/docs/`

## Local setup

Install dependencies with Yarn:

```bash
yarn install
```

or via the Docker-based helper:

```bash
make node_modules
```

## Common commands

Run unit and integration tests:

```bash
yarn test
```

Run browser e2e tests:

```bash
yarn test:e2e
```

Run the full coverage pipeline:

```bash
make tests-all-coverage
```

Run eslint:

```bash
yarn lint
```

Build the package:

```bash
yarn build
```

Build the docs site:

```bash
yarn docs:build
```

## Local Vue tooling bridge

For remote SFCs you can point Vue tooling to the local bridge file while working inside this repository:

```json
{
  "vueCompilerOptions": {
    "plugins": [
      "./tooling.cjs"
    ]
  }
}
```

Remote-native ref inference stays scoped to `*.remote.vue` files and SFCs marked with `remote` on `script` / `script setup`. If you change the local tooling implementation, rebuild with `yarn build` so the IDE reloads the updated `dist/tooling.*` files.
