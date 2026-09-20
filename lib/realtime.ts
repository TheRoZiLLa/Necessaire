"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { Player, RevealData, RoomStatus } from "@/types";

export type RoomEvent =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "PLAYER_LEFT"; playerId: string }
  | { type: "ROOM_STARTED"; currentQuestion: number; status: RoomStatus }
  | { type: "ANSWER_PROGRESS"; answeredCount: number; totalPlayers: number }
  | { type: "STATUS_CHANGED"; status: RoomStatus; currentQuestion?: number }
  | { type: "READY_PROGRESS"; readyCount: number; totalPlayers: number }
  | { type: "FINAL_LOCK_PROGRESS"; finalLockedCount: number; totalPlayers: number }
  | { type: "ANSWER_REVEALED"; revealData: RevealData }
  | { type: "NEXT_QUESTION"; currentQuestion: number; status: RoomStatus }
  | { type: "START_REVIEW"; questionIds: string[] }
  | { type: "BACK_TO_SUMMARY" };

/**
 * Broadcast an event to all clients in the same room via Supabase Realtime and Browser BroadcastChannel.
 */
export async function broadcastRoomEvent(
  roomCode: string,
  event: RoomEvent
): Promise<void> {
  const normalizedCode = roomCode.trim().toUpperCase();

  // 1. Browser BroadcastChannel (for instant multi-tab/window sync)
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(`necessaire-room-${normalizedCode}`);
      channel.postMessage(event);
      channel.close();
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }
  }

  // 2. Supabase Realtime Broadcast (for multi-device / network clients)
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const channel = supabase.channel(`room:${normalizedCode}`);
        await channel.send({
          type: "broadcast",
          event: "room_event",
          payload: event,
        });
      }
    } catch (err) {
      console.warn("Supabase broadcast error:", err);
    }
  }
}

/**
 * React Hook to subscribe to real-time events for a room.
 */
export function useRoomRealtime(
  roomCode: string,
  onEvent: (event: RoomEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomCode) return;
    const normalizedCode = roomCode.trim().toUpperCase();

    // 1. Browser BroadcastChannel Listener
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(`necessaire-room-${normalizedCode}`);
      bc.onmessage = (messageEvent) => {
        if (messageEvent.data) {
          onEventRef.current(messageEvent.data as RoomEvent);
        }
      };
    }

    // 2. Supabase Realtime Channel Listener
    let supabaseChannel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabaseChannel = supabase
          .channel(`room:${normalizedCode}`)
          .on("broadcast", { event: "room_event" }, ({ payload }) => {
            if (payload) {
              onEventRef.current(payload as RoomEvent);
            }
          })
          .subscribe();
      }
    }

    return () => {
      if (bc) {
        bc.close();
      }
      if (supabaseChannel && isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.removeChannel(supabaseChannel);
        }
      }
    };
  }, [roomCode]);
}
