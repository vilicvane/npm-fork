import {Command, Errors} from '@oclif/core';

import {COMMON_FLAGS} from '../@command';
import {hasUnstagedChanges, resetUnstagedChanges} from '../@git';
import {patch} from '../@patch';
import {publish} from '../@publish';

export class PublishCommand extends Command {
  override async run(): Promise<void> {
    const {
      flags: {scope, package: packagePatterns},
    } = await this.parse(PublishCommand);

    const cwd = process.cwd();

    if (!(await hasUnstagedChanges(cwd))) {
      throw new Errors.CLIError(
        'Please commit or stage changes before patching, npm-fork will reset the patches using Git after publishing.',
      );
    }

    const entries = await patch(cwd, packagePatterns, scope);

    for (const entry of entries) {
      await publish(entry);
    }

    await resetUnstagedChanges(cwd);
  }

  static override description = 'Publish packages with patched name.';

  static override examples = [
    {
      description: 'Publish workspace packages @origin/* as @fork/*.',
      command: 'npm-fork publish --scope "@fork" --package "@origin/*"',
    },
  ];

  static override flags = {
    ...COMMON_FLAGS,
  };
}
