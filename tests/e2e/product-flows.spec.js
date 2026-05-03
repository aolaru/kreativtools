const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { createSilentWavBuffer } = require('./helpers/audio');

const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
const mergePdfA = path.join(fixturesDir, 'merge-a.pdf');
const mergePdfB = path.join(fixturesDir, 'merge-b.pdf');
const compressPdf = path.join(fixturesDir, 'compress-sample.pdf');

async function enablePaidWorkflows(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('kreativ_workflows_access', JSON.stringify({ paid: true }));
  });
}

test('homepage surfaces featured workflows and Learn entry points', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Useful browser tools/i })).toBeVisible();
  await expect(page.locator('.hero-actions a[href="/workflows/pricing/"]')).toBeVisible();
  await expect(page.locator('.hero-actions a[href="/tools/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/workflows/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/workflows/image-prep/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/workflows/pricing/"]')).toBeVisible();
  await expect(page.locator('.tool-card.is-workflow-featured[href="/workflows/image-prep/"]')).toBeVisible();
  await expect(page.locator('.tool-card.is-workflow-featured[href="/workflows/pdf-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card.is-workflow-featured[href="/workflows/audio-delivery/"]')).toBeVisible();
  await expect(page.locator('.home-section-actions a[href="/tools/"]').first()).toBeVisible();
  await expect(page.locator('.home-update-strip a[href="/changes/"]')).toBeVisible();
  await expect(page.locator('.home-update-strip a[href="/learn/"]')).toBeVisible();
});

