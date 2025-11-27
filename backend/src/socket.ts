// backend/src/socket.ts
import { Server } from "socket.io";
import * as Y from "yjs";
import { getYDoc } from "./yjs";
import { saveYDocToMongo } from "./saveYDoc";

const normalizeUpdate = (
  update: Uint8Array | number[] | ArrayBuffer
): Uint8Array => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  return new Uint8Array(update); // number[]
};

export const createSocketServer = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // User joins a document room
    socket.on("join-document", async (docId: string) => {
      try {
        socket.join(docId);

        // Load Yjs doc (from memory or Mongo) and send initial state
        const ydoc = await getYDoc(docId);
        const update = Y.encodeStateAsUpdate(ydoc);

        socket.emit("init-doc", update);
        console.log(`📄 Joined doc ${docId}`);
      } catch (err) {
        console.error("Error in join-document:", err);
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
          const ydoc = await getYDoc(docId);
          const normalized = normalizeUpdate(update);

          // Apply update to Yjs state
          Y.applyUpdate(ydoc, normalized);

          // Persist Y.Doc to Mongo
          await saveYDocToMongo(docId);

          // Broadcast update to other clients
          socket.to(docId).emit("update-doc", normalized);
        } catch (err) {
          console.error("Error in update-doc:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });

  return io;
};
