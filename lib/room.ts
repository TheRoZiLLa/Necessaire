import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { getMockById } from "./storage";
import { Room, Player, RoomDetails, RoomStatus } from "@/types";

const LOCAL_STORAGE_ROOMS_KEY = "necessaire_rooms";
const LOCAL_STORAGE_PLAYERS_KEY = "necessaire_players";

// Safe character pool avoiding 0, O, 1, I, L
const SAFE_ROOM_CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generate an unambiguous, readable 4-character room code (e.g. "AB72", "K9M4")
 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_ROOM_CODE_CHARS.length);
    code += SAFE_ROOM_CODE_CHARS[randomIndex];
  }
  return code;
}

// LocalStorage helpers
function getLocalRooms(): Room[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRooms(rooms: Room[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_ROOMS_KEY, JSON.stringify(rooms));
  } catch (err) {
    console.error("Failed to save rooms to localStorage", err);
  }
}

function getLocalPlayers(): Player[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PLAYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPlayers(players: Player[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PLAYERS_KEY, JSON.stringify(players));
  } catch (err) {
    console.error("Failed to save players to localStorage", err);
  }
}

/**
 * Create a new Room and register the Host player.
 */
export async function createRoom(
  mockId: string,
  hostNickname: string
): Promise<{
  success: boolean;
  roomCode?: string;
  roomId?: string;
  hostPlayerId?: string;
  error?: string;
}> {
  const cleanNickname = hostNickname.trim();
  if (!cleanNickname) {
    return { success: false, error: "Host nickname is required." };
  }

  const mock = await getMockById(mockId);
  if (!mock) {
    return { success: false, error: "Mock test not found." };
  }

  const roomId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "room-" + Math.random().toString(36).substring(2, 9);
  const hostPlayerId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "player-" + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  // Generate unique room code
  const roomCode = generateRoomCode();

  const roomRecord: Room = {
    id: roomId,
    roomCode,
    mockId,
    hostId: hostPlayerId,
    currentQuestion: 0,
    status: "LOBBY",
    createdAt: now,
  };

  const hostPlayerRecord: Player = {
    id: hostPlayerId,
    roomId,
    nickname: cleanNickname,
    isHost: true,
    joinedAt: now,
    lastSeen: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client unavailable");

      // 1. Insert room
      const { error: roomError } = await supabase.from("rooms").insert({
        id: roomId,
        room_code: roomCode,
        mock_id: mockId,
        host_id: hostPlayerId,
        current_question: 0,
        status: "LOBBY",
        created_at: now,
      });

      if (roomError) throw new Error(roomError.message);

      // 2. Insert host player
      const { error: playerError } = await supabase.from("players").insert({
        id: hostPlayerId,
        room_id: roomId,
        nickname: cleanNickname,
        is_host: true,
        joined_at: now,
        last_seen: now,
      });

      if (playerError) throw new Error(playerError.message);

      // Cache locally
      saveLocalRooms([roomRecord, ...getLocalRooms()]);
      saveLocalPlayers([hostPlayerRecord, ...getLocalPlayers()]);

      return {
        success: true,
        roomCode,
        roomId,
        hostPlayerId,
      };
    } catch (err: any) {
      console.warn("Supabase room creation failed, using local storage:", err.message);
    }
  }

  // Fallback to local storage
  saveLocalRooms([roomRecord, ...getLocalRooms()]);
  saveLocalPlayers([hostPlayerRecord, ...getLocalPlayers()]);

  return {
    success: true,
    roomCode,
    roomId,
    hostPlayerId,
  };
}

/**
 * Fetch Room details along with its Mock questions and current Players list.
 */
