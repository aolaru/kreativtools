const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('hover reveals every directory tool and closes after leaving', async ({ page }) => {
  await page.goto('/tools/');
  const directory = await page.locator('a.tool-card').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort());
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Tools', exact: true }).hover();
  const menu = page.locator('#toolsMenu');
  await expect(menu).toBeVisible();
  const menuLinks = await menu.locator('.tools-menu-group a').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort());
  expect(menuLinks).toEqual(directory);
  await expect(menu.getByRole('link', { name: 'View all tools' })).toHaveAttribute('href', '/tools/');
  await page.mouse.move(1, 500);
  await expect(menu).toBeHidden();
});

test('keyboard toggle, escape and outside click work', async ({ page }, testInfo) => {
  await page.goto('/');
  const button = page.locator('.tools-menu-toggle');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  // On macOS, Firefox and WebKit follow the system setting for tabbing to links.
  if (testInfo.project.name === 'chromium') await page.keyboard.press('Tab');
  else await page.locator('#toolsMenu a').first().focus();
  await expect(page.locator('#toolsMenu a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await page.mouse.click(1, 1);
  await expect(page.locator('#toolsMenu')).toBeHidden();
});

test('touch opens a mobile-sized panel and can navigate to a tool', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: 'Show tools menu' }).tap();
  const menu = page.locator('#toolsMenu');
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await menu.getByRole('link', { name: 'PDF Merge', exact: true }).tap();
  await expect(page).toHaveURL(/\/pdf\/merge\/$/);
  await context.close();
});

test('Tools directory remains accessible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.tools-menu-toggle')).toBeHidden();
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/$/);
  await context.close();
});

test('open menu passes accessibility checks in both themes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Scan once; interaction is tested in every browser.');
  await page.goto('/');
  await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await page.locator('.tools-menu-toggle').focus();
    if (await page.locator('#toolsMenu').isHidden()) await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const violations = await page.evaluate(async () => (await axe.run(document.querySelector('nav.top-nav'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    })).violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })));
    expect(violations, theme).toEqual([]);
  }
});
