// backend/src/saveYDoc.ts
import * as Y from "yjs";
import { Document } from "./models/Document";
import { getYDoc } from "./yjs";

export const saveYDocToMongo = async (docId: string): Promise<void> => {
  const ydoc: Y.Doc = await getYDoc(docId);

  // Encode full Yjs state as binary update
  const update = Y.encodeStateAsUpdate(ydoc);

  // Optional: also store plain text/HTML for previews
  const fragment = ydoc.getXmlFragment("content");
  const plainText = fragment.toString();

  await Document.findByIdAndUpdate(
    docId,
    {
      ydocState: Buffer.from(update),
      content: plainText,
    },
    { new: false }
  ).exec();
};
