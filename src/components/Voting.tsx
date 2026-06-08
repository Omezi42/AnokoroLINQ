import React, { useState } from 'react';
import type { Room, Player } from '../types';
import { Check, Info } from 'lucide-react';

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
        // すでに2個選ばれている場合は、最初のものを解除して新しいものを追加する
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
        <div style={{ margin: '24px 0', padding: '20px', background: 'var(--color-primary-glow)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            投票を受け付けました。他のプレイヤーの投票を待っています...
          </p>
        </div>
        
        <div className="lobby-settings-info">
          投票状況: {votedCount} / {activePlayers.length} 人が完了
        </div>

        <div style={{ marginTop: '24px', textAlign: 'left' }}>
          <h4>あなたの投票先:</h4>
          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--text-muted)' }}>
            <li>{players[me.vote?.player1]?.name || players[selectedIds[0]]?.name}</li>
            <li>{players[me.vote?.player2]?.name || players[selectedIds[1]]?.name}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-screen glass-panel">
      <h2>投票タイム</h2>
      <p className="subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
        <Info size={16} />
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
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name}</span>
                <div className="player-hints">
                  <div className="mini-hint">ヒント1: {p.hints.round1 || '-'}</div>
                  <div className="mini-hint">ヒント2: {p.hints.round2 || '-'}</div>
                </div>
              </div>
              
              <div 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-color)'
                }}
              >
                {isSelected && <Check size={14} style={{ color: 'white' }} />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          className="primary"
          style={{ width: '100%', padding: '16px' }}
          disabled={selectedIds.length !== 2}
          onClick={handleSubmit}
        >
          投票を送信する ({selectedIds.length} / 2 選択)
        </button>
      </div>
    </div>
  );
};
