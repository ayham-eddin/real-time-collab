import * as Y from "yjs";

// In-memory map of Yjs documents
const docs = new Map<string, Y.Doc>();

export const getYDoc = (id: string): Y.Doc => {
  if (!docs.has(id)) {
    const ydoc = new Y.Doc();
    docs.set(id, ydoc);
  }
  return docs.get(id)!;
};
