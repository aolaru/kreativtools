import { executePdfOperation } from './pdf-operations.mjs';

self.onmessage = async ({ data }) => {
  try {
    const result = await executePdfOperation(data, (message) => self.postMessage({ progress: message }));
    self.postMessage({ result }, result.bytes ? [result.bytes.buffer] : []);
  } catch (error) {
    self.postMessage({ error: error.message || 'Could not process this PDF.' });
  }
};
