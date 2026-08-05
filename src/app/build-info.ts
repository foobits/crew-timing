export const APP_VERSION = __APP_VERSION__;
export const BUILD_DATE = __BUILD_DATE__;

export { resolveAppVersion } from "./resolve-app-version";

export function formatBuildLabel(): string {
  return `v${APP_VERSION} · ${BUILD_DATE}`;
}
