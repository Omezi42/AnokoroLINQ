export type GameMode = 1 | 2 | 3;

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  role: 'none' | 'link' | 'citizen';
  targetWord: string; // リンクプレイヤーにはお題、市民には「？」
  hints: {
    round1: string;
    round2: string;
  };
  vote: {
    player1: string; // 投票したプレイヤー1のID
    player2: string; // 投票したプレイヤー2のID
  };
  isConnected: boolean;
}

export interface GameFlow {
  round: 1 | 2;
  turnPlayerId: string;
  turnOrder: string[];
  turnIndex: number;
  secretWord: string; // 実際の正解お題
  linkPairs: string[]; // リンクペアのID（2名分）
}

export interface RoomSettings {
  mode: GameMode;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'voting' | 'results';
  hostId: string;
  settings: RoomSettings;
  players: Record<string, Player>;
  gameFlow?: GameFlow;
}
