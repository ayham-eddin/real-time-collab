import { Document } from "./models/Document";
import { getYDoc } from "./yjs";
import * as Y from "yjs";

export const saveYDocToMongo = async (docId: string) => {
  const ydoc = getYDoc(docId);

  const text = ydoc.getText("content").toString();

  await Document.findByIdAndUpdate(docId, {
    content: text
  });
};
