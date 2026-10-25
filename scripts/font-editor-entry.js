import fontEditor from 'fonteditor-core';
import { deflate as compress } from 'pako';

export const createFont = fontEditor.createFont;
export const woff2 = fontEditor.woff2;
export const deflate = (bytes) => compress(new Uint8Array(bytes));
