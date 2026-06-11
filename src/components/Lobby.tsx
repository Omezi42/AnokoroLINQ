import React from 'react';
import type { Room, Player, GameMode } from '../types';
import { LogOut, Play, Settings, Copy, User, Users } from 'lucide-react';

interface LobbyProps {
  room: Room;
  currentPlayerId: string;
  onStartGame: (mode: GameMode) => void;
  onLeaveRoom: () => void;
  onShowToast: (message: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
  onShowToast
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    onShowToast("ルームコードをコピーしました！");
  };

  const neededPlayers = Math.max(0, 4 - players.length);

  return (
    <div className="lobby-screen glass-panel animate-pulse-glow">
      <div className="lobby-code-box">
        <div className="lobby-code-container" onClick={handleCopyCode} title="クリックしてコピー">
          <span className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
            ルームコード (クリックでコピー)
            <Copy size={12} />
          </span>
          <h3>{room.id}</h3>
        </div>
        <button className="secondary danger" onClick={onLeaveRoom} style={{ padding: '10px 16px', borderRadius: '10px' }}>
          <LogOut size={16} />
          退出
        </button>
      </div>

      <div className="lobby-settings">
        <h2>対戦ロビー</h2>
        
        <div className="input-group glass-panel" style={{ padding: '20px', marginTop: '12px', background: 'rgba(15, 23, 42, 0.01)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            <Settings size={18} style={{ color: 'var(--color-primary)' }} />
            {isHost ? "ゲームモード設定 (ホストが選択)" : "現在のゲームモード"}
          </label>
          
          <div className="mode-selector-grid">
            <div 
              className={`mode-card ${selectedMode === 1 ? 'selected' : ''}`}
              onClick={() => isHost && setSelectedMode(1)}
              style={{ opacity: !isHost && selectedMode !== 1 ? 0.6 : 1, cursor: isHost ? 'pointer' : 'default' }}
            >
              <h4>モード 1</h4>
              <p>お題:【カード名】<br/>ヒント:【自由記述】</p>
            </div>
            <div 
              className={`mode-card ${selectedMode === 2 ? 'selected' : ''}`}
              onClick={() => isHost && setSelectedMode(2)}
              style={{ opacity: !isHost && selectedMode !== 2 ? 0.6 : 1, cursor: isHost ? 'pointer' : 'default' }}
            >
              <h4>モード 2</h4>
              <p>お題:【一般テーマ】<br/>ヒント:【カード名】</p>
            </div>
            <div 
              className={`mode-card ${selectedMode === 3 ? 'selected' : ''}`}
              onClick={() => isHost && setSelectedMode(3)}
              style={{ opacity: !isHost && selectedMode !== 3 ? 0.6 : 1, cursor: isHost ? 'pointer' : 'default' }}
            >
              <h4>モード 3</h4>
              <p>お題:【カード名】<br/>ヒント:【カード名】</p>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '14px', lineHeight: '1.4', background: 'rgba(15, 23, 42, 0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
            {selectedMode === 1 && "💡 リンクペアに同じカード名が配られます。市民はお題を知りません。各自お題に沿った自由なヒントを入力します。"}
            {selectedMode === 2 && "💡 リンクペアに『ドラゴン』等のテーマが配られます。市民はお題を知りません。各自テーマに沿った実在の『カード名』を検索してヒントにします。"}
            {selectedMode === 3 && "💡 リンクペアに同じカード名が配られます。市民はお題を知りません。各自お題に似ている別の実在の『カード名』を検索してヒントにします。"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--color-secondary)' }} />
          参加プレイヤー ({players.length}人)
        </h3>
        <div className="player-list">
          {players.map((p: Player) => (
            <div
              key={p.id}
              className={`player-badge ${p.id === currentPlayerId ? 'is-me' : ''}`}
            >
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: p.id === currentPlayerId ? 'var(--color-secondary-glow)' : 'rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: p.id === currentPlayerId ? 'var(--color-secondary)' : 'var(--text-muted)'
                }}>
                  <User size={16} />
                </div>
                {p.name} {p.id === currentPlayerId ? ' (あなた)' : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {room.hostId === p.id && <span className="host-tag">HOST</span>}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>通算: {p.score || 0}点</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div style={{ marginTop: '32px' }}>
          {neededPlayers > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-accent)', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center' }}>
              ⚠️ ゲームを開始するには、あと {neededPlayers} 人の参加が必要です。
            </p>
          )}
          <button
            className="primary"
            style={{ width: '100%', padding: '16px', borderRadius: '12px' }}
            onClick={handleStart}
            disabled={players.length < 4}
          >
            <Play size={20} />
            ゲームを開始する
          </button>
        </div>
      )}
      {!isHost && (
        <p style={{ marginTop: '32px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          ⏳ ホストがゲームを開始するのを待っています...
        </p>
      )}
    </div>
  );
};