test('workflows landing page introduces workflow lineup and image prep entry point', async ({ page }) => {
  await page.goto('/workflows');
  await expect(page.getByRole('heading', { level: 1, name: 'Workflows' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/image-prep/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/pdf-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/audio-delivery/"]')).toBeVisible();
});

test('studio image prep runs through a basic guided export flow', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/image-prep');

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3d2QAAAAASUVORK5CYII=',
    'base64'
  );

  await page.setInputFiles('#studioImageInput', {
    name: 'studio-fixture.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });

  await expect(page.locator('#studioWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#studioStageCrop')).toBeVisible();
  await page.click('#studioApplyCropButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.fill('#studioResizeWidth', '320');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
  await page.selectOption('#studioFormat', 'image/webp');
  await page.click('#studioGenerateExportButton');
  await expect(page.locator('#studioStageExport')).toBeVisible();
  await expect(page.locator('#studioDownloadButton')).toBeEnabled();
  await expect(page.locator('#studioExportFormat')).toHaveText('WEBP');
});

test('studio image prep supports presets and back navigation before final export', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/image-prep');

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3d2QAAAAASUVORK5CYII=',
    'base64'
  );

  await page.setInputFiles('#studioImageInput', {
    name: 'studio-preset.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });

  await expect(page.locator('#studioStageCrop')).toBeVisible();
  await page.click('#studioSkipCropButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.click('#studioPresetInstagram');
  await expect(page.locator('#studioResizeWidth')).toHaveValue('1080');
  await expect(page.locator('#studioResizeHeight')).toHaveValue('1350');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
  await page.click('#studioBackToResizeButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.click('#studioApplyResizeButton');
  await page.selectOption('#studioFormat', 'image/jpeg');
  await page.click('#studioGenerateExportButton');
  await expect(page.locator('#studioStageExport')).toBeVisible();
  await expect(page.locator('#studioSummaryOutput')).toContainText('JPG');
  await page.click('#studioBackToCompressButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
});

test('studio image prep saves and reapplies named workflow templates', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/image-prep');

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3d2QAAAAASUVORK5CYII=',
    'base64'
  );

  await page.setInputFiles('#studioImageInput', {
    name: 'studio-template.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });

  await page.click('#studioSkipCropButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.uncheck('#studioKeepRatio');
  await page.fill('#studioResizeWidth', '1200');
  await page.fill('#studioResizeHeight', '800');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();

  await page.selectOption('#studioFormat', 'image/webp');
  await page.fill('#studioTemplateName', 'Content Hero');
  await page.click('#studioSaveTemplateButton');
  await expect(page.locator('#studioTemplateStatus')).toContainText('Content Hero saved');

  await page.click('#studioBackToResizeButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.fill('#studioResizeWidth', '640');
  await page.fill('#studioResizeHeight', '360');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
  await page.selectOption('#studioFormat', 'image/jpeg');

  const templateItem = page.locator('.workflow-template-item').filter({ hasText: 'Content Hero' });
  await expect(templateItem).toBeVisible();
  await templateItem.getByRole('button', { name: 'Apply' }).click();

  await page.click('#studioBackToResizeButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await expect(page.locator('#studioResizeWidth')).toHaveValue('1200');
  await expect(page.locator('#studioResizeHeight')).toHaveValue('800');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
  await expect(page.locator('#studioFormat')).toHaveValue('image/webp');
});

test('studio image prep shows the paid access lock for unpaid users', async ({ page }) => {
  await page.goto('/workflows/image-prep');
  const lockCard = page.locator('[data-workflows-locked-content]');
  await expect(lockCard).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock Image Prep with Kreativ Workflows' })).toBeVisible();
  await expect(lockCard.locator('[data-workflows-checkout-link]')).toBeVisible();
  await expect(page.locator('#studioImageInput')).toBeHidden();
  await expect(page.locator('#studioWorkspace')).toBeHidden();
});

test('studio pdf delivery merges a queue and prepares a final export', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/pdf-delivery');
  await page.setInputFiles('#studioPdfInput', [mergePdfA, mergePdfB]);
  await expect(page.locator('#studioPdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#studioPdfSummaryCount')).toHaveText('2');
  await page.click('#studioPdfContinueArrangeButton');
  await expect(page.locator('#studioPdfStageSplit')).toBeVisible();
  await page.click('#studioPdfSkipSplitButton');
  await expect(page.locator('#studioPdfStageMerge')).toBeVisible();
  await page.click('#studioPdfMergeButton');
  await expect(page.locator('#studioPdfMergeStatus')).toContainText('Ready');
  await expect(page.locator('#studioPdfExportSummary')).toContainText('merged and ready');
  await page.click('#studioPdfContinueToExportButton');
  await expect(page.locator('#studioPdfStageExport')).toBeVisible();
  await page.click('#studioPdfOptimizeButton');
  await expect(page.locator('#studioPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#studioPdfExportOutputSize')).not.toHaveText('-');
  await expect(page.locator('#studioPdfExportSummary')).toContainText('Final PDF generated');
});

test('studio pdf delivery can apply a real split to the queue before merge', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/pdf-delivery');
  const splitSourceBase64 = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    for (let index = 0; index < 3; index += 1) {
      const pdfPage = doc.addPage([420, 595]);
      pdfPage.drawText(`Studio Split Source ${index + 1}`, { x: 48, y: 520, size: 22 });
    }
    const bytes = await doc.save();
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunk));
    }
    return btoa(binary);
  });

  await page.setInputFiles('#studioPdfInput', [
    {
      name: 'studio-split-source.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(splitSourceBase64, 'base64'),
    },
    {
      name: 'merge-b.pdf',
      mimeType: 'application/pdf',
      buffer: fs.readFileSync(mergePdfB),
    },
  ]);
  await expect(page.locator('#studioPdfSummaryCount')).toHaveText('2');

  await page.click('#studioPdfContinueArrangeButton');
  await expect(page.locator('#studioPdfStageSplit')).toBeVisible();
  await page.selectOption('#studioPdfSplitMode', 'every');
  await page.click('#studioPdfApplySplitButton');

  await expect(page.locator('#studioPdfStatus')).toContainText('Split studio-split-source.pdf into 3 queue items');
  await expect(page.locator('#studioPdfStageMerge')).toBeVisible();
  await expect(page.locator('#studioPdfMergeCount')).toHaveText('4');

  await page.click('#studioPdfBackToSplitButton');
  await expect(page.locator('#studioPdfStageSplit')).toBeVisible();
  await page.click('#studioPdfSkipSplitButton');
  await expect(page.locator('#studioPdfStageMerge')).toBeVisible();
  await page.click('#studioPdfMergeButton');
  await expect(page.locator('#studioPdfContinueToExportButton')).toBeEnabled();
});

test('studio pdf delivery saves and reapplies named workflow templates', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/pdf-delivery');
  await page.setInputFiles('#studioPdfInput', [mergePdfA, mergePdfB]);
  await page.click('#studioPdfContinueArrangeButton');
  await expect(page.locator('#studioPdfStageSplit')).toBeVisible();

  await page.selectOption('#studioPdfSplitMode', 'ranges');
  await page.fill('#studioPdfSplitRanges', '1\n2-3');
  await page.click('#studioPdfSkipSplitButton');
  await expect(page.locator('#studioPdfStageMerge')).toBeVisible();
  await page.click('#studioPdfMergeButton');
  await page.click('#studioPdfContinueToExportButton');
  await expect(page.locator('#studioPdfStageExport')).toBeVisible();
  await page.click('#studioPdfTemplateReviewButton');
  await page.fill('#studioPdfTemplateName', 'Review Pack');
  await page.click('#studioPdfSaveTemplateButton');
  await expect(page.locator('#studioPdfTemplateStatus')).toContainText('Review Pack saved');

  await page.click('#studioPdfBackToMergeButton');
  await expect(page.locator('#studioPdfStageMerge')).toBeVisible();
  await page.click('#studioPdfBackToSplitButton');
  await expect(page.locator('#studioPdfStageSplit')).toBeVisible();
  await page.selectOption('#studioPdfSplitMode', 'every');
  await page.click('#studioPdfSkipSplitButton');
  await page.click('#studioPdfContinueToExportButton');
  await expect(page.locator('#studioPdfStageExport')).toBeVisible();
  await page.click('#studioPdfTemplateClientButton');

  const templateItem = page.locator('.workflow-template-item').filter({ hasText: 'Review Pack' });
  await expect(templateItem).toBeVisible();
  await templateItem.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('#studioPdfTemplateStatus')).toContainText('Review Pack applied');
  await page.click('#studioPdfBackToMergeButton');
  await page.click('#studioPdfBackToSplitButton');
  await expect(page.locator('#studioPdfSplitMode')).toHaveValue('ranges');
  await expect(page.locator('#studioPdfSplitRanges')).toHaveValue('1\n2-3');
});

test('audio delivery workflow trims, levels, and exports an mp3', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/audio-delivery');
  await page.setInputFiles('#workflowAudioInput', {
    name: 'workflow-fixture.wav',
    mimeType: 'audio/wav',
    buffer: createSilentWavBuffer({ durationSeconds: 0.4 }),
  });

  await expect(page.locator('#workflowAudioWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#workflowAudioStageUpload')).toBeVisible();
  await page.click('#workflowAudioContinueButton');
  await expect(page.locator('#workflowAudioStageTrim')).toBeVisible();
  await page.fill('#workflowAudioTrimStart', '0');
  await page.fill('#workflowAudioTrimEnd', '0.1');
  await page.click('#workflowAudioApplyTrimButton');
  await expect(page.locator('#workflowAudioStageLevel')).toBeVisible();
  await page.fill('#workflowAudioGain', '120');
  await page.click('#workflowAudioApplyLevelButton');
  await expect(page.locator('#workflowAudioStageExport')).toBeVisible();
  await page.selectOption('#workflowAudioFormat', 'audio/mpeg');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#workflowAudioGenerateButton');
  await expect(page.locator('#workflowAudioDownloadButton')).toBeEnabled();
  await page.click('#workflowAudioDownloadButton');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/workflow-fixture-delivery\.mp3$/);
  await expect(page.locator('#workflowAudioStatus')).toContainText('Downloaded workflow-fixture-delivery.mp3');
});

