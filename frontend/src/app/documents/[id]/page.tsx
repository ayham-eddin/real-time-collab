"use client";

import {
  use,
  useEffect,
  useState,
  useRef,
} from "react";

import { socket } from "@/lib/socket";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);

  // Yjs shared state
  const [ydoc] = useState(() => new Y.Doc());
  const awareness = new Awareness(ydoc);

  // Save status UI
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Track unsaved changes
  const hasPendingChanges = useRef(false);

  // Save function ref (stable function pointer)
  const saveFnRef = useRef<() => Promise<void>>(async () => {});

  // Editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc, field: "content" }),
      CollaborationCursor.configure({
        provider: { awareness },
        user: { name: "Ayham", color: "#FF9800" },
      }),
    ],
    content: "",
    autofocus: false,
    editable: true,
    onBlur: () => saveFnRef.current(), // Save on blur
  });

  // Define save function (safe for React Compiler)
  useEffect(() => {
    saveFnRef.current = async () => {
      if (!hasPendingChanges.current) return;

      try {
        setSaveStatus("saving");

        const update = Y.encodeStateAsUpdate(ydoc);
        const base64 = Buffer.from(update).toString("base64");

        await fetch(`http://localhost:4000/api/documents/${id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: base64 }),
        });

        hasPendingChanges.current = false;
        setSaveStatus("saved");
      } catch (err) {
        console.error("Save error:", err);
      }
    };
  }, [ydoc, id]);

  // Autosave every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveFnRef.current();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Mark pending changes when Yjs updates
  useEffect(() => {
    ydoc.on("update", () => {
      hasPendingChanges.current = true;
      setSaveStatus("saving");
    });
  }, [ydoc]);

  // Websocket + initial sync
  useEffect(() => {
    if (!editor) return;

    socket.connect();
    socket.emit("join-document", id);

    socket.on("init-doc", (data: Uint8Array) => {
      Y.applyUpdate(ydoc, data);
    });

    socket.on("update-doc", (data: Uint8Array) => {
      Y.applyUpdate(ydoc, data);
    });

    ydoc.on("update", (update: Uint8Array) => {
      socket.emit("update-doc", { docId: id, update });
    });

    return () => {
      saveFnRef.current(); // Final save
      socket.disconnect();
      ydoc.destroy();
    };
  }, [editor, id, ydoc]);

  // Save on tab close
  useEffect(() => {
    const handler = () => saveFnRef.current();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Document: {id}</h1>
        <div className="text-sm text-gray-500">
          {saveStatus === "saving" ? "Saving..." : "Saved"}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
