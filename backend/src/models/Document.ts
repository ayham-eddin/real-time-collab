import mongoose, { Schema, Document as DocInterface } from "mongoose";

export interface IDocument extends DocInterface {
  title: string;
  content: string;
  owner: string;         // userId
  collaborators: string[]; // optional
}

const DocumentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },
    owner: { type: String, required: true },
    collaborators: [{ type: String }],
  },
  { timestamps: true }
);

export const Document = mongoose.model<IDocument>("Document", DocumentSchema);
