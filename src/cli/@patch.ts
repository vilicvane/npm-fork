export interface PatchedPackageEntry {
  packageDir: string;
  patchedName: string;
  patchedVersion: string;
  files: string[];
}

export type PatchedPackageEntryMap = Map<string, PatchedPackageEntry>;
