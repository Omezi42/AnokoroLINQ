import React from 'react';
import type { Room, Player, GameMode } from '../types';
import { LogOut, Play, Settings } from 'lucide-react';

interface LobbyProps {
  room: Room;
  currentPlayerId: string;
  onStartGame: (mode: GameMode) => void;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentPlayerId,
  onStartGame,
  onLeaveRoom
}) => {
  const players = Object.values(room.players || {});
  const isHost = room.hostId === currentPlayerId;
  const [selectedMode, setSelectedMode] = React.useState<GameMode>(1);

  const handleStart = () => {
    if (players.length < 4) {
      alert("ゲームを開始するには4人以上のプレイヤーが必要です。");
      return;
    }
    onStartGame(selectedMode);
  };

  return (
    <div className="lobby-screen glass-panel animate-pulse-glow">
      <div className="lobby-code-box">
        <div>
          <p className="subtitle">ルームコード</p>
          <h3>{room.id}</h3>
        </div>
        <button className="secondary danger" onClick={onLeaveRoom}>
          <LogOut size={18} />
          退出
        </button>
      </div>

      <div className="lobby-settings">
        <h2>対戦ロビー</h2>
        
        {isHost ? (
          <div className="input-group glass-panel" style={{ padding: '16px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Settings size={18} className="text-primary" />
              ゲームモード設定 (ホストのみ)
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(Number(e.target.value) as GameMode)}
              style={{ width: '100%' }}
            >
              <option value={1}>モード1: お題【カード名】➔ 回答【自由入力】</option>
              <option value={2}>モード2: お題【一般テーマ】➔ 回答【カード名】</option>
              <option value={3}>モード3: お題【カード名】➔ 回答【カード名】</option>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              {selectedMode === 1 && "リンクペアに同じカード名が配られます。市民はお題を知りません。各自、お題に沿った自由な言葉（ヒント）を入力します。"}
              {selectedMode === 2 && "リンクペアに同じ一般テーマ（例:『ドラゴン』等）が配られます。市民はお題を知りません。各自、お題に合う『カード名』をリストから選んで答えます。"}
              {selectedMode === 3 && "リンクペアに同じカード名が配られます。市民はお題を知りません。各自、お題に合う別の『カード名』をリストから選んで答えます。"}
            </p>
          </div>
        ) : (
          <div className="lobby-settings-info">
            ホストがゲームを開始するのを待っています...
          </div>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3>参加プレイヤー ({players.length}人)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>※プレイには最低4人必要です</p>
        <div className="player-list">
          {players.map((p: Player) => (
            <div
              key={p.id}
              className={`player-badge ${p.id === currentPlayerId ? 'is-me' : ''}`}
            >
              <span style={{ fontWeight: 600 }}>
                {p.name} {p.id === currentPlayerId ? ' (あなた)' : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {room.hostId === p.id && <span className="host-tag">HOST</span>}
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>累計: {p.score}点</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div style={{ marginTop: '32px' }}>
          <button
            className="primary"
            style={{ width: '100%', padding: '16px' }}
            onClick={handleStart}
            disabled={players.length < 4}
          >
            <Play size={20} />
            ゲームを開始する
          </button>
        </div>
      )}
    </div>
  );
};
