import { Server } from "socket.io";
import { getYDoc } from "./yjs";
import * as Y from "yjs";

export const createSocketServer = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // User joins a document room
    socket.on("join-document", (docId) => {
      socket.join(docId);

      // Load Yjs doc and send initial state
      const ydoc = getYDoc(docId);
      const update = Y.encodeStateAsUpdate(ydoc);

      socket.emit("init-doc", update);
      console.log(`📄 Joined doc ${docId}`);
    });

    // Receive document updates
    socket.on("update-doc", ({ docId, update }) => {
      const ydoc = getYDoc(docId);

      // Apply update to Yjs state
      Y.applyUpdate(ydoc, update);

      // Broadcast update to others
      socket.to(docId).emit("update-doc", update);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });

  return io;
};
