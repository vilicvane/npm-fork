import type {types} from '@babel/core';
import {transformFileAsync} from '@babel/core';

import type {PatchedPackageEntryMap} from '../@patch';

export async function patchScript(
  path: string,
  entryMap: PatchedPackageEntryMap,
): Promise<void> {
  await transformFileAsync(path, {
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

  function updateSource(source: types.StringLiteral): void {
    const originalName = source.value.match(/^(?:@.+?\/)?[^/]+/)![0];

    const patched = entryMap.get(originalName);

    if (patched) {
      source.value =
        patched.patchedName + source.value.slice(originalName.length);
    }
  }
}
