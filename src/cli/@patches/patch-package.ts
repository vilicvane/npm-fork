import PackageJson from '@npmcli/package-json';
import Chalk from 'chalk';

import type {PatchedPackageEntryMap} from '../@patch';

const hasOwnProperty = Object.prototype.hasOwnProperty;

const DEPENDENCIES_KEYS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

export async function patchPackage(
  path: string,
  entryMap: PatchedPackageEntryMap,
): Promise<void> {
  const file = await PackageJson.load(path);

  const originalName = file.content.name!;

  const {patchedName, patchedVersion} = entryMap.get(originalName)!;

  file.update({
    name: patchedName,
    version: patchedVersion,
  });

  for (const key of DEPENDENCIES_KEYS) {
    const dependencies = file.content[key];

    if (!dependencies) {
      continue;
    }

    for (const [originalName, {patchedName, patchedVersion}] of entryMap) {
      if (hasOwnProperty.call(dependencies, originalName)) {
        delete dependencies[originalName];
        dependencies[patchedName] = patchedVersion;
      }
    }

    file.update({
      [key]: dependencies,
    });
  }

  await file.save();

  console.info(Chalk.red('patch package'), originalName);
}
