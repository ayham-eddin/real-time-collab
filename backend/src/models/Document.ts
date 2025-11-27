// backend/src/models/Document.ts
import mongoose, { Schema, Document as DocInterface } from "mongoose";

export interface IDocument extends DocInterface {
  title: string;
  content: string;
  owner: string; // userId
  collaborators: string[];
  ydocState?: Buffer; // Yjs binary state
}

const DocumentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" }, // optional HTML/preview
    owner: { type: String, required: true },
    collaborators: [{ type: String }],
    // Persist full Yjs document state as binary
    ydocState: { type: Buffer, required: false },
  },
  { timestamps: true }
);

export const Document = mongoose.model<IDocument>("Document", DocumentSchema);
