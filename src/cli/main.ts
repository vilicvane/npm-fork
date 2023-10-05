#!/usr/bin/env node

import {join, resolve} from 'path';

import Arborist from '@npmcli/arborist';
import main from 'main-function';
import packlist from 'npm-packlist';
import Pacote from 'pacote';
import Semver from 'semver';

import {hasUnstagedChanges} from './@git';
import type {PatchedPackageEntryMap} from './@patch';
import {patchPackageJSON, patchScript} from './@patches';

main(async ([scope, ...packageDirs]) => {
  if (!scope.startsWith('@')) {
    throw new Error('Scope must start with "@".');
  }

  const cwd = process.cwd();

  if (packageDirs.length === 0) {
    packageDirs.push(cwd);
  } else {
    packageDirs = packageDirs.map(packageDir => resolve(cwd, packageDir));
  }

  if (!(await hasUnstagedChanges(cwd))) {
    throw new Error('Please commit or stage changes before patching.');
  }

  const patchedPackageEntryMap: PatchedPackageEntryMap = new Map();

  for (const packageDir of packageDirs) {
    const arborist = new Arborist({
      path: packageDir,
    });

    const tree = await arborist.loadActual();

    const files = await packlist(tree);

    const {name: originalName, version: originalVersion} = tree.package;

    if (typeof originalName !== 'string') {
      throw new TypeError(`Package name must be a string (${packageDir}).`);
    }

    if (typeof originalVersion !== 'string') {
      throw new TypeError(`Package version must be a string (${packageDir}).`);
    }

    const patchedName = originalName.replace(/^(?:@.+?\/)?/, `${scope}/`);

    let baseVersion: string;

    try {
      const {version: publishedPatchedVersion} =
        await Pacote.manifest(patchedName);

      baseVersion = Semver.gt(publishedPatchedVersion, originalVersion)
        ? publishedPatchedVersion
        : originalVersion;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes('404 Not Found')
      ) {
        throw error;
      }

      baseVersion = originalVersion;
    }

    const patchedVersion = Semver.inc(baseVersion, 'prerelease')!;

    patchedPackageEntryMap.set(originalName, {
      packageDir,
      patchedName,
      patchedVersion,
      files,
    });
  }

  for (const {packageDir, files} of patchedPackageEntryMap.values()) {
    for (const file of files) {
      if (file === 'package.json') {
        await patchPackageJSON(packageDir, patchedPackageEntryMap);
      } else if (/\.[cm]?js$/.test(file)) {
        await patchScript(join(packageDir, file), patchedPackageEntryMap);
      }
    }
  }
});