test('audio delivery workflow supports back navigation and wav export', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/audio-delivery');
  await page.setInputFiles('#workflowAudioInput', {
    name: 'workflow-wav-fixture.wav',
    mimeType: 'audio/wav',
    buffer: createSilentWavBuffer({ durationSeconds: 0.3 }),
  });

  await expect(page.locator('#workflowAudioStageUpload')).toBeVisible();
  await page.click('#workflowAudioContinueButton');
  await expect(page.locator('#workflowAudioStageTrim')).toBeVisible();
  await page.click('#workflowAudioSkipTrimButton');
  await expect(page.locator('#workflowAudioStageLevel')).toBeVisible();
  await page.click('#workflowAudioBackToTrimButton');
  await expect(page.locator('#workflowAudioStageTrim')).toBeVisible();
  await page.click('#workflowAudioSkipTrimButton');
  await page.click('#workflowAudioSkipLevelButton');
  await expect(page.locator('#workflowAudioStageExport')).toBeVisible();
  await page.selectOption('#workflowAudioFormat', 'audio/wav');
  await expect(page.locator('#workflowAudioBitrate')).toBeDisabled();
  const downloadPromise = page.waitForEvent('download');
  await page.click('#workflowAudioGenerateButton');
  await expect(page.locator('#workflowAudioExportFormat')).toHaveText('WAV');
  await expect(page.locator('#workflowAudioDownloadButton')).toBeEnabled();
  await page.click('#workflowAudioDownloadButton');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/workflow-wav-fixture-delivery\.wav$/);
  await expect(page.locator('#workflowAudioStatus')).toContainText('Downloaded workflow-wav-fixture-delivery.wav');
});

