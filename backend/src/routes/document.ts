import { Router, Request, Response } from "express";
import { Document } from "../models/Document";
import { User } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

export const documentRouter = Router();

// Create document
documentRouter.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title } = req.body;

      const doc = new Document({
        title,
        owner: req.userId,
        content: "",
        collaborators: [],
      });

      await doc.save();

      return res.json({ message: "Document created", document: doc });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error creating document", error });
    }
  }
);

// Get documents for user
documentRouter.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const docs = await Document.find({
        $or: [{ owner: req.userId }, { collaborators: req.userId }],
      });

      return res.json(docs);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching documents", error });
    }
  }
);

// Get single document
documentRouter.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const doc = await Document.findById(req.params.id);

      if (!doc) return res.status(404).json({ message: "Document not found" });

      if (
        doc.owner !== req.userId &&
        !doc.collaborators.includes(req.userId!)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json(doc);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching document", error });
    }
  }
);

// =========================
// ⭐ INVITE COLLABORATOR ⭐
// =========================
documentRouter.post(
  "/:id/invite",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const { email } = req.body;

      if (!email) return res.status(400).json({ message: "Email is required" });

      const doc = await Document.findById(docId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      // Only owner can invite
      if (doc.owner !== req.userId) {
        return res.status(403).json({ message: "Only owner can invite users" });
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user)
        return res
          .status(404)
          .json({ message: "No user found with that email" });

      const userId = user._id.toString();

      // Prevent duplicate
      if (doc.collaborators.includes(userId)) {
        return res
          .status(400)
          .json({ message: "User already has access to this document" });
      }

      // Add collaborator
      doc.collaborators.push(userId);
      await doc.save();

      return res.json({
        message: "User added as collaborator",
        document: doc,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error inviting collaborator", error });
    }
  }
);

// Save document content
documentRouter.post(
  "/:id/save",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;

      if (typeof content !== "string") {
        return res.status(400).json({ message: "Missing content string" });
      }

      const doc = await Document.findByIdAndUpdate(
        req.params.id,
        {
          content,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      return res.json({ message: "Saved", document: doc });
    } catch (error) {
      return res.status(500).json({ message: "Error saving document", error });
    }
  }
);

// Delete document
documentRouter.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const doc = await Document.findById(req.params.id);

      if (!doc) return res.status(404).json({ message: "Document not found" });

      if (doc.owner !== req.userId) {
        return res
          .status(403)
          .json({ message: "Only owner can delete this document" });
      }

      await doc.deleteOne();

      return res.json({ message: "Document deleted" });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error deleting document", error });
    }
  }
);
