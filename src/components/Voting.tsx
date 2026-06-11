import React, { useState } from 'react';
import type { Room, Player } from '../types';
import { Check, Info, Users } from 'lucide-react';

interface VotingProps {
  room: Room;
  currentPlayerId: string;
  onVote: (player1Id: string, player2Id: string) => void;
}

export const Voting: React.FC<VotingProps> = ({
  room,
  currentPlayerId,
  onVote
}) => {
  const { players } = room;
  const me = players[currentPlayerId];
  const otherPlayers = Object.values(players).filter(p => p.id !== currentPlayerId);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(!!(me.vote && me.vote.player1));

  const handleSelect = (playerId: string) => {
    if (hasVoted) return;

    if (selectedIds.includes(playerId)) {
      setSelectedIds(selectedIds.filter(id => id !== playerId));
    } else {
      if (selectedIds.length < 2) {
        setSelectedIds([...selectedIds, playerId]);
      } else {
        // すでに2人選ばれている場合は、最初のものを解除して新しいものを追加する
        setSelectedIds([selectedIds[1], playerId]);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length !== 2) {
      alert("リンクペア（2人）を選択してください。");
      return;
    }
    
    onVote(selectedIds[0], selectedIds[1]);
    setHasVoted(true);
  };

  // 全員の投票状況
  const activePlayers = Object.values(players);
  const votedCount = activePlayers.filter(p => p.vote && p.vote.player1).length;

  if (hasVoted) {
    return (
      <div className="voting-screen glass-panel text-center">
        <h2>投票完了</h2>
        <div style={{ margin: '24px 0', padding: '20px', background: 'var(--color-primary-glow)', borderRadius: '12px', border: '1px solid var(--color-primary)' }}>
          <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.05rem' }}>
            🎉 あなたの投票を受け付けました！
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
            他のプレイヤー全員が投票を完了するまでしばらくお待ちください。
          </p>
        </div>
        
        <div className="lobby-settings-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} />
          投票状況: {votedCount} / {activePlayers.length} 人が完了
        </div>

        <div style={{ marginTop: '32px', textAlign: 'left', background: 'rgba(15, 23, 42, 0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
            あなたの投票先:
          </h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedIds.map(id => (
              <div 
                key={id} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: 'var(--bg-input)', 
                  border: '1.5px solid var(--color-primary-glow)', 
                  borderRadius: '10px', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: 'var(--color-primary)'
                }}
              >
                {players[id]?.name || 'プレイヤー'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-screen glass-panel">
      <h2>投票タイム</h2>
      <p className="subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
        <Info size={16} style={{ color: 'var(--color-primary)' }} />
        同じお題を持っていると思う「リンクペア (2人)」を選択してください。
      </p>

      <div className="voting-grid">
        {otherPlayers.map((p: Player) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={`vote-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(p.id)}
            >
              <div className="player-info">
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isSelected ? 'var(--color-primary)' : 'var(--text-main)' }}>
                  {p.name}
                </span>
                
                <div className="player-hints">
                  <div className="mini-hint">
                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>H1:</span> {p.hints.round1 || '未入力'}
                  </div>
                  <div className="mini-hint">
                    <span style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>H2:</span> {p.hints.round2 || '未入力'}
                  </div>
                </div>
              </div>
              
              <div 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-color)',
                  transition: 'all 0.2s',
                  marginLeft: '12px',
                  boxShadow: isSelected ? '0 0 8px var(--color-primary-glow)' : 'none'
                }}
              >
                {isSelected && <Check size={16} style={{ color: 'white' }} />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '28px' }}>
        <button
          className="primary"
          style={{ width: '100%', padding: '16px', borderRadius: '12px' }}
          disabled={selectedIds.length !== 2}
          onClick={handleSubmit}
        >
          投票を送信する ({selectedIds.length} / 2 選択)
        </button>
      </div>
    </div>
  );
};