test('audio delivery workflow saves and reapplies named workflow templates', async ({ page }) => {
  await enablePaidWorkflows(page);
  await page.goto('/workflows/audio-delivery');
  await page.setInputFiles('#workflowAudioInput', {
    name: 'workflow-template.wav',
    mimeType: 'audio/wav',
    buffer: createSilentWavBuffer({ durationSeconds: 0.3 }),
  });

  await page.click('#workflowAudioContinueButton');
  await page.click('#workflowAudioSkipTrimButton');
  await page.click('#workflowAudioSkipLevelButton');
  await expect(page.locator('#workflowAudioStageExport')).toBeVisible();

  await page.click('#workflowAudioPresetPodcastButton');
  await page.fill('#workflowAudioTemplateName', 'Podcast Delivery');
  await page.click('#workflowAudioSaveTemplateButton');
  await expect(page.locator('#workflowAudioTemplateStatus')).toContainText('Podcast Delivery saved');

  await page.selectOption('#workflowAudioFormat', 'audio/wav');
  await page.selectOption('#workflowAudioSampleRate', 'keep');
  await page.check('#workflowAudioMono');

  const templateItem = page.locator('.workflow-template-item').filter({ hasText: 'Podcast Delivery' });
  await expect(templateItem).toBeVisible();
  await templateItem.getByRole('button', { name: 'Apply' }).click();

  await expect(page.locator('#workflowAudioFormat')).toHaveValue('audio/mpeg');
  await expect(page.locator('#workflowAudioBitrate')).toHaveValue('192');
  await expect(page.locator('#workflowAudioSampleRate')).toHaveValue('44100');
  await expect(page.locator('#workflowAudioMono')).not.toBeChecked();
});

