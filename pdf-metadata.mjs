export async function removePdfMetadata(document, { PDFName, PDFDict, PDFArray, PDFRef }) {
  if (document.isEncrypted) throw new Error('Unlock encrypted PDFs before removing metadata.');

  // Materialize any pending fonts or attachments before checking object reachability.
  await document.flush();
  const context = document.context;
  delete context.trailerInfo.Info;
  delete context.trailerInfo.ID;

  const metadataKey = PDFName.of('Metadata');
  const pending = Object.values(context.trailerInfo);
  const visited = new Set();
  const reachable = new Set();

  while (pending.length) {
    const object = pending.pop();
    if (!object || visited.has(object)) continue;
    visited.add(object);

    if (object instanceof PDFRef) {
      reachable.add(object.toString());
      pending.push(context.lookup(object));
    } else if (object instanceof PDFDict) {
      object.delete(metadataKey);
      for (const value of object.values()) pending.push(value);
    } else if (object instanceof PDFArray) {
      for (let index = 0; index < object.size(); index += 1) pending.push(object.get(index));
    } else if (object.dict instanceof PDFDict) {
      pending.push(object.dict);
    }
  }

  // pdf-lib writes registered objects even when no longer referenced. Prune those
  // objects so old Info values and detached XMP streams cannot survive in the bytes.
  for (const [reference] of context.enumerateIndirectObjects()) {
    if (!reachable.has(reference.toString())) context.delete(reference);
  }
}
