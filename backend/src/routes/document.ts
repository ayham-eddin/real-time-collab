import { Router, Request, Response } from "express";
import { Document } from "../models/Document";
import { authMiddleware, AuthRequest } from "../middleware/auth";

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
