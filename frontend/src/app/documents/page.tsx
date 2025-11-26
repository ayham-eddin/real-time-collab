"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DocumentType = {
  _id: string;
  title: string;
  owner: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const router = useRouter();

  // Fetch documents from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:4000/api/documents", {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Create new document
  async function createDocument() {
    setCreating(true);

    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("http://localhost:4000/api/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ title: "Untitled Document" }),
    });

    const data = await res.json();
    setCreating(false);

    if (data?.document?._id) {
      router.push(`/documents/${data.document._id}`);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Documents</h1>

        <button
          onClick={createDocument}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {creating ? "Creating..." : "New Document"}
        </button>
      </div>

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-500">No documents yet.</p>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <button
              key={doc._id}
              onClick={() => router.push(`/documents/${doc._id}`)}
              className="w-full text-left p-4 border rounded-lg hover:bg-gray-100"
            >
              <h2 className="text-lg font-semibold">{doc.title}</h2>
              <p className="text-gray-600 text-sm">{doc._id}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
