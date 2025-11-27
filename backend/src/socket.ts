import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import * as Y from "yjs";
import { getYDoc } from "./yjs";
import { saveYDocToMongo } from "./saveYDoc";

type CursorUpdatePayload = {
  docId: string;
  userId: string;
  name: string;
  color: string;
  from: number;
  to: number;
};

const normalizeUpdate = (
  update: Uint8Array | number[] | ArrayBuffer
): Uint8Array => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  return new Uint8Array(update);
};

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log("🟢 Connected:", socket.id);

    // User joins a document room
    socket.on("join-document", (docId: string) => {
      try {
        socket.join(docId);

        const ydoc = getYDoc(docId);
        const update = Y.encodeStateAsUpdate(ydoc);

        socket.emit("init-doc", update);
        console.log(`📄 Joined doc ${docId}`);
      } catch (error) {
        console.error("Error in join-document:", error);
      }
    });

    // Receive document updates
    socket.on(
      "update-doc",
      async ({
        docId,
        update,
      }: {
        docId: string;
        update: Uint8Array | number[] | ArrayBuffer;
      }) => {
        try {
          const ydoc = getYDoc(docId);
          const normalized = normalizeUpdate(update);

          // Apply update to Yjs state
          Y.applyUpdate(ydoc, normalized);

          // Persist Y.Doc → Mongo
          await saveYDocToMongo(docId);

          // Broadcast update to other clients
          socket.to(docId).emit("update-doc", normalized);
        } catch (error) {
          console.error("Error in update-doc:", error);
        }
      }
    );

    // Live cursor updates
    socket.on("cursor-update", (payload: CursorUpdatePayload) => {
      try {
        socket.to(payload.docId).emit("cursor-update", payload);
      } catch (error) {
        console.error("Error in cursor-update:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });

  return io;
};
