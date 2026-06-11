import React from 'react';
import type { Room, Player } from '../types';
import { RotateCcw, Home, Star, Trophy, Medal, Check, Award, ArrowRight } from 'lucide-react';

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
        breakdown.push("リンクペアを完全的中 (+2点)");
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

  // CSS紙吹雪ピースの生成 (35個)
  const confettiPieces = Array.from({ length: 35 }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 2 + Math.random() * 2.5;
    return (
      <div 
        key={i} 
        className="confetti-piece" 
        style={{ 
          left: `${left}%`, 
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`
        }} 
      />
    );
  });

  return (
    <div className="results-screen glass-panel" style={{ position: 'relative' }}>
      {/* 簡易紙吹雪のオーバーレイ */}
      <div className="confetti-container">
        {confettiPieces}
      </div>

      <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Award size={24} style={{ color: 'var(--color-gold)' }} />
        ゲーム結果発表
      </h2>
      
      {/* お題 & リンクペアの公開 */}
      <div className="results-summary glass-panel" style={{ padding: '28px', margin: '24px 0', border: '2px solid var(--color-gold-glow)', background: 'rgba(217, 119, 6, 0.02)', position: 'relative', zIndex: 10 }}>
        <p className="subtitle" style={{ color: 'var(--color-gold)', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>正解のお題</p>
        <div className="secret-word-reveal">{secretWord}</div>
        
        <p className="subtitle" style={{ marginTop: '20px', color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.9rem' }}>正解のリンクペア</p>
        <div className="link-pairs-reveal" style={{ marginTop: '10px' }}>
          {linkPairIds.map(id => (
            <div key={id} className="link-pair-badge animate-pulse-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} style={{ fill: 'currentColor', color: 'var(--color-gold)' }} />
              {players[id]?.name || 'プレイヤー'}
            </div>
          ))}
        </div>
      </div>

      {/* 投票内訳 */}
      <div className="votes-breakdown glass-panel" style={{ padding: '24px', marginBottom: '28px', position: 'relative', zIndex: 10 }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <Check size={18} style={{ color: 'var(--color-secondary)' }} />
          投票結果と獲得ポイント
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
                borderLeft: isLink ? '4px solid var(--color-gold)' : '4px solid var(--color-secondary-glow)',
                background: isLink ? 'rgba(217, 119, 6, 0.02)' : 'transparent',
                paddingLeft: '14px',
                borderRadius: '0 8px 8px 0',
                marginBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="voter" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.name}
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 8px', 
                    borderRadius: '999px',
                    fontWeight: 'bold',
                    background: isLink ? 'var(--color-gold-glow)' : 'var(--color-secondary-glow)',
                    color: isLink ? 'var(--color-gold)' : 'var(--color-secondary)'
                  }}>
                    {isLink ? '★ リンク' : '👥 市民'}
                  </span>
                  {p.isConnected === false && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '1px 4px', borderRadius: '4px' }}>
                      OFFLINE
                    </span>
                  )}
                </span>
                <span className="score-diff" style={{ color: pointsGained > 0 ? 'var(--color-secondary)' : 'var(--text-muted)', fontWeight: 800 }}>
                  +{pointsGained}点
                </span>
              </div>
              
              <div className="targets" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span>投票先:</span>
                <span style={{ 
                  background: 'var(--bg-main)', 
                  padding: '2px 8px', 
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: linkPairIds.includes(p.vote?.player1) ? 'var(--color-gold)' : 'var(--text-main)',
                  fontWeight: linkPairIds.includes(p.vote?.player1) ? 'bold' : 'normal'
                }}>
                  {target1Name}
                </span>
                {!isLink && (
                  <>
                    <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ 
                      background: 'var(--bg-main)', 
                      padding: '2px 8px', 
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      color: linkPairIds.includes(p.vote?.player2) ? 'var(--color-gold)' : 'var(--text-main)',
                      fontWeight: linkPairIds.includes(p.vote?.player2) ? 'bold' : 'normal'
                    }}>
                      {target2Name}
                    </span>
                  </>
                )}
              </div>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                内訳: {breakdown.join(' / ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* リーダーボード */}
      <div className="score-leaderboard" style={{ position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} style={{ color: 'var(--color-gold)' }} />
          現在のスコアランキング
        </h3>
        <div style={{ marginTop: '16px' }}>
          {sortedPlayers.map((p: Player, index) => {
            const isWinner = index === 0 && p.score > 0;
            const isSecond = index === 1 && p.score > 0;
            const isThird = index === 2 && p.score > 0;
            const isLink = linkPairIds.includes(p.id);

            // ランクアイコン/順位のレンダリング
            const renderRankIcon = () => {
              if (isWinner) return <Trophy size={20} style={{ color: 'var(--color-gold)' }} />;
              if (isSecond) return <Medal size={20} style={{ color: '#94a3b8' }} />; // Silver
              if (isThird) return <Medal size={20} style={{ color: '#b45309' }} />;  // Bronze
              return <span style={{ fontWeight: 800, width: '20px', display: 'inline-block', textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</span>;
            };

            return (
              <div 
                key={p.id} 
                className={`leaderboard-row ${isWinner ? 'winner' : ''} ${isLink ? 'is-link' : ''}`}
                style={{
                  borderLeft: isWinner ? '4px solid var(--color-gold)' : '1px solid var(--border-color)',
                  boxShadow: isWinner ? '0 4px 14px var(--color-gold-glow)' : 'none'
                }}
                title={isLink ? "このゲームのリンクペア" : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderRankIcon()}
                  <span style={{ fontWeight: isWinner ? 800 : 600 }}>{p.name}</span>
                  {isLink && <Star size={12} style={{ color: 'var(--color-gold)', fill: 'currentColor' }} />}
                  {p.isConnected === false && <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)' }}>OFFLINE</span>}
                </div>
                <div>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', color: isWinner ? 'var(--color-gold)' : 'inherit' }}>
                    {p.score || 0}点
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ホスト向け操作パネル */}
      {isHost && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '36px', position: 'relative', zIndex: 10 }}>
          <button className="primary" style={{ flex: 1, borderRadius: '12px' }} onClick={onNextGame}>
            <RotateCcw size={18} />
            もう一度遊ぶ
          </button>
          <button className="secondary" style={{ flex: 1, borderRadius: '12px' }} onClick={onBackToLobby}>
            <Home size={18} />
            ロビーに戻る
          </button>
        </div>
      )}
      {!isHost && (
        <p style={{ marginTop: '36px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', position: 'relative', zIndex: 10 }}>
          ⏳ ホストが次のゲームを開始するのを待っています...
        </p>
      )}
    </div>
  );
};