test('learn landing page includes the core hero guides and expanded follow-up guides', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.getByRole('heading', { level: 1, name: 'Guides for Better Results' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/compress-pdf-for-email/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/use-kreativ-workflows-image-prep-for-web-ready-images/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-a-sendable-pdf-in-kreativ-workflows/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/merge-pdf-files-in-order/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-otf-or-ttf-to-woff2/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/compress-images-for-faster-websites/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/resize-images-for-shopify-or-woocommerce/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-png-to-webp-without-obvious-quality-loss/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/crop-images-for-clean-thumbnails-and-social-posts/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/resize-before-compressing-images/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/when-pdf-compression-does-not-help/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/split-pdf-pages-without-rebuilding-document/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-pdfs-for-email-without-breaking-layout/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/organize-pdf-handoff-files-before-sending/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-webfonts-for-fast-frontend-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-wav-to-mp3-and-choose-the-right-bitrate/"]')).toBeVisible();
});

test('pdf merge accepts fixtures and enables merged download flow', async ({ page }) => {
  await page.goto('/pdf/merge');
  await page.setInputFiles('#mergePdfInput', [mergePdfA, mergePdfB]);
  await expect(page.locator('#mergePdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#mergePdfCount')).toHaveText('2');
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfOutputStatus')).toContainText('Ready');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
});

test('pdf split creates separate outputs from custom page ranges', async ({ page }) => {
  await page.goto('/pdf/split');
  const splitPdfBase64 = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    for (let index = 0; index < 3; index += 1) {
      const pdfPage = doc.addPage([420, 595]);
      pdfPage.drawText(`Split Fixture Page ${index + 1}`, { x: 48, y: 520, size: 22 });
    }
    const bytes = await doc.save();
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunk));
    }
    return btoa(binary);
  });

  await page.setInputFiles('#splitPdfInput', {
    name: 'split-fixture.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(splitPdfBase64, 'base64'),
  });

  await expect(page.locator('#splitPdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#splitPdfPageCount')).toHaveText('3');
  await page.selectOption('#splitPdfMode', 'ranges');
  await page.fill('#splitPdfRanges', '1-2\n3');
  await page.click('#splitPdfActionButton');
  await expect(page.locator('#splitPdfOutputCount')).toHaveText('2');
  await expect(page.locator('#splitPdfList .queue-item')).toHaveCount(2);
  await expect(page.locator('#splitPdfDownloadAllButton')).toBeEnabled();
});

test('pdf compress processes a fixture and exposes the result step', async ({ page }) => {
  await page.goto('/pdf/compress');
  await page.setInputFiles('#compressPdfInput', compressPdf);
  await expect(page.locator('#compressPdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfOutputSize')).not.toHaveText('-');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
});

test('sitemap routes resolve to live pages', async ({ page }) => {
  const sitemap = fs.readFileSync(path.resolve(process.cwd(), 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>https:\/\/kreativtools\.com([^<]*)<\/loc>/g)].map((match) => match[1] || '/');

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Kreativ Tools|Redirecting/);
  }
});

test('avif export option follows real browser support on image tools', async ({ page }) => {
  await page.goto('/image/resize');
  const avifSupported = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    try {
      return canvas.toDataURL('image/avif', 0.8).startsWith('data:image/avif');
    } catch (error) {
      return false;
    }
  });
  const resizeAvif = page.locator('#formatInput option[value="image/avif"]');
  await expect(resizeAvif).toHaveCount(1);
  if (avifSupported) {
    await expect(resizeAvif).toBeEnabled();
  } else {
    await expect(resizeAvif).toHaveAttribute('disabled', '');
    await expect(resizeAvif).toHaveAttribute('hidden', '');
  }

  await page.goto('/image/compress');
  const compressAvif = page.locator('#compressFormatInput option[value="image/avif"]');
  await expect(compressAvif).toHaveCount(1);
  if (avifSupported) {
    await expect(compressAvif).toBeEnabled();
  } else {
    await expect(compressAvif).toHaveAttribute('disabled', '');
    await expect(compressAvif).toHaveAttribute('hidden', '');
  }

  await page.goto('/image/crop');
  const cropAvif = page.locator('#cropFormatInput option[value="image/avif"]');
  await expect(cropAvif).toHaveCount(1);
  if (avifSupported) {
    await expect(cropAvif).toBeEnabled();
  } else {
    await expect(cropAvif).toHaveAttribute('disabled', '');
    await expect(cropAvif).toHaveAttribute('hidden', '');
  }
});
