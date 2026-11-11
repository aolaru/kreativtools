const { test, expect } = require('@playwright/test');

test('validate, format, minify, upload and download JSON', async ({ page }) => {
  await page.goto('/file/json-validator/');
  const editor = page.locator('#jsonEditor');
  const result = page.locator('#jsonResult');
  await editor.fill('{"n":900719925474099312345,"a":[1,2]}');
  await page.getByRole('button', { name: 'Validate', exact: true }).click();
  await expect(result).toHaveText('Valid JSON syntax.');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(editor).toHaveValue(/\n.*900719925474099312345/s);
  await page.getByRole('button', { name: 'Minify', exact: true }).click();
  await expect(editor).toHaveValue('{"n":900719925474099312345,"a":[1,2]}');
  await editor.fill('{invalid}');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(result).toContainText('Could not format:');
  await expect(editor).toHaveValue('{invalid}');
  await page.locator('#jsonFile').setInputFiles({ name: 'sample.json', mimeType: 'application/json', buffer: Buffer.from('{"ok":true}') });
  await expect(editor).toHaveValue('{"ok":true}');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sample.json');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(editor).toHaveValue('');
});
