import assert from 'assert';
import {join} from 'path';

import Arborist from '@npmcli/arborist';
import {Errors} from '@oclif/core';
import {match} from 'minimatch';
import packlist from 'npm-packlist';
import Pacote from 'pacote';
import Semver from 'semver';

import {patchPackage, patchScript} from './@patches';

export interface PatchedPackageEntry {
  packageDir: string;
  originalName: string;
  originalVersion: string;
  patchedName: string;
  patchedVersion: string;
  files: string[];
  tree: Arborist.Node;
}

export type PatchedPackageEntryMap = Map<string, PatchedPackageEntry>;

export async function patch(
  projectDir: string,
  packagePatterns: string[] | undefined,
  scope: string,
): Promise<PatchedPackageEntry[]> {
  console.info('loading project...');

  const root = await new Arborist({
    path: projectDir,
  }).loadActual();

  const entries: PatchedPackageEntry[] = [];

  if (packagePatterns) {
    const {workspaces: workspacePathMap} = root;

    if (!workspacePathMap) {
      throw new Errors.CLIError('Expecting a project with workspaces.');
    }

    const workspaceCandidates = Array.from(workspacePathMap.keys());

    for (const pattern of packagePatterns) {
      const matches = match(workspaceCandidates, pattern);

      const paths = matches.map(match => workspacePathMap.get(match)!);

      const entriesToAdd: PatchedPackageEntry[] = [];

      for (const path of paths) {
        const tree = await new Arborist({path}).loadActual();

        const entry = await buildPatchedPackageEntry(tree, scope);

        if (entry) {
          entriesToAdd.push(entry);
        }
      }

      if (entriesToAdd.length === 0) {
        throw new Errors.CLIError(`No workspace matches "${pattern}".`);
      }

      entries.push(...entriesToAdd);
    }
  } else {
    const entry = await buildPatchedPackageEntry(root, scope);

    if (!entry) {
      throw new Errors.CLIError('No package to patch.');
    }

    entries.push(entry);
  }

  const patchedPackageEntryMap = new Map(
    entries.map(entry => [entry.originalName, entry]),
  );

  for (const {packageDir, files} of entries) {
    for (const file of files) {
      if (file === 'package.json') {
        await patchPackage(packageDir, patchedPackageEntryMap);
      } else if (/\.[cm]?js$/.test(file)) {
        await patchScript(file, join(packageDir, file), patchedPackageEntryMap);
      }
    }
  }

  return entries;
}

async function buildPatchedPackageEntry(
  tree: Arborist.Node,
  scope: string,
): Promise<PatchedPackageEntry | undefined> {
  const {
    name: originalName,
    version: originalVersion,
    private: privatePackage = false,
  } = tree.package;

  if (privatePackage) {
    return undefined;
  }

  assert(typeof originalName === 'string');

  if (typeof originalVersion !== 'string') {
    throw new TypeError(`Package version must be a string (${originalName}).`);
  }

  const files = await packlist(tree, {parent: null, path: tree.path});

  const patchedName = originalName.replace(/^(?:@.+?\/)?/, `${scope}/`);

  let baseVersion: string;

  try {
    const {version: publishedPatchedVersion} =
      await Pacote.manifest(patchedName);

    baseVersion = Semver.gt(publishedPatchedVersion, originalVersion)
      ? publishedPatchedVersion
      : originalVersion;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('404 Not Found')) {
      throw error;
    }

    baseVersion = originalVersion;
  }

  const patchedVersion = Semver.inc(baseVersion, 'prerelease')!;

  return {
    packageDir: tree.path,
    originalName,
    originalVersion,
    patchedName,
    patchedVersion,
    files,
    tree,
  };
}
