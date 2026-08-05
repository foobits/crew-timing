/** Semver base from package.json (major.minor) plus CI build number as patch. */
export function resolveAppVersion(packageVersion: string, buildNumber?: string): string {
  const [major, minor] = packageVersion.split(".").slice(0, 2);
  if (!buildNumber) {
    return `${packageVersion}-dev`;
  }
  return `${major}.${minor}.${buildNumber}`;
}
