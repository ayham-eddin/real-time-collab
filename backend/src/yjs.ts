import * as Y from "yjs";
import { Document } from "./models/Document";

// In-memory map of Yjs documents
const docs = new Map<string, Y.Doc>();

export const getYDoc = (id: string): Y.Doc => {
  // If Y.Doc exists in memory → return it
  const existing = docs.get(id);
  if (existing) return existing;

  const ydoc = new Y.Doc();

  docs.set(id, ydoc);
  return ydoc;
};
