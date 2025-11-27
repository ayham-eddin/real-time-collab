import { Document } from "./models/Document";
import { getYDoc } from "./yjs";
import * as Y from "yjs";

export const saveYDocToMongo = async (docId: string): Promise<void> => {
  const ydoc: Y.Doc = getYDoc(docId);

  // Use XmlFragment "content" to match @tiptap/extension-collaboration
  const fragment = ydoc.getXmlFragment("content");
  const plainText = fragment.toString(); // This is plain text, not HTML

  await Document.findByIdAndUpdate(docId, {
    content: plainText,
  });
};
