// backend/src/yjs.ts
import * as Y from "yjs";
import { Document, IDocument } from "./models/Document";

// In-memory map of Yjs documents
const docs = new Map<string, Y.Doc>();

export const getYDoc = async (id: string): Promise<Y.Doc> => {
  // Already in memory → return quickly
  const existing = docs.get(id);
  if (existing) return existing;

  const ydoc = new Y.Doc();

  try {
    // Load Mongo document (lean for performance)
    const doc = (await Document.findById(id).lean<IDocument>().exec()) || null;

    if (doc && doc.ydocState) {
      // doc.ydocState is a Buffer (which extends Uint8Array)
      const storedUpdate = new Uint8Array(
        doc.ydocState.buffer,
        doc.ydocState.byteOffset,
        doc.ydocState.byteLength
      );

      // Restore Yjs state from stored update
      Y.applyUpdate(ydoc, storedUpdate);
    }
  } catch (err) {
    console.error("Error loading Y.Doc from Mongo:", err);
  }

  docs.set(id, ydoc);
  return ydoc;
};