export async function getRoomDetails(roomCode: string): Promise<RoomDetails | null> {
  const normalizedCode = roomCode.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", normalizedCode)
          .single();

        if (!roomError && roomData) {
          const { data: playersData } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", roomData.id)
            .order("joined_at", { ascending: true });

          const mock = await getMockById(roomData.mock_id);
          if (mock) {
            const players: Player[] = (playersData || []).map((p) => ({
              id: p.id,
              roomId: p.room_id,
              nickname: p.nickname,
              isHost: p.is_host,
              joinedAt: p.joined_at,
              lastSeen: p.last_seen,
            }));

            const room: Room = {
              id: roomData.id,
              roomCode: roomData.room_code,
              mockId: roomData.mock_id,
              hostId: roomData.host_id,
              currentQuestion: roomData.current_question,
              status: roomData.status as RoomStatus,
              createdAt: roomData.created_at,
            };

            return { room, mock, players };
          }
        }
      }
    } catch (err) {
      console.warn("Supabase getRoomDetails error, attempting local fallback:", err);
    }
  }

  // Local fallback
  const localRooms = getLocalRooms();
  const room = localRooms.find((r) => r.roomCode === normalizedCode);
  if (!room) return null;

  const mock = await getMockById(room.mockId);
  if (!mock) return null;

  const localPlayers = getLocalPlayers().filter((p) => p.roomId === room.id);

  return {
    room,
    mock,
    players: localPlayers,
  };
}

/**
 * Validate and register a Player into an existing room.
 */
export async function validateAndJoinRoom(
  roomCode: string,
  nickname: string
): Promise<{
  success: boolean;
  room?: Room;
  player?: Player;
  error?: string;
}> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const cleanNickname = nickname.trim();

  if (!normalizedCode) {
    return { success: false, error: "Please enter a room code." };
  }
  if (!cleanNickname) {
    return { success: false, error: "Please choose a nickname." };
  }

  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) {
    return { success: false, error: "Room not found. Please check the code." };
  }

  const { room, players } = roomDetails;

  // Check room status
  if (room.status !== "LOBBY") {
    return {
      success: false,
      error: `This room is already in progress or has finished (status: ${room.status}).`,
    };
  }

  // Check nickname uniqueness (case-insensitive)
  const isDuplicate = players.some(
    (p) => p.nickname.toLowerCase() === cleanNickname.toLowerCase()
  );
  if (isDuplicate) {
    return {
      success: false,
      error: `The nickname "${cleanNickname}" is already taken in this room. Please pick another.`,
    };
  }

  const playerId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "player-" + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const newPlayer: Player = {
    id: playerId,
    roomId: room.id,
    nickname: cleanNickname,
    isHost: false,
    joinedAt: now,
    lastSeen: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error: insertError } = await supabase.from("players").insert({
          id: playerId,
          room_id: room.id,
          nickname: cleanNickname,
          is_host: false,
          joined_at: now,
          last_seen: now,
        });

        if (insertError) {
          if (insertError.code === "23505") {
            return {
              success: false,
              error: `The nickname "${cleanNickname}" is already taken in this room.`,
            };
          }
          throw new Error(insertError.message);
        }
      }
    } catch (err: any) {
      console.warn("Supabase player join failed, using local storage:", err.message);
    }
  }

  // Save locally
  const currentPlayers = getLocalPlayers();
  saveLocalPlayers([...currentPlayers, newPlayer]);

  return {
    success: true,
    room,
    player: newPlayer,
  };
}

/**
 * Host starts the Mock Test: updates room status to 'ANSWERING' and current_question to 1.
 */
export async function startRoom(
  roomCode: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error: updateError } = await supabase
          .from("rooms")
          .update({
            status: "ANSWERING",
            current_question: 1,
          })
          .eq("room_code", normalizedCode);

        if (updateError) throw new Error(updateError.message);
      }
    } catch (err: any) {
      console.warn("Supabase room start failed, updating local storage:", err.message);
    }
  }

  // Update local storage
  const rooms = getLocalRooms();
  const updatedRooms = rooms.map((r) => {
    if (r.roomCode === normalizedCode) {
      return {
        ...r,
        status: "ANSWERING" as RoomStatus,
        currentQuestion: 1,
      };
    }
    return r;
  });
  saveLocalRooms(updatedRooms);

  return { success: true };
}

/**
 * Player leaves room.
 */
export async function leaveRoom(
  roomCode: string,
  playerId: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("players").delete().eq("id", playerId);
      }
    } catch (err) {
      console.warn("Failed to delete player in Supabase:", err);
    }
  }

  const players = getLocalPlayers().filter((p) => p.id !== playerId);
  saveLocalPlayers(players);
}
