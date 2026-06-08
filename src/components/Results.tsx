import React from 'react';
import type { Room, Player } from '../types';
import { RotateCcw, Home, Star, Trophy, Medal, Check } from 'lucide-react';

interface ResultsProps {
  room: Room;
  currentPlayerId: string;
  onNextGame: () => void;
  onBackToLobby: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  room,
  currentPlayerId,
  onNextGame,
  onBackToLobby
}) => {
  const { gameFlow, players, hostId } = room;
  if (!gameFlow) return null;

  const isHost = hostId === currentPlayerId;
  const linkPairIds = gameFlow.linkPairs || [];
  const secretWord = gameFlow.secretWord;

  const playerList = Object.values(players);

  // 得点計算（プレビュー表示および内訳用）
  const calculatePointsForPlayer = (player: Player): { pointsGained: number; breakdown: string[] } => {
    const isLink = linkPairIds.includes(player.id);
    let pointsGained = 0;
    const breakdown: string[] = [];

    const vote1 = player.vote?.player1;
    const vote2 = player.vote?.player2;

    if (isLink) {
      // リンクペアの得点
      // 1. 相方を指名できたか？
      const partnerId = linkPairIds.find(id => id !== player.id);
      if (partnerId && (vote1 === partnerId || vote2 === partnerId)) {
        pointsGained += 2;
        breakdown.push("相方を発見 (+2点)");
      } else {
        breakdown.push("相方を発見できず (+0点)");
      }

      // 2. 市民にバレなかったか？
      const citizens = playerList.filter(p => !linkPairIds.includes(p.id));
      const gotVotedByCitizen = citizens.some(c => c.vote?.player1 === player.id || c.vote?.player2 === player.id);
      if (!gotVotedByCitizen) {
        pointsGained += 1;
        breakdown.push("市民から正体隠蔽 (+1点)");
      }
    } else {
      // 市民の得点
      const p1Correct = linkPairIds.includes(vote1);
      const p2Correct = linkPairIds.includes(vote2);
      
      if (p1Correct && p2Correct) {
        pointsGained += 2;
        breakdown.push("リンクペアを完全に的中 (+2点)");
      } else if (p1Correct || p2Correct) {
        pointsGained += 1;
        const correctName = p1Correct 
          ? players[vote1]?.name 
          : players[vote2]?.name;
        breakdown.push(`片方 (${correctName}) を的中 (+1点)`);
      } else {
        breakdown.push("的中なし (+0点)");
      }
    }

    return { pointsGained, breakdown };
  };

  // リーダーボード用にソート (累積スコアの降順)
  const sortedPlayers = [...playerList].sort((a, b) => b.score - a.score);

  return (
    <div className="results-screen glass-panel">
      <h2>ゲーム結果発表</h2>
      
      {/* お題 & リンクペアの公開 */}
      <div className="results-summary glass-panel" style={{ padding: '24px', margin: '24px 0', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
        <p className="subtitle" style={{ color: 'var(--color-gold)' }}>正解のお題</p>
        <div className="secret-word-reveal">{secretWord}</div>
        
        <p className="subtitle" style={{ marginTop: '16px' }}>正解のリンクペア</p>
        <div className="link-pairs-reveal" style={{ marginTop: '8px' }}>
          {linkPairIds.map(id => (
            <div key={id} className="link-pair-badge animate-pulse-glow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} style={{ fill: 'currentColor' }} />
              {players[id]?.name || 'プレイヤー'}
            </div>
          ))}
        </div>
      </div>

      {/* 投票内訳 */}
      <div className="votes-breakdown glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} className="text-secondary" />
          全員の投票と獲得得点
        </h3>
        {playerList.map((p: Player) => {
          const isLink = linkPairIds.includes(p.id);
          const { pointsGained, breakdown } = calculatePointsForPlayer(p);
          const target1Name = players[p.vote?.player1]?.name || '未投票';
          const target2Name = players[p.vote?.player2]?.name || '未投票';

          return (
            <div 
              key={p.id} 
              className="vote-result-row"
              style={{
                borderLeft: isLink ? '4px solid var(--color-gold)' : '4px solid transparent',
                background: isLink ? 'rgba(251, 191, 36, 0.03)' : 'transparent',
                paddingLeft: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="voter" style={{ color: isLink ? 'var(--color-gold)' : 'inherit', fontWeight: 700 }}>
                  {p.name} {isLink ? '★ リンク' : '👥 市民'}
                  {p.isConnected === false && <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px' }}>OFFLINE</span>}
                </span>
                <span className="score-diff" style={{ color: pointsGained > 0 ? 'var(--color-secondary)' : 'var(--text-muted)' }}>
                  +{pointsGained}点
                </span>
              </div>
              <div className="targets">
                投票先: <span style={{ color: linkPairIds.includes(p.vote?.player1) ? 'var(--color-gold)' : 'var(--text-main)' }}>{target1Name}</span> , <span style={{ color: linkPairIds.includes(p.vote?.player2) ? 'var(--color-gold)' : 'var(--text-main)' }}>{target2Name}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                内訳: {breakdown.join(' / ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* リーダーボード */}
      <div className="score-leaderboard">
        <h3>現在のスコアランキング</h3>
        <div style={{ marginTop: '16px' }}>
          {sortedPlayers.map((p: Player, index) => {
            const isWinner = index === 0 && p.score > 0;
            const isSecond = index === 1 && p.score > 0;
            const isThird = index === 2 && p.score > 0;
            const isLink = linkPairIds.includes(p.id);

            // メダルアイコンの判定
            const renderRankIcon = () => {
              if (isWinner) return <Trophy size={18} style={{ color: 'var(--color-gold)' }} />;
              if (isSecond) return <Medal size={18} style={{ color: '#e2e8f0' }} />;
              if (isThird) return <Medal size={18} style={{ color: '#b45309' }} />;
              return <span style={{ fontWeight: 800, width: '18px', display: 'inline-block', textAlign: 'center' }}>{index + 1}</span>;
            };

            return (
              <div 
                key={p.id} 
                className={`leaderboard-row ${isWinner ? 'winner' : ''} ${isLink ? 'is-link' : ''}`}
                style={{
                  borderColor: isWinner ? 'var(--color-gold)' : isSecond ? '#94a3b8' : isThird ? '#b45309' : 'transparent',
                  background: isWinner ? 'rgba(251, 191, 36, 0.06)' : 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderRankIcon()}
                  <span style={{ fontWeight: isWinner ? 700 : 500 }}>{p.name}</span>
                  {isLink && <Star size={12} style={{ color: 'var(--color-gold)', fill: 'currentColor' }} />}
                  {p.isConnected === false && <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)' }}>OFFLINE</span>}
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{p.score}点</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ホスト向け操作パネル */}
      {isHost && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          <button className="primary" style={{ flex: 1 }} onClick={onNextGame}>
            <RotateCcw size={18} />
            もう一度遊ぶ
          </button>
          <button className="secondary" style={{ flex: 1 }} onClick={onBackToLobby}>
            <Home size={18} />
            ロビーに戻る
          </button>
        </div>
      )}
      {!isHost && (
        <p style={{ marginTop: '32px', textAlign: 'center', fontStyle: 'italic' }}>
          ホストが次のゲームを開始するのを待っています...
        </p>
      )}
    </div>
  );
};
