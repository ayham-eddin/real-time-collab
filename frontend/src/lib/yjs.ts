import * as Y from "yjs";

const docs = new Map<string, Y.Doc>();

export const getYDoc = (id: string) => {
  // Reuse Y.Doc if already created
  if (!docs.has(id)) {
    docs.set(id, new Y.Doc());
  }

  return docs.get(id)!;
};
