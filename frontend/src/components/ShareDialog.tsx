"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ShareDialogProps = {
  documentId: string;
  onInvited?: () => void;
};

const API_BASE_URL = "http://localhost:4000";

export const ShareDialog: React.FC<ShareDialogProps> = ({
  documentId,
  onInvited,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setMessage("Please enter an email.");
      return;
    }

    const token = getToken();
    if (!token) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch(
        `${API_BASE_URL}/api/documents/${documentId}/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "Something went wrong.");
        return;
      }

      setMessage("User successfully invited.");
      setEmail("");

      if (onInvited) onInvited();
    } catch (err) {
      setMessage("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Share
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite collaborator</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <Input
            type="email"
            placeholder="User email…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button onClick={handleInvite} disabled={loading} className="w-full">
            {loading ? "Inviting…" : "Send Invite"}
          </Button>

          {message && (
            <p className="text-xs text-center text-slate-300">{message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
