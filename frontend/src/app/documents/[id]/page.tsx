"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { io, Socket } from "socket.io-client";
import { ShareDialog } from "@/components/ShareDialog";

const API_BASE_URL = "http://localhost:4000";

type DocumentMeta = {
  _id: string;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
};

type DocumentPageProps = {
  params: {
    id: string;
  };
};

const normalizeUpdate = (
  update: Uint8Array | ArrayBuffer | number[]
): Uint8Array => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  return new Uint8Array(update);
};

const DocumentPage = ({ params }: DocumentPageProps) => {
  const router = useRouter();
  const { id: documentId } = params;

  const [docMeta, setDocMeta] = useState<DocumentMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [yDoc] = useState<Y.Doc>(() => new Y.Doc());
  const socketRef = useRef<Socket | null>(null);

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  // -------------------------------
  // Fetch document meta
  // -------------------------------
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const loadMeta = async () => {
      try {
        setMetaLoading(true);

        const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login");
            return;
          }
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Failed to load document");
        }

        const data = (await res.json()) as DocumentMeta;
        setDocMeta(data);
      } catch (err: any) {
        setMetaError(err.message || "Error loading");
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, [documentId, router]);

  // -------------------------------
  // Setup Socket.io + Yjs
  // -------------------------------
  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join-document", documentId));

    socket.on("init-doc", (update) => {
      const normalized = normalizeUpdate(update);
      Y.applyUpdate(yDoc, normalized, "remote");
    });

    socket.on("update-doc", (update) => {
      const normalized = normalizeUpdate(update);
      Y.applyUpdate(yDoc, normalized, "remote");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, yDoc]);

  // -------------------------------
  // Emit changes to server
  // -------------------------------
  useEffect(() => {
    const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      socketRef.current?.emit("update-doc", { docId: documentId, update });
    };

    yDoc.on("update", handleLocalUpdate);

    return () => {
      yDoc.off("update", handleLocalUpdate);
    };
  }, [documentId, yDoc]);

  // -------------------------------
  // Initialize TipTap editor
  // -------------------------------
  useEffect(() => {
    const instance = new Editor({
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({
          document: yDoc,
          field: "content",
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "min-h-[60vh] w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-50 text-sm focus:outline-none",
        },
      },
    });

    setEditor(instance);

    return () => instance.destroy();
  }, [yDoc]);

  // -------------------------------
  // Auto-save every 10 seconds
  // -------------------------------
  useEffect(() => {
    if (!editor) return;

    const token = getToken();
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        setIsSaving(true);

        const html = editor.getHTML();

        const res = await fetch(
          `${API_BASE_URL}/api/documents/${documentId}/save`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: html }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Save failed");
        }
      } catch (err: any) {
        setSaveError(err.message);
      } finally {
        setIsSaving(false);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [editor, documentId]);

  const createdLabel = docMeta?.createdAt
    ? new Date(docMeta.createdAt).toLocaleString()
    : "";

  const updatedLabel = docMeta?.updatedAt
    ? new Date(docMeta.updatedAt).toLocaleString()
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/documents")}
            className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <ShareDialog
              documentId={documentId}
              onInvited={() => console.log("User invited")}
            />

            <div className="text-right text-xs">
              {isSaving ? (
                <span className="text-emerald-300">Saving…</span>
              ) : (
                <span className="text-emerald-300">Saved</span>
              )}
              {updatedLabel && <div>Updated: {updatedLabel}</div>}
            </div>
          </div>
        </header>

        {metaError && (
          <div className="mt-4 rounded bg-red-500/20 px-4 py-2 text-sm text-red-200">
            {metaError}
          </div>
        )}

        <h1 className="mt-4 text-xl font-semibold">
          {docMeta?.title || "Untitled Document"}
        </h1>

        {!editor ? (
          <div className="mt-6 h-[60vh] animate-pulse rounded-2xl bg-white/10" />
        ) : (
          <EditorContent editor={editor} className="mt-6" />
        )}
      </main>
    </div>
  );
};

export default DocumentPage;
