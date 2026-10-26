export const PDF_LIMITS = { fileBytes: 100 * 1024 * 1024, totalBytes: 200 * 1024 * 1024, files: 100 };

export function checkPdfFiles(files) {
  if (!files.length) throw new Error('Choose a PDF first.');
  if (files.length > PDF_LIMITS.files) throw new Error('Use at most 100 PDFs at a time.');
  for (const file of files) {
    if (!file.size) throw new Error(`${file.name}: this file is empty.`);
    if (file.size > PDF_LIMITS.fileBytes) throw new Error(`${file.name}: use a PDF smaller than 100 MB.`);
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > PDF_LIMITS.totalBytes) {
    throw new Error('Use fewer PDFs: the combined input limit is 200 MB.');
  }
}
