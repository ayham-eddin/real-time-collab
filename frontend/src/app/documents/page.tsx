"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DocumentItem = {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

const API_BASE_URL = "http://localhost:4000";

const DocumentsPage = () => {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Helper to read token safely on client
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  // Load documents on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login");
            return;
          }
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Failed to load documents");
        }

        const data: DocumentItem[] = await res.json();
        setDocuments(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [router]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (!newTitle.trim()) {
      setCreateError("Title is required");
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create document");
      }

      const created = data.document as DocumentItem;

      // Optimistic update
      setDocuments((prev) => [created, ...prev]);
      setNewTitle("");

      // Navigate directly to editor for this document (we'll build it later)
      router.push(`/documents/${created._id}`);
    } catch (err: any) {
      setCreateError(err.message || "Could not create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenDocument = (id: string) => {
    router.push(`/documents/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-slate-100">
      {/* top gradient glow */}
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-screen">
        <div className="absolute -top-40 left-10 h-80 w-80 rounded-full bg-purple-500 blur-3xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              realtime-collab
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              Your documents
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Create, edit, and collaborate in real time. All your documents in
              one clean, fast dashboard.
            </p>
          </div>

          {/* Create document form (inline, modern pill) */}
          <form
            onSubmit={handleCreateDocument}
            className="mt-2 flex w-full max-w-sm items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-2 backdrop-blur-md sm:mt-0"
          >
            <input
              type="text"
              placeholder="New document title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating…" : "Create"}
            </button>
          </form>
        </header>

        {/* Errors */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        {createError && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            {createError}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="mt-12 flex flex-1 flex-col items-center justify-center text-center text-slate-300">
            <div className="mb-4 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-400">
              No documents yet
            </div>
            <p className="text-lg font-medium text-slate-50">
              Start by creating your first document.
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Click the <span className="font-semibold">Create</span> button
              above to spin up a new collaborative document.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const updated = new Date(doc.updatedAt);
              const updatedLabel = updated.toLocaleString();

              return (
                <button
                  key={doc._id}
                  onClick={() => handleOpenDocument(doc._id)}
                  className="group flex h-36 flex-col justify-between rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-indigo-900/60 p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.75)] transition-transform transition-shadow hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.9)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-sm font-semibold text-slate-50">
                      {doc.title || "Untitled document"}
                    </h2>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 group-hover:bg-emerald-500/20">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">
                      Updated{" "}
                      <span className="font-medium text-slate-200">
                        {updatedLabel}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100">
                      Open
                      <span aria-hidden>↗</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};

export default DocumentsPage;
