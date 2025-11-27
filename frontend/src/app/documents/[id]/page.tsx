"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { io, Socket } from "socket.io-client";

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

type RemoteCursor = {
  userId: string;
  name: string;
  color: string;
  from: number;
  to: number;
  docId?: string;
};

type CursorRect = {
  userId: string;
  name: string;
  color: string;
  top: number;
  left: number;
};

const normalizeUpdate = (
  update: Uint8Array | ArrayBuffer | number[]
): Uint8Array => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  return new Uint8Array(update);
};

const colorsPalette = [
  "#f97316", // orange
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
];

const pickColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * 31) | 0;
  }
  const index = Math.abs(hash) % colorsPalette.length;
  return colorsPalette[index];
};

const DocumentPage: React.FC<DocumentPageProps> = ({ params }) => {
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
  const currentUserRef = useRef<{
    userId: string;
    name: string;
    color: string;
  } | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [cursorRects, setCursorRects] = useState<CursorRect[]>([]);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const initCurrentUser = () => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        currentUserRef.current = {
          userId: "me",
          name: "You",
          color: pickColor("me"),
        };
        return;
      }

      const parsed = JSON.parse(stored) as {
        id?: string;
        username?: string;
        email?: string;
      };
      const userId = parsed.id ?? "me";
      const name = parsed.username ?? parsed.email ?? "You";
      const color = pickColor(userId);

      currentUserRef.current = { userId, name, color };
    } catch {
      currentUserRef.current = {
        userId: "me",
        name: "You",
        color: pickColor("me"),
      };
    }
  };

  // -------------------------------
  // Load document meta (title, owner)
  // -------------------------------
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    initCurrentUser();

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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error loading";
        setMetaError(message);
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, [documentId, router]);

  // -------------------------------
  // Setup Socket.io + Yjs sync
  // -------------------------------
  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-document", documentId);
    });

    socket.on("init-doc", (update: Uint8Array | ArrayBuffer | number[]) => {
      const normalized = normalizeUpdate(update);
      Y.applyUpdate(yDoc, normalized, "remote");
    });

    socket.on("update-doc", (update: Uint8Array | ArrayBuffer | number[]) => {
      const normalized = normalizeUpdate(update);
      Y.applyUpdate(yDoc, normalized, "remote");
    });

    // Receive remote cursor updates
    socket.on("cursor-update", (payload: RemoteCursor) => {
      const currentUser = currentUserRef.current;
      if (currentUser && payload.userId === currentUser.userId) {
        return;
      }

      setRemoteCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== payload.userId);
        // if selection is empty, remove cursor
        if (payload.from === payload.to) {
          return filtered;
        }
        return [...filtered, payload];
      });
    });

    return () => {
      socket.off("init-doc");
      socket.off("update-doc");
      socket.off("cursor-update");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, yDoc]);

  // -------------------------------
  // Emit local Yjs updates to server
  // -------------------------------
  useEffect(() => {
    const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      const socket = socketRef.current;
      if (!socket) return;

      socket.emit("update-doc", { docId: documentId, update });
    };

    yDoc.on("update", onLocalUpdate);

    return () => {
      yDoc.off("update", onLocalUpdate);
    };
  }, [documentId, yDoc]);

  // -------------------------------
  // Initialize TipTap AFTER mount (SSR safe)
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
            "min-h-[60vh] w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-50 text-sm focus:outline-none leading-relaxed",
        },
      },
    });

    setEditor(instance);

    return () => {
      instance.destroy();
    };
  }, [yDoc]);

  // -------------------------------
  // Send cursor updates on selection change
  // -------------------------------
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = ({ editor: ed }: { editor: Editor }) => {
      const selection = ed.state.selection;
      const from = selection.from;
      const to = selection.to;

      const socket = socketRef.current;
      const currentUser = currentUserRef.current;

      if (!socket || !currentUser) return;

      socket.emit("cursor-update", {
        docId: documentId,
        userId: currentUser.userId,
        name: currentUser.name,
        color: currentUser.color,
        from,
        to,
      } satisfies RemoteCursor);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, documentId]);

  // -------------------------------
  // Auto-save HTML snapshot
  // -------------------------------
  useEffect(() => {
    if (!editor) return;

    const token = getToken();
    if (!token) return;

    const interval = window.setInterval(async () => {
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

        setSaveError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error saving";
        setSaveError(message);
      } finally {
        setIsSaving(false);
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [editor, documentId]);

  // -------------------------------
  // Compute cursor rectangles for overlay
  // -------------------------------
  useEffect(() => {
    if (!editor) return;
    if (!editorContainerRef.current) return;

    const view = (editor as unknown as { view: any }).view;
    const containerRect = editorContainerRef.current.getBoundingClientRect();

    const nextRects: CursorRect[] = [];

    remoteCursors.forEach((cursor) => {
      try {
        const coords = view.coordsAtPos(cursor.to);
        nextRects.push({
          userId: cursor.userId,
          name: cursor.name,
          color: cursor.color,
          top: coords.top - containerRect.top,
          left: coords.left - containerRect.left,
        });
      } catch {
        // ignore invalid positions
      }
    });

    setCursorRects(nextRects);
  }, [editor, remoteCursors]);

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
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/documents")}
              className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-200 transition hover:bg-white/10"
            >
              ← Back
            </button>

            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Realtime editor
              </span>
              <h1 className="text-lg font-semibold text-slate-50 sm:text-xl">
                {docMeta?.title || "Untitled Document"}
              </h1>

              {/* Small presence info (count only) */}
              {remoteCursors.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                  <span className="rounded-full bg-white/5 px-2 py-0.5">
                    {remoteCursors.length}{" "}
                    {remoteCursors.length === 1 ? "person" : "people"} here
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
            {isSaving ? (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                Saving…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                Saved
              </span>
            )}
            {updatedLabel && (
              <span className="hidden text-[10px] sm:inline">
                Updated: {updatedLabel}
              </span>
            )}
          </div>
        </header>

        {/* Errors */}
        {metaError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
            {metaError}
          </div>
        )}

        {saveError && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            {saveError}
          </div>
        )}

        {/* Meta badges */}
        {!metaLoading && docMeta && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="rounded-full bg-white/5 px-2 py-0.5">
              Created: <span className="text-slate-200">{createdLabel}</span>
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5">
              Updated: <span className="text-slate-200">{updatedLabel}</span>
            </span>
          </div>
        )}

        {/* Editor + cursor overlay */}
        {!editor ? (
          <div className="mt-6 h-[60vh] animate-pulse rounded-2xl bg-white/10" />
        ) : (
          <div ref={editorContainerRef} className="relative mt-6">
            <EditorContent editor={editor} suppressHydrationWarning />

            {/* Remote cursors overlay */}
            {cursorRects.map((cursor) => (
              <div
                key={cursor.userId}
                className="pointer-events-none absolute z-20 flex flex-col items-center"
                style={{
                  top: cursor.top,
                  left: cursor.left,
                }}
              >
                <div
                  className="h-4 w-0.5 rounded-full"
                  style={{ backgroundColor: cursor.color }}
                />
                <div
                  className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-900 shadow-sm"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentPage;
