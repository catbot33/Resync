"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

interface ServerToClientEvents {
  "reservations:changed": (payload: { changedAt: number }) => void;
}

interface ClientToServerEvents {
  "organization:join": (payload: { organizationId: string }) => void;
  "organization:leave": (payload: { organizationId: string }) => void;
  "reservations:changed": () => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getReservationSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      path: "/socket.io",
    });
  }

  return socket;
}

export function useReservationRealtime(organizationId: string) {
  const router = useRouter();

  useEffect(() => {
    const realtimeSocket = getReservationSocket();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const joinOrganization = () => realtimeSocket.emit("organization:join", { organizationId });
    const refreshReservations = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 100);
    };

    realtimeSocket.on("connect", joinOrganization);
    realtimeSocket.on("reservations:changed", refreshReservations);

    if (realtimeSocket.connected) joinOrganization();
    else realtimeSocket.connect();

    return () => {
      clearTimeout(refreshTimer);
      realtimeSocket.emit("organization:leave", { organizationId });
      realtimeSocket.off("connect", joinOrganization);
      realtimeSocket.off("reservations:changed", refreshReservations);
      realtimeSocket.disconnect();
    };
  }, [organizationId, router]);
}

export function announceReservationChange(organizationId: string) {
  const realtimeSocket = getReservationSocket();

  if (!realtimeSocket.connected) realtimeSocket.connect();

  // Socket.IO preserves event order, so the change event follows the room join.
  realtimeSocket.emit("organization:join", { organizationId });
  realtimeSocket.emit("reservations:changed");
}
