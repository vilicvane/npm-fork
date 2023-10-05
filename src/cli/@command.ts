import {Errors, Flags} from '@oclif/core';

export const COMMON_FLAGS = {
  scope: Flags.string({
    description: 'Scope of the forked packages.',
    required: true,
    async parse(scope) {
      if (!scope.startsWith('@')) {
        throw new Errors.CLIError('Scope must start with "@".');
      }

      return scope;
    },
  }),
  package: Flags.string({
    description: 'Package name or pattern of the packages to patch.',
    multiple: true,
  }),
};
