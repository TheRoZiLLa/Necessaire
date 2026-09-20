/**
 * Nécessaire - Core Type Definitions
 * Minimal future-facing type contracts for room & participants.
 * (Business logic and multiplayer state are reserved for later phases)
 */

export interface RoomInfo {
  code: string;
  title: string;
  subject?: string;
  hostNickname: string;
  createdAt: string;
}

export interface ParticipantInfo {
  id: string;
  roomCode: string;
  nickname: string;
  joinedAt: string;
}
