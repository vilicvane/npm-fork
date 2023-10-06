[![NPM version](https://img.shields.io/npm/v/npm-fork?color=%23cb3837&style=flat-square)](https://www.npmjs.com/package/npm-fork)
[![Repository package.json version](https://img.shields.io/github/package-json/v/vilic/npm-fork?color=%230969da&label=repo&style=flat-square)](./package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-999999?style=flat-square)](./LICENSE)

# npm-fork

Publish forks of npm packages with ease.

Occasionally, we fork an npm project to fix some bugs or add some features. But to publish the forked package, we have to manually change the package name and version in `package.json` and JavaScript files. This tool automates the process and leave the source code untouched.

## What it does?

1. It patches `package.json` and JavaScript files (using `npm-packlist`) with different/additional scope and prerelease versions.
2. It runs `npm publish` to publish the forked packages.
3. It runs `git restore .` to reset the patches after publishing.

## Installation

```sh
npm install --global npm-fork
```

## Usage

Commit or stage your changes and then use `npm-fork patch` to apply patches to the current project:

```sh
# single package
npm-fork patch --scope "@fork"

# multiple packages
npm-fork patch --scope "@fork" --package "name" --package "@origin/*"
```

Or directly `npm-fork publish`:

```sh
npm-fork publish --scope "@fork"
```

## License

MIT License.
