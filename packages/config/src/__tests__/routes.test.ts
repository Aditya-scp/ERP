import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROUTES_MANIFEST } from '../routes';

describe('Route Manifest Integrity', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const screensDocPath = path.join(rootDir, 'docs', 'SCREENS.md');
  const permsDocPath = path.join(rootDir, 'docs', 'PERMISSIONS.md');

  it('contains exactly as many routes as there are "#### Screen" entries in docs/SCREENS.md', () => {
    const screensContent = fs.readFileSync(screensDocPath, 'utf8');
    const screenMatches = screensContent.match(/^#### Screen (\d+\.\d+):/gm) ?? [];
    
    expect(ROUTES_MANIFEST.length).toBe(screenMatches.length);
    expect(ROUTES_MANIFEST.length).toBe(125);
  });

  it('ensures every route screenId matches a documented screen in docs/SCREENS.md', () => {
    const screensContent = fs.readFileSync(screensDocPath, 'utf8');
    const screenIdsInDoc = new Set<string>();
    const regex = /^#### Screen (\d+\.\d+):/gm;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(screensContent)) !== null) {
      if (match[1]) {
        screenIdsInDoc.add(match[1]);
      }
    }

    for (const route of ROUTES_MANIFEST) {
      expect(
        screenIdsInDoc.has(route.screenId),
        `Route with screenId ${route.screenId} not found in docs/SCREENS.md`
      ).toBe(true);
    }
  });

  it('contains no duplicate route paths within the same platform', () => {
    const webPaths = new Set<string>();
    const mobilePaths = new Set<string>();

    for (const route of ROUTES_MANIFEST) {
      if (route.webRoute && route.webRoute !== 'N/A') {
        expect(
          webPaths.has(route.webRoute),
          `Duplicate webRoute detected: ${route.webRoute} (Screen ${route.screenId})`
        ).toBe(false);
        webPaths.add(route.webRoute);
      }

      if (route.mobileRoute && route.mobileRoute !== 'N/A') {
        expect(
          mobilePaths.has(route.mobileRoute),
          `Duplicate mobileRoute detected: ${route.mobileRoute} (Screen ${route.screenId})`
        ).toBe(false);
        mobilePaths.add(route.mobileRoute);
      }
    }
  });

  it('ensures every non-null permission token exists in docs/PERMISSIONS.md', () => {
    const permsContent = fs.readFileSync(permsDocPath, 'utf8');
    const validTokens = new Set<string>();
    const regex = /`([a-z_]+:[a-z_]+)`/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(permsContent)) !== null) {
      if (match[1]) {
        validTokens.add(match[1]);
      }
    }

    expect(validTokens.size).toBe(133);

    for (const route of ROUTES_MANIFEST) {
      if (route.permissionToken) {
        expect(
          validTokens.has(route.permissionToken),
          `Permission token '${route.permissionToken}' on Screen ${route.screenId} not found in docs/PERMISSIONS.md`
        ).toBe(true);
      }
    }
  });
});
