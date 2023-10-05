import {spawn} from 'child_process';
import {buffer} from 'stream/consumers';

export async function hasUnstagedChanges(path: string): Promise<boolean> {
  const cp = await spawn(
    'git',
    ['status', '--untracked-files=no', '--porcelain'],
    {
      cwd: path,
    },
  );

  const output = (await buffer(cp.stdout)).toString('utf8');

  return !/^ M /m.test(output);
}
