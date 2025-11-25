"use client";

import { use, useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import * as Y from "yjs";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Correct typing for params (no 'any', no unknown)
type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  // unwrap params (Next.js 14+)
  const { id } = use(params);

  const [ydoc] = useState(() => new Y.Doc());

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    socket.connect();
    socket.emit("join-document", id);

    socket.on("init-doc", (update: Uint8Array) => {
      Y.applyUpdate(ydoc, update);
      const text = ydoc.getText("content").toString();
      editor.commands.setContent(text);
    });

    socket.on("update-doc", (update: Uint8Array) => {
      Y.applyUpdate(ydoc, update);
      const text = ydoc.getText("content").toString();
      editor.commands.setContent(text);
    });

    editor.on("update", () => {
      const ytext = ydoc.getText("content");
      ytext.delete(0, ytext.length);
      ytext.insert(0, editor.getHTML());

      const update = Y.encodeStateAsUpdate(ydoc);
      socket.emit("update-doc", { docId: id, update });
    });

    return () => {
      socket.disconnect();
    };
  }, [editor, id, ydoc]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Document: {id}</h1>
      <EditorContent editor={editor} />
    </div>
  );
}
