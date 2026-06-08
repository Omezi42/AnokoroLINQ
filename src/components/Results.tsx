import React from 'react';
import type { Room, Player } from '../types';
import { Award, RotateCcw, Home, Star } from 'lucide-react';

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

  // 得点計算（プレビュー表示用および内訳表示用。実際のDBへの書き込みはHostがApp.tsx側で行う）
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
      // 市民全員の投票に自分が含まれていないか
      const citizens = playerList.filter(p => !linkPairIds.includes(p.id));
      const gotVotedByCitizen = citizens.some(c => c.vote?.player1 === player.id || c.vote?.player2 === player.id);
      if (!gotVotedByCitizen) {
        pointsGained += 1;
        breakdown.push("市民に正体がバレなかった (+1点)");
      }
    } else {
      // 市民の得点
      // リンクペアの2人を当てたか？
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
        breakdown.push(`片方のリンク (${correctName}) を的中 (+1点)`);
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
      <div className="results-summary glass-panel" style={{ padding: '24px', margin: '24px 0' }}>
        <p className="subtitle">正解のお題</p>
        <div className="secret-word-reveal">{secretWord}</div>
        
        <p className="subtitle" style={{ marginTop: '16px' }}>リンクしていたペア</p>
        <div className="link-pairs-reveal">
          {linkPairIds.map(id => (
            <div key={id} className="link-pair-badge">
              {players[id]?.name || 'プレイヤー'}
            </div>
          ))}
        </div>
      </div>

      {/* 投票内訳 */}
      <div className="votes-breakdown glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          各プレイヤーの投票結果と獲得得点
        </h3>
        {playerList.map((p: Player) => {
          const isLink = linkPairIds.includes(p.id);
          const { pointsGained, breakdown } = calculatePointsForPlayer(p);
          const target1Name = players[p.vote?.player1]?.name || '未投票';
          const target2Name = players[p.vote?.player2]?.name || '未投票';

          return (
            <div key={p.id} className="vote-result-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="voter" style={{ color: isLink ? 'var(--color-gold)' : 'inherit' }}>
                  {p.name} {isLink ? '【リンク】' : '【市民】'}
                </span>
                <span className="score-diff">+{pointsGained}点</span>
              </div>
              <div className="targets">
                投票先: <span>{target1Name}</span> , <span>{target2Name}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
            const isLink = linkPairIds.includes(p.id);
            return (
              <div 
                key={p.id} 
                className={`leaderboard-row ${isWinner ? 'winner' : ''} ${isLink ? 'is-link' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, width: '24px' }}>{index + 1}.</span>
                  <span>{p.name}</span>
                  {isWinner && <Award size={16} className="text-secondary" />}
                  {isLink && <Star size={14} className="text-gold" />}
                </div>
                <div>
                  <span style={{ fontWeight: 700 }}>{p.score}点</span>
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
