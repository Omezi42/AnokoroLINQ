import React, { useState, useEffect, useRef } from 'react';
import type { Room, Player } from '../types';
import { CARD_NAMES } from '../cardData';
import { Send, Search, HelpCircle, Eye, EyeOff, User } from 'lucide-react';

interface GameBoardProps {
  room: Room;
  currentPlayerId: string;
  onSubmitHint: (hint: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  currentPlayerId,
  onSubmitHint
}) => {
  const { gameFlow, settings, players } = room;
  if (!gameFlow) return null;

  const currentRound = gameFlow.round;
  const turnPlayerId = gameFlow.turnPlayerId;
  const isMyTurn = turnPlayerId === currentPlayerId;
  const activePlayer = players[turnPlayerId];
  const me = players[currentPlayerId];

  // UI States
  const [hintInput, setHintInput] = useState('');
  const [showWord, setShowWord] = useState(true);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // モード別表示用のテキスト
  const modeText = 
    settings.mode === 1 ? "モード1: お題【カード名】➔ 回答【自由テキスト】" :
    settings.mode === 2 ? "モード2: お題【一般テーマ】➔ 回答【カード名】" :
    "モード3: お題【カード名】➔ 回答【カード名】";

  // カード検索（モード2・3用）
  useEffect(() => {
    if (settings.mode === 1 || !hintInput.trim()) {
      setSearchResults([]);
      return;
    }
    const query = hintInput.toLowerCase();
    const filtered = CARD_NAMES.filter(name => 
      name.toLowerCase().includes(query) && 
      name !== "NotFound" && 
      name !== "VOID"
    ).slice(0, 10); // 最大10件表示
    setSearchResults(filtered);
  }, [hintInput, settings.mode]);

  // ドロップダウンの外側をクリックした時に閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalHint = hintInput.trim();
    if (!finalHint) return;

    // モード2・3の場合、存在するカード名であるかチェック
    if (settings.mode !== 1) {
      if (!CARD_NAMES.includes(finalHint)) {
        alert("『あの頃の自作TCG』に存在する正確なカード名を選択してください。");
        return;
      }
    }

    onSubmitHint(finalHint);
    setHintInput('');
    setShowResults(false);
  };

  const handleSelectCard = (cardName: string) => {
    setHintInput(cardName);
    setShowResults(false);
  };

  // タイムライン用の並び順（turnOrderに従う）
  const playerList = gameFlow.turnOrder.map(id => players[id]).filter(Boolean);

  return (
    <div className="game-screen glass-panel">
      {/* モード情報 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span className="lobby-settings-info">{modeText}</span>
        <span className="lobby-settings-info" style={{ borderColor: 'var(--color-primary-glow)' }}>
          ラウンド {currentRound} / 2
        </span>
      </div>

      {/* お題カード表示 */}
      <div className="card-revealer glass-panel">
        <p className="subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <HelpCircle size={16} />
          あなたに配られた秘密のお題
        </p>
        
        {me.role === 'citizen' ? (
          <div>
            <div className="word-display unknown">？</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>
              あなたは一般市民です。お題を知りません。他の人のヒントからお題を推測してください。
            </p>
          </div>
        ) : (
          <div>
            <div className="word-display">
              {showWord ? me.targetWord : '••••••'}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
              あなたはリンク（スパイ）です。ペアの相手に伝わるようにヒントを出してください。
            </p>
            <button 
              className="secondary" 
              style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setShowWord(!showWord)}
            >
              {showWord ? <EyeOff size={14} /> : <Eye size={14} />}
              {showWord ? 'お題を隠す' : 'お題を表示'}
            </button>
          </div>
        )}
      </div>

      {/* 手番ステータス */}
      <div className={`turn-banner ${isMyTurn ? 'my-turn animate-pulse-glow' : 'other-turn'}`}>
        {isMyTurn ? (
          <span>あなたのヒント入力ターンです！</span>
        ) : (
          <span>{activePlayer?.name} がヒントを入力しています...</span>
        )}
      </div>

      {/* ヒントタイムライン */}
      <h3 style={{ textAlign: 'left', marginBottom: '12px' }}>ヒントログ</h3>
      <div className="hints-timeline glass-panel" style={{ padding: '16px' }}>
        <div className="hint-row" style={{ borderLeft: 'none', background: 'transparent', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>プレイヤー</div>
          <div>第1ラウンド</div>
          <div>第2ラウンド</div>
        </div>

        {playerList.map((p: Player) => {
          const isPlayerTurn = turnPlayerId === p.id;
          return (
            <div 
              key={p.id} 
              className={`hint-row ${isPlayerTurn ? 'is-active' : ''}`}
            >
              <div className="player-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} style={{ color: p.id === currentPlayerId ? 'var(--color-secondary)' : 'var(--text-muted)' }} />
                <span style={{ color: p.id === currentPlayerId ? 'var(--color-secondary)' : 'inherit' }}>
                  {p.name}
                </span>
              </div>
              
              {/* 第1ラウンドヒント */}
              <div className={`hint-bubble ${p.hints.round1 ? 'filled' : 'empty'}`}>
                {p.hints.round1 ? p.hints.round1 : (isPlayerTurn && currentRound === 1 ? '入力中...' : '-')}
              </div>
              
              {/* 第2ラウンドヒント */}
              <div className={`hint-bubble ${p.hints.round2 ? 'filled' : 'empty'}`}>
                {p.hints.round2 ? p.hints.round2 : (isPlayerTurn && currentRound === 2 ? '入力中...' : '-')}
              </div>
            </div>
          );
        })}
      </div>

      {/* 入力フォーム */}
      {isMyTurn && (
        <form onSubmit={handleSubmit} className="setup-form" style={{ marginTop: '24px' }}>
          <div className="input-group">
            <label>
              {settings.mode === 1 ? "ヒントワードを入力してください (自由)" : "ヒントとなるカード名を選択してください"}
            </label>
            
            {settings.mode === 1 ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="例: 赤い、空を飛ぶ、魔法..."
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  maxLength={15}
                  required
                  autoFocus
                />
                <button type="submit" className="primary">
                  <Send size={18} />
                  送信
                </button>
              </div>
            ) : (
              // カード名検索用のUI
              <div className="search-container" ref={searchRef}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="カード名を入力して検索..."
                      value={hintInput}
                      onChange={(e) => {
                        setHintInput(e.target.value);
                        setShowResults(true);
                      }}
                      onFocus={() => setShowResults(true)}
                      style={{ paddingLeft: '44px' }}
                      required
                    />
                  </div>
                  <button type="submit" className="primary">
                    <Send size={18} />
                    送信
                  </button>
                </div>
                
                {showResults && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((name) => (
                      <div
                        key={name}
                        className="search-item"
                        onClick={() => handleSelectCard(name)}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
                {showResults && hintInput.trim() !== '' && searchResults.length === 0 && (
                  <div className="search-results" style={{ padding: '12px', color: 'var(--color-accent)', fontSize: '0.85rem' }}>
                    該当するカードが見つかりません。
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
