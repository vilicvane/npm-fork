import PackageJson from '@npmcli/package-json';

import type {PatchedPackageEntryMap} from '../@patch';

const hasOwnProperty = Object.prototype.hasOwnProperty;

const DEPENDENCIES_KEYS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

export async function patchPackageJSON(
  packagePath: string,
  entryMap: PatchedPackageEntryMap,
): Promise<void> {
  const file = await PackageJson.load(packagePath);

  const originalName = file.content.name!;

  const patched = entryMap.get(originalName)!;

  file.update({
    name: patched.patchedName,
    version: patched.patchedVersion,
  });

  for (const key of DEPENDENCIES_KEYS) {
    const dependencies = file.content[key];

    if (!dependencies) {
      continue;
    }

    for (const [originalName, patched] of entryMap) {
      if (hasOwnProperty.call(dependencies, originalName)) {
        delete dependencies[originalName];
        dependencies[patched.patchedName] = patched.patchedVersion;
      }
    }

    file.update({
      [key]: dependencies,
    });
  }

  await file.save();
}
