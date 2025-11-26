"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { socket } from "@/lib/socket";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

type DocumentPageProps = {
  // Next 16 passes params as a Promise – we *must* unwrap with React.use()
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const router = useRouter();

  // ✅ Unwrap dynamic route params correctly for Next 16 / React 19
  const { id } = use(params);

  // -------- Yjs core state (stable, no refs in render) --------
  const [ydoc] = useState(() => new Y.Doc());
  const [awareness] = useState(() => new Awareness(ydoc));

  // -------- UI state --------
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved">("saved");

  // Track pending changes & hold a stable save function
  const hasPendingChangesRef = useRef(false);
  const saveFnRef = useRef<() => Promise<void>>(async () => {});

  // -------- Tiptap editor --------
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
    // 👇 important for SSR / hydration
    immediatelyRender: false,
    onBlur: () => {
      void saveFnRef.current();
    },
  });

  // -------- Seed Yjs from Mongo on first load (so refresh keeps content) --------
  useEffect(() => {
    const loadDocumentFromApi = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`http://localhost:4000/api/documents/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const doc = await res.json();

        if (typeof doc.content === "string" && doc.content.length > 0) {
          const yText = ydoc.getText("content");
          if (yText.length === 0) {
            // Only seed if empty, to avoid overwriting active collab state
            yText.insert(0, doc.content);
          }
        }
      } catch (error) {
        console.error("Error loading document content:", error);
      }
    };

    loadDocumentFromApi();
  }, [id, ydoc]);

  // -------- Define the save function (no setState inside effect body) --------
  useEffect(() => {
    saveFnRef.current = async () => {
      if (!hasPendingChangesRef.current) return;

      try {
        setSaveStatus("saving");

        const update = Y.encodeStateAsUpdate(ydoc);
        const base64 = Buffer.from(update).toString("base64");

        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `http://localhost:4000/api/documents/${id}/save`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ update: base64 }),
          }
        );

        if (!res.ok) {
          console.error("Save failed:", await res.text());
          return;
        }

        hasPendingChangesRef.current = false;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Save error:", error);
      }
    };
  }, [ydoc, id]);

  // -------- Mark pending changes whenever Yjs updates --------
  useEffect(() => {
    const markPending = () => {
      hasPendingChangesRef.current = true;
      setSaveStatus("saving");
    };

    ydoc.on("update", markPending);
    return () => {
      ydoc.off("update", markPending);
    };
  }, [ydoc]);

  // -------- Autosave every 3 seconds --------
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void saveFnRef.current();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // -------- WebSocket + realtime sync --------
  useEffect(() => {
    if (!editor) return;

    socket.connect();
    socket.emit("join-document", id);

    const handleInit = (update: Uint8Array) => {
      Y.applyUpdate(ydoc, update);
    };

    const handleRemoteUpdate = (update: Uint8Array) => {
      Y.applyUpdate(ydoc, update);
    };

    socket.on("init-doc", handleInit);
    socket.on("update-doc", handleRemoteUpdate);

    const handleLocalUpdate = (update: Uint8Array) => {
      socket.emit("update-doc", { docId: id, update });
    };

    ydoc.on("update", handleLocalUpdate);

    return () => {
      void saveFnRef.current(); // final save
      socket.off("init-doc", handleInit);
      socket.off("update-doc", handleRemoteUpdate);
      ydoc.off("update", handleLocalUpdate);
      socket.disconnect();
      ydoc.destroy();
    };
  }, [editor, id, ydoc]);

  // -------- Save on tab close --------
  useEffect(() => {
    const beforeUnloadHandler = () => {
      void saveFnRef.current();
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () =>
      window.removeEventListener("beforeunload", beforeUnloadHandler);
  }, []);

  // -------- Simple loading UI while editor is being created --------
  if (!editor) {
    return <div className="p-6 text-gray-400">Loading editor…</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-black text-white">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => router.push("/documents")}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">
          Document: <span className="font-mono">{id}</span>
        </h1>

        <div className="text-sm text-gray-400">
          {saveStatus === "saving" ? "Saving…" : "Saved"}
        </div>
      </div>

      <div className="bg-neutral-900 rounded-md min-h-[300px] p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
