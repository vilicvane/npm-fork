import {Command, Errors} from '@oclif/core';

import {COMMON_FLAGS} from '../@command';
import {hasUnstagedChanges} from '../@git';
import {patch} from '../@patch';

export class PatchCommand extends Command {
  override async run(): Promise<void> {
    const {
      flags: {scope, package: packagePatterns},
    } = await this.parse(PatchCommand);

    const cwd = process.cwd();

    if (!(await hasUnstagedChanges(cwd))) {
      throw new Errors.CLIError(
        'Please commit or stage changes before patching.',
      );
    }

    await patch(cwd, packagePatterns, scope);
  }

  static override description = 'Patch package.json and JavaScript files.';

  static override examples = [
    {
      description: 'Patch workspace packages @origin/* as @fork/*.',
      command: 'npm-fork patch --scope "@fork" --package "@origin/*"',
    },
  ];

  static override flags = {
    ...COMMON_FLAGS,
  };
}
