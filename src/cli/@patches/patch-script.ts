import {readFile, writeFile} from 'fs/promises';

import type {types} from '@babel/core';
import {transformAsync} from '@babel/core';
import Chalk from 'chalk';

import type {PatchedPackageEntryMap} from '../@patch';

export async function patchScript(
  name: string,
  path: string,
  entryMap: PatchedPackageEntryMap,
): Promise<void> {
  let changed = false;

  const originalCode = await readFile(path, 'utf8');

  const result = await transformAsync(originalCode, {
    plugins: [
      {
        visitor: {
          ImportDeclaration(path) {
            updateSource(path.node.source);
          },
          ExportDeclaration(path) {
            if ('source' in path.node && path.node.source) {
              updateSource(path.node.source);
            }
          },
          CallExpression(path) {
            if (
              (path.node.callee.type === 'Identifier' &&
                path.node.callee.name === 'require' &&
                path.node.arguments.length === 1 &&
                path.node.arguments[0].type === 'StringLiteral') ||
              (path.node.callee.type === 'Import' &&
                path.node.arguments.length >= 1 &&
                path.node.arguments[0].type === 'StringLiteral')
            ) {
              updateSource(path.node.arguments[0]);
            }
          },
        },
      },
    ],
  });

  const patchedCode = result?.code;

  if (typeof patchedCode === 'string' && changed) {
    await writeFile(path, patchedCode, 'utf8');

    console.info(Chalk.cyan('patch script'), name);
  }

  function updateSource(source: types.StringLiteral): void {
    const originalName = source.value.match(/^(?:@.+?\/)?[^/]+/)![0];

    const patched = entryMap.get(originalName);

    if (patched) {
      source.value =
        patched.patchedName + source.value.slice(originalName.length);

      changed = true;
    }
  }
}
