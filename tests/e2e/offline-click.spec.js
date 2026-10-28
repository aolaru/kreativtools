const { test, expect } = require('@playwright/test');

for (const route of ['/pdf/merge/', '/pdf/compress/']) {
  test(`${route} counts a click without preventing the ZIP download`, async ({ page }) => {
    await page.route('**/downloads/kreativ-pdf-offline.zip', (request) => request.fulfill({ status: 200, contentType: 'application/zip', body: 'test' }));
    await page.addInitScript(() => {
      window.beacons = [];
      navigator.sendBeacon = (...args) => {
        if (args[0].includes('offline-click-counter')) { window.beacons.push(args); throw new Error('Counter blocked'); }
        return true;
      };
    });
    await page.goto(route);
    expect(await page.evaluate(() => window.beacons.length)).toBe(0);
    const download = page.waitForEvent('download');
    await page.locator('a[href$="/downloads/kreativ-pdf-offline.zip"]').click();
    expect((await download).suggestedFilename()).toBe('kreativ-pdf-offline.zip');
    expect(await page.evaluate(() => window.beacons)).toEqual([['https://kreativtools-offline-click-counter.andrei-olaru.workers.dev/click']]);
  });
}
