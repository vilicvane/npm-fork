import {spawn} from 'child_process';
import {once} from 'events';

import Chalk from 'chalk';

import type {PatchedPackageEntry} from './@patch';

export async function publish({
  packageDir,
  originalName,
  patchedName,
  patchedVersion,
}: PatchedPackageEntry): Promise<void> {
  console.info(
    Chalk.red('publishing'),
    `${patchedName}${Chalk.dim(
      `@${patchedVersion} (originally ${originalName})`,
    )}`,
  );

  const cp = spawn('npm', ['publish'], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true,
  });

  const [code] = (await once(cp, 'exit')) as [number];

  if (code !== 0) {
    process.exit(code);
  }
}
