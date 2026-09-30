# Next version action

[![GitHub Super-Linter](https://github.com/alfred82santa/action-next-version/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/alfred82santa/action-next-version/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/alfred82santa/action-next-version/actions/workflows/check-dist.yml/badge.svg)](https://github.com/alfred82santa/action-next-version/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/alfred82santa/action-next-version/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/alfred82santa/action-next-version/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

A GitHub Action that calculates the next version of your package. It supports
[Semantic Versioning](https://semver.org) and
[PEP 440](https://peps.python.org/pep-0440/) (Python), and it numbers
prereleases automatically by looking at the releases already published in your
repository.

Typical uses:

- Publish a new `beta` or `rc` prerelease on every push, without tracking the
  prerelease number yourself.
- Bump the major, minor or patch part of a version in a release workflow.
- Split a version into its parts (major, minor, patch, prerelease type and
  number) to build tags such as `v1` and `v1.4`.

## Quick start

```yaml
permissions:
  contents: read

jobs:
  next-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Get current version
        id: current-version
        run:
          echo "version=$(node -p "require('./package.json').version")" >>
          "$GITHUB_OUTPUT"

      - name: Calculate next version
        id: next-version
        uses: alfred82santa/action-next-version@v1
        with:
          version: ${{ steps.current-version.outputs.version }}
          versionFormat: semver
          level: beta

      - name: Print next version
        env:
          NEXT_VERSION: ${{ steps.next-version.outputs.version }}
        run: echo "Next version is $NEXT_VERSION"
```

If `package.json` contains `1.4.0` and the repository already has the releases
`v1.4.0-beta.0` and `v1.4.0-beta.1`, the output `version` is `1.4.0-beta.2`.

## How it works

The action takes a base version and a level, and calculates the next version
from them.

**Stable levels (`major`, `minor`, `patch`)** increase the base version. They do
not look at existing releases.

**Prerelease levels (`rc`, `beta`, `alpha`, `dev`)** keep the base version's
major, minor and patch numbers as they are and add a prerelease number. For
this, the action:

1. Lists the GitHub releases of the repository. It reads releases, not plain Git
   tags.
1. Extracts a version from each release tag with `releaseTagPattern`.
1. Keeps the versions that are prereleases of the same level for the same base
   version (for example, every `1.4.0-beta.N`).
1. Increases the highest number found by one. If no match exists, it starts at
   `0`.

Because prerelease levels do not increase the base version, the base version
must already be the version you are preparing. For example, keep `1.5.0` in
`package.json` while you publish `1.5.0-beta.N` prereleases.

**`none`** returns the base version without changes. Use it to get the version
parts as outputs, for example `baseReleaseMinor`.

### Results by level

This table uses `1.4.0` as the base version.

| Level   | Existing releases           | `semver` result | `pep440` result |
| ------- | --------------------------- | --------------- | --------------- |
| `major` | (not used)                  | `2.0.0`         | `2.0.0`         |
| `minor` | (not used)                  | `1.5.0`         | `1.5.0`         |
| `patch` | (not used)                  | `1.4.1`         | `1.4.1`         |
| `none`  | (not used)                  | `1.4.0`         | `1.4.0`         |
| `rc`    | none                        | `1.4.0-rc.0`    | `1.4.0rc0`      |
| `rc`    | `v1.4.0-rc.2` / `v1.4.0rc2` | `1.4.0-rc.3`    | `1.4.0rc3`      |
| `beta`  | none                        | `1.4.0-beta.0`  | `1.4.0b0`       |
| `alpha` | none                        | `1.4.0-alpha.0` | `1.4.0a0`       |
| `dev`   | none                        | `1.4.0-dev.0`   | `1.4.0.dev0`    |
| `dev`   | `v1.4.0.dev3` (PEP 440)     | (not used)      | `1.4.0.dev4`    |

With PEP 440, the action also recognises existing prereleases written as
`beta`/`b` and `alpha`/`a`, and with `-`, `_` or `.` separators, for example
`1.4.0-beta.1`.

## Inputs

- `version` (required): base version, usually the current version of your
  package.
- `versionFormat` (default `semver`): version format, `semver` or `pep440`.
- `level` (default `patch`): level to calculate. One of `none`, `major`,
  `minor`, `patch`, `rc`, `beta`, `alpha` or `dev`.
- `releaseTagPattern` (default below): regular expression that selects release
  tags. Its first capture group must contain the version.
- `token` (default `${{ github.token }}`): token used to list the repository
  releases. It needs read access to the repository contents.
- `build` (optional): build metadata to append to the version with `+`, for
  example a commit SHA.

The default `releaseTagPattern` matches tags made of `v` followed by a version,
such as `v1.4.0`, `v1.4.0-rc.1` or `v1.4.0b2`:

```text
^v((?:[1-9][0-9]*|0)(?:\.(?:[1-9][0-9]*|0))*(?:[\.\-_+]?[a-zA-Z](?:[\.\-_+0-9a-zA-Z]+)?)?)$
```

If your tags have another prefix, for example `my-package-1.4.0`, set your own
pattern and keep the version in the first capture group:

```yaml
with:
  releaseTagPattern: '^my-package-(.+)$'
```

If the action cannot list the releases, for example because the token lacks
permission, it does not fail. It starts the prerelease number at `0` instead.
Enable
[debug logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/enabling-debug-logging)
to see which releases it found.

## Outputs

The example values are for the next version `1.4.0-rc.3` with `build: abc123`.

| Output             | Example             | Description                     |
| ------------------ | ------------------- | ------------------------------- |
| `version`          | `1.4.0-rc.3+abc123` | Next version, with build part.  |
| `versionNoBuild`   | `1.4.0-rc.3`        | Next version, no build part.    |
| `baseRelease`      | `1.4.0`             | Major, minor and patch parts.   |
| `baseReleaseMinor` | `1.4`               | Major and minor parts.          |
| `major`            | `1`                 | Major part.                     |
| `minor`            | `4`                 | Minor part.                     |
| `patch`            | `0`                 | Patch part.                     |
| `isPrerelease`     | `true`              | `true` for prereleases only.    |
| `prereleaseType`   | `rc`                | `rc`, `beta`, `alpha` or `dev`. |
| `prereleaseNumber` | `3`                 | Prerelease number.              |
| `build`            | `abc123`            | Build part, if `build` is set.  |

For stable versions, `isPrerelease`, `prereleaseType` and `prereleaseNumber` are
empty. Test `isPrerelease` as a truthy value, for example
`if: ${{ steps.next-version.outputs.isPrerelease }}`.

The action also writes a table with every output to the job summary.

## Examples

### Publish a prerelease on every push

This workflow publishes a `beta` prerelease for each push to `main` and an `rc`
prerelease for each push to a `release/*` branch.

```yaml
on:
  push:
    branches:
      - main
      - release/*

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Get current version
        id: current-version
        run:
          echo "version=$(node -p "require('./package.json').version")" >>
          "$GITHUB_OUTPUT"

      - name: Calculate next version
        id: next-version
        uses: alfred82santa/action-next-version@v1
        with:
          version: ${{ steps.current-version.outputs.version }}
          versionFormat: semver
          level:
            ${{ startsWith(github.ref_name, 'release/') && 'rc' || 'beta' }}

      - name: Create release
        env:
          GH_TOKEN: ${{ github.token }}
          VERSION: ${{ steps.next-version.outputs.version }}
        run:
          gh release create "v$VERSION" --prerelease --generate-notes --target
          "$GITHUB_SHA"
```

### Python package with PEP 440

```yaml
- name: Calculate next version
  id: next-version
  uses: alfred82santa/action-next-version@v1
  with:
    version: ${{ steps.current-version.outputs.version }}
    versionFormat: pep440
    level: dev
```

With the base version `2.1.0` and no earlier `dev` release, the output `version`
is `2.1.0.dev0`.

### Move the major and minor tags

Use `level: none` with the version you release to get `major` and
`baseReleaseMinor`, then update tags such as `v1` and `v1.4`. This repository's
own [release workflow](.github/workflows/common-make-release.yml) does this.

## Development

The action is written in TypeScript and bundled with
[`ncc`](https://github.com/vercel/ncc) into [`dist/index.js`](dist/index.js),
which is the file GitHub runs. You need Node.js 24 or later; the exact version
is in [`.node-version`](.node-version).

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm install`          | Installs the dependencies.                    |
| `npm test`             | Runs the Jest tests with coverage.            |
| `npm run lint`         | Runs ESLint.                                  |
| `npm run format:check` | Checks formatting with Prettier.              |
| `npm run bundle`       | Formats the code and rebuilds `dist/`.        |
| `npm run all`          | Formats, lints, tests, updates badge, builds. |

Commit the rebuilt `dist/` directory with your changes. The
[Check dist/](.github/workflows/check-dist.yml) workflow fails if `dist/` does
not match the source.

The source lives in [`src/`](src):

- [`main.ts`](src/main.ts): entry point. Reads the inputs, picks the version
  format and sets the outputs.
- [`action.ts`](src/action.ts): reads and validates inputs, and writes the
  outputs and the job summary.
- [`github.ts`](src/github.ts): lists the repository releases and extracts their
  versions.
- [`semver.ts`](src/semver.ts): calculates the next Semantic Versioning version.
- [`pep440.ts`](src/pep440.ts): calculates the next PEP 440 version.

### Releases of this action

This repository uses its own action to publish releases:

- Every push to `main` publishes a `beta` prerelease, and every push to a
  `release/*` branch publishes an `rc` prerelease
  ([push-code.yml](.github/workflows/push-code.yml)).
- The **Manual make release** workflow publishes a stable release or a chosen
  prerelease, and can move the `vX` and `vX.Y` tags
  ([manual-make-release.yml](.github/workflows/manual-make-release.yml)).
- The **Increase version** workflow opens a pull request that bumps the version
  in `package.json`
  ([manual-increase-version.yml](.github/workflows/manual-increase-version.yml)).
  A push to a new `release/*` branch does the same for `main` automatically
  ([push-release-new-version.yaml](.github/workflows/push-release-new-version.yaml)).

## License

[GNU Affero General Public License v3.0](LICENSE)
