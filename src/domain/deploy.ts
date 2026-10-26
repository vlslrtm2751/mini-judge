/**
 * Base path the built app is served from.
 *
 * GitHub Pages serves a project site at `/<repo-name>/`, so this must match the
 * repository name. Both vite.config.ts and playwright.config.ts read it from
 * here so the build and the e2e run can never disagree about the path.
 */
export const BASE_PATH = '/mini-judge/';
