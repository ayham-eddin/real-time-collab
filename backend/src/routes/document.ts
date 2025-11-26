import { Router, Request, Response } from "express";
import { Document } from "../models/Document";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import * as Y from "yjs";  

export const documentRouter = Router();

// Create document
documentRouter.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;

    const doc = new Document({
      title,
      owner: req.userId,
      content: "",
      collaborators: []
    });

    await doc.save();

    res.json({ message: "Document created", document: doc });
  } catch (error) {
    res.status(500).json({ message: "Error creating document", error });
  }
});

// Get all documents belonging to user
documentRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.userId },
        { collaborators: req.userId }
      ]
    });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching documents", error });
  }
});

// Get single document
documentRouter.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner !== req.userId && !doc.collaborators.includes(req.userId!)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: "Error fetching document", error });
  }
});

// Autosave Yjs content → MongoDB
documentRouter.post("/:id/save", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { update } = req.body; // Base64 string

    if (!update) {
      return res.status(400).json({ message: "Missing update data" });
    }

    // Convert base64 to Uint8Array
    const binary = Uint8Array.from(Buffer.from(update, "base64"));

    // Apply Yjs update to new doc
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, binary);

    // Extract text
    const text = ydoc.getText("content").toString();

    // Save to DB
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        content: text,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json({ message: "Saved", document: doc });
  } catch (error) {
    res.status(500).json({ message: "Error saving document", error });
  }
});

// Delete document
documentRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner !== req.userId) {
      return res.status(403).json({ message: "Only owner can delete this" });
    }

    await doc.deleteOne();

    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting document", error });
  }
});
