export interface PatchedPackageEntry {
  packageDir: string;
  originalName: string;
  originalVersion: string;
  patchedName: string;
  patchedVersion: string;
  files: string[];
}

export type PatchedPackageEntryMap = Map<string, PatchedPackageEntry>;
