import { createServer } from "node:http";

const production = process.argv.includes("--production");
const dev = !production;
const hostname = process.env.RESYNC_HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

process.env.NODE_ENV = production ? "production" : "development";

const [{ default: next }, { Server }] = await Promise.all([
  import("next"),
  import("socket.io"),
]);

const httpServer = createServer();
// Webpack is more stable with this custom HTTP/Socket.IO development server.
const app = next({ dev, hostname, port, httpServer, ...(dev ? { webpack: true } : {}) });
const handle = app.getRequestHandler();

await app.prepare();

httpServer.on("request", (request, response) => {
  void handle(request, response);
});

const io = new Server(httpServer, {
  path: "/socket.io",
  serveClient: false,
});

const organizationIdPattern = /^[a-z0-9_-]{8,80}$/i;

function organizationRoom(organizationId) {
  return typeof organizationId === "string" && organizationIdPattern.test(organizationId)
    ? `organization:${organizationId}`
    : null;
}

io.on("connection", (socket) => {
  socket.on("organization:join", ({ organizationId } = {}) => {
    const room = organizationRoom(organizationId);
    if (!room) return;

    // A browser should receive reservation events for only its current workspace.
    for (const joinedRoom of socket.rooms) {
      if (joinedRoom.startsWith("organization:") && joinedRoom !== room) {
        void socket.leave(joinedRoom);
      }
    }

    void socket.join(room);
    socket.data.organizationRoom = room;
  });

  socket.on("organization:leave", ({ organizationId } = {}) => {
    const room = organizationRoom(organizationId);
    if (!room) return;
    void socket.leave(room);
    if (socket.data.organizationRoom === room) socket.data.organizationRoom = undefined;
  });

  socket.on("reservations:changed", () => {
    const room = socket.data.organizationRoom;
    if (typeof room !== "string") return;

    // Broadcast only an invalidation signal; clients reload authorized data from Next.js.
    // The sender already refreshes after its successful API request.
    socket.to(room).emit("reservations:changed", { changedAt: Date.now() });
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Resync ready at http://${hostname}:${port} (${dev ? "development" : "production"})`);
});
