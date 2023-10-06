import assert from 'assert';
import {join} from 'path';

import Arborist from '@npmcli/arborist';
import {Errors} from '@oclif/core';
import {glob} from 'glob';
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

  let entries: PatchedPackageEntry[];

  if (packagePatterns) {
    const {workspaces: workspacePathMap} = root;

    if (workspacePathMap) {
      entries = await getWorkspacePatchedPackageEntries(
        scope,
        packagePatterns,
        workspacePathMap,
      );
    } else {
      entries = await getDirectoryPatchedPackageEntries(
        scope,
        packagePatterns,
        projectDir,
      );
    }
  } else {
    const entry = await buildPatchedPackageEntry(root, scope);

    if (!entry) {
      throw new Errors.CLIError('No package to patch.');
    }

    entries = [entry];
  }

  const patchedPackageEntryMap = new Map(
    entries.map(entry => [entry.originalName, entry]),
  );

  for (const {packageDir, files} of entries) {
    for (const file of files) {
      if (file === 'package.json') {
        await patchPackage(packageDir, patchedPackageEntryMap);
      } else if (/\.[cm]?js$/.test(file)) {
        await patchScript(
          projectDir,
          join(packageDir, file),
          patchedPackageEntryMap,
        );
      }
    }
  }

  return entries;
}

async function getWorkspacePatchedPackageEntries(
  scope: string,
  packagePatterns: string[],
  workspacePathMap: Map<string, string>,
): Promise<PatchedPackageEntry[]> {
  const workspaceCandidates = Array.from(workspacePathMap.keys());

  return getPatchedPackageEntries(scope, packagePatterns, async pattern => {
    return match(workspaceCandidates, pattern).map(
      match => workspacePathMap.get(match)!,
    );
  });
}

async function getDirectoryPatchedPackageEntries(
  scope: string,
  packagePatterns: string[],
  projectDir: string,
): Promise<PatchedPackageEntry[]> {
  return getPatchedPackageEntries(scope, packagePatterns, pattern => {
    pattern = pattern.endsWith('/') ? pattern : `${pattern}/`;

    return glob(pattern, {
      cwd: projectDir,
    });
  });
}

async function getPatchedPackageEntries(
  scope: string,
  packagePatterns: string[],
  pathsCallback: (pattern: string) => Promise<string[]>,
): Promise<PatchedPackageEntry[]> {
  const map = new Map<string, PatchedPackageEntry | false>();

  for (const pattern of packagePatterns) {
    const paths = await pathsCallback(pattern);

    let matched = false;

    for (const path of paths) {
      const built = map.get(path);

      if (built !== undefined) {
        if (built) {
          matched = true;
        }

        continue;
      }

      const tree = await new Arborist({path}).loadActual();

      const entry = await buildPatchedPackageEntry(tree, scope);

      if (entry) {
        map.set(path, entry);
        matched = true;
      } else {
        map.set(path, false);
      }
    }

    if (!matched) {
      throw new Errors.CLIError(`No workspace matches "${pattern}".`);
    }
  }

  return Array.from(map.values()).filter(
    (entry): entry is Exclude<typeof entry, false> => entry !== false,
  );
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

  const patchedName = originalName.replace(
    /^(?:@(.+?)\/)?/,
    (_text, originalScope) =>
      originalScope ? `${scope}/${originalScope}__` : `${scope}/`,
  );

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
