"use client";

import { use, useEffect, useState } from "react";
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

  // Shared Yjs state
  const [ydoc] = useState(() => new Y.Doc());
  const awareness = new Awareness(ydoc);

  // Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({
        document: ydoc,
        field: "content",
      }),
      CollaborationCursor.configure({
        provider: { awareness },
        user: {
          name: "Ayham",
          color: "#FF9800",
        },
      }),
    ],
    content: "",
    autofocus: false,
    editable: true,
  });

  // AUTOSAVE every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const update = Y.encodeStateAsUpdate(ydoc);
        const base64 = Buffer.from(update).toString("base64");

        fetch(`http://localhost:4000/api/documents/${id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: base64 }),
        });
      } catch (err) {
        console.error("Autosave error:", err);
      }
    }, 3000); // every 3 seconds

    return () => clearInterval(interval);
  }, [ydoc, id]);

  useEffect(() => {
    if (!editor) return;

    // Connect WebSocket
    socket.connect();
    socket.emit("join-document", id);

    // Receive full initial update
    socket.on("init-doc", (data: Uint8Array) => {
      Y.applyUpdate(ydoc, data);
    });

    // Remote updates
    socket.on("update-doc", (data: Uint8Array) => {
      Y.applyUpdate(ydoc, data);
    });

    // Local Yjs updates -> send to server
    ydoc.on("update", (update: Uint8Array) => {
      socket.emit("update-doc", { docId: id, update });
    });

    return () => {
      socket.disconnect();
      ydoc.destroy();
    };
  }, [editor, id, ydoc]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Document: {id}</h1>
      <EditorContent editor={editor} />
    </div>
  );
}
