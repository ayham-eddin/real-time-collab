"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // Read token only once (safe lazy initializer)
  const [hasToken] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("token");
    }
    return false;
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-12 py-20 px-10 bg-white dark:bg-black sm:items-start">

        {/* Title */}
        <h1 className="text-4xl font-bold text-black dark:text-white">
          Real-Time Collaboration App
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">
          Create and edit documents with real-time collaboration powered by Yjs and Tiptap.
        </p>

        {/* Main CTA Button */}
        <button
          onClick={() => router.push("/documents")}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          {hasToken ? "Go to My Documents" : "Login to Continue"}
        </button>

        {/* Helpful Links */}
        <div className="mt-6 flex flex-col gap-2 text-gray-500 text-sm">
          <a href="https://nextjs.org/docs" className="hover:underline" target="_blank">
            Next.js Documentation
          </a>
          <a href="https://tiptap.dev" className="hover:underline" target="_blank">
            Tiptap Documentation
          </a>
        </div>

      </main>
    </div>
  );
}
