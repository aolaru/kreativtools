export const ORGANIZER_PAGE_LIMIT = 200;
export const IMAGE_PAGE_LIMIT = 50;

export function pdfOutputBase(name) {
  return name.replace(/\.[^./\\]+$/, '').replace(/[\\/<>:"|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '_').replace(/^\.+/, '').trim().slice(0, 120) || 'document';
}

export function validatePagePlan(plan, total) {
  if (!Array.isArray(plan) || !plan.length) throw new Error('Keep at least one page in the PDF.');
  if (plan.length > ORGANIZER_PAGE_LIMIT) throw new Error('Use at most 200 output pages.');
  return plan.map(({ index, rotation }) => {
    if (!Number.isInteger(index) || index < 0 || index >= total) throw new Error('The page selection is outside this PDF.');
    if (!Number.isInteger(rotation) || rotation % 90 !== 0) throw new Error('Rotate pages in 90-degree steps.');
    return { index, rotation: ((rotation % 360) + 360) % 360 };
  });
}

export function parsePageSelection(value, total, limit = IMAGE_PAGE_LIMIT) {
  const pages = new Set();
  const parts = value.trim() ? value.split(',') : [`1-${total}`];
  for (const part of parts) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Use page numbers or ranges, for example 1, 3-5.');
    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last > total || first > last) throw new Error(`Choose page numbers from 1 to ${total}, with ranges in ascending order.`);
    if (last - first + 1 > limit) throw new Error(`Export at most ${limit} pages at a time.`);
    for (let page = first; page <= last; page += 1) {
      pages.add(page);
      if (pages.size > limit) throw new Error(`Export at most ${limit} pages at a time.`);
    }
  }
  return [...pages];
}
