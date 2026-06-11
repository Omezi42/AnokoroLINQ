import React, { useState, useEffect, useRef } from 'react';
import type { Room, Player } from '../types';
import { CARDS, CARD_NAMES } from '../cardData';
import { Send, Search, HelpCircle, Tag, MessageSquare, ChevronRight } from 'lucide-react';

interface GameBoardProps {
  room: Room;
  currentPlayerId: string;
  onSubmitHint: (hint: string) => void;
}

const MAJOR_TYPES = ["火", "水", "風", "地", "光", "闇", "雷", "ドラゴン", "ゴブリン", "ゾンビ", "機械", "魚", "虫", "鳥", "妖精", "騎士"];

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
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  // モード別表示用のテキスト
  const modeText = 
    settings.mode === 1 ? "モード1: お題【カード名】➔ 回答【自由テキスト】" :
    settings.mode === 2 ? "モード2: お題【一般テーマ】➔ 回答【カード名】" :
    settings.mode === 3 ? "モード3: お題【カード名】➔ 回答【カード名】" :
    "モード4: お題【本家風ワード】➔ 回答【自由テキスト】";

  // カード検索（モード2・3用）
  useEffect(() => {
    if (settings.mode === 1 || settings.mode === 4) {
      setSearchResults([]);
      return;
    }

    let filtered = CARDS;

    // タイプで絞り込み
    if (selectedType) {
      filtered = filtered.filter(card => card.types.includes(selectedType));
    }

    // クエリで絞り込み
    const query = hintInput.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) && 
        card.name !== "NotFound" && 
        card.name !== "VOID"
      );
    } else if (!selectedType) {
      // 検索語もタイプ指定もない場合は表示しない
      setSearchResults([]);
      return;
    }

    // 表示上限を30件にして探しやすくする
    setSearchResults(filtered.map(c => c.name).slice(0, 30));
  }, [hintInput, selectedType, settings.mode]);

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

  // 新しいヒント受信時にタイムラインの末尾にスクロール
  useEffect(() => {
    setTimeout(() => {
      timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [players]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalHint = hintInput.trim();
    if (!finalHint) return;

    // モード2・3の場合、存在するカード名であるかチェック
    if (settings.mode !== 1 && settings.mode !== 4) {
      if (!CARD_NAMES.includes(finalHint)) {
        alert("『あの頃の自作TCG』に存在する正確なカード名を選択してください。");
        return;
      }
    }

    onSubmitHint(finalHint);
    setHintInput('');
    setSelectedType(null);
    setShowResults(false);
  };

  const handleSelectCard = (cardName: string) => {
    setHintInput(cardName);
    setShowResults(false);
  };

  const handleToggleType = (type: string) => {
    if (selectedType === type) {
      setSelectedType(null);
    } else {
      setSelectedType(type);
      setShowResults(true); // タグ選択時に結果を開く
    }
  };

  // タイムライン用の並び順（turnOrderに従う）
  const playerList = gameFlow.turnOrder.map(id => players[id]).filter(Boolean);

  return (
    <div className="game-screen glass-panel">
      {/* モード情報 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span className="lobby-settings-info">{modeText}</span>
        <span className="lobby-settings-info" style={{ borderColor: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
          ラウンド {currentRound} / 2
        </span>
      </div>

      {/* お題カード表示 (3Dフリップカード) */}
      <div className="card-revealer">
        <p className="subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
          <HelpCircle size={16} />
          配られたカード (クリックで裏返します)
        </p>
        
        <div 
          className={`tcg-card-wrapper ${isFlipped ? 'flipped' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="tcg-card-inner">
            {/* カードの裏面 (隠されている状態) */}
            <div className="tcg-card-front">
              <div className="tcg-card-pattern"></div>
              <span className="tcg-card-badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                SECRET CARD
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.05em' }}>TAP TO REVEAL</div>
              <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.8 }}>タップしてお題を確認</div>
            </div>

            {/* カードの表面 (オープンされた状態) */}
            {me.role === 'citizen' ? (
              <div className="tcg-card-back citizen-card">
                <span className="tcg-card-badge" style={{ background: 'rgba(225, 29, 72, 0.08)', color: 'var(--color-accent)' }}>
                  👤 一般市民
                </span>
                <div className="word-display unknown">？</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  あなたはお題を知りません。<br/>他のプレイヤーのヒントからペアを推理してください。
                </p>
              </div>
            ) : (
              <div className="tcg-card-back">
                <span className="tcg-card-badge" style={{ background: 'rgba(124, 58, 237, 0.08)', color: 'var(--color-primary)' }}>
                  🔗 リンクペア
                </span>
                <div className="word-display">{me.targetWord}</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  お題を共有する相方がいます。<br/>市民にバレないよう、相方に伝わるヒントを出してください。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 手番ステータス */}
      <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'other-turn'}`}>
        {isMyTurn ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            ✨ あなたのヒント提出ターンです！
          </span>
        ) : (
          <span>💬 {activePlayer?.name} がヒントを入力しています...</span>
        )}
      </div>

      {/* ヒントタイムライン */}
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '1.1rem' }}>
        <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
        ヒントタイムライン
      </h3>
      <div className="hints-timeline glass-panel">
        {playerList.map((p: Player) => {
          const isPlayerTurn = turnPlayerId === p.id;
          const isMe = p.id === currentPlayerId;
          
          return (
            <div key={p.id} className="chat-row">
              <div className="chat-meta">
                <span className={`player-name ${isMe ? 'is-me-tag' : ''}`}>
                  {p.name} {isMe ? '(あなた)' : ''}
                </span>
                {p.isConnected === false && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '0px 4px', borderRadius: '4px' }}>
                    OFFLINE
                  </span>
                )}
              </div>
              
              <div className="chat-bubble-container">
                {/* ラウンド1のバブル */}
                <div className={`chat-bubble ${isMe ? 'my-bubble' : ''} ${isPlayerTurn && currentRound === 1 ? 'active-bubble' : ''}`}>
                  <div className="chat-round-label">Round 1</div>
                  {p.hints.round1 ? (
                    <div style={{ fontWeight: 600 }}>{p.hints.round1}</div>
                  ) : isPlayerTurn && currentRound === 1 ? (
                    <div className="writing">入力中...</div>
                  ) : (
                    <div className="empty">-</div>
                  )}
                </div>
                
                {/* ラウンド2のバブル */}
                <div className={`chat-bubble ${isMe ? 'my-bubble' : ''} ${isPlayerTurn && currentRound === 2 ? 'active-bubble' : ''}`}>
                  <div className="chat-round-label">Round 2</div>
                  {p.hints.round2 ? (
                    <div style={{ fontWeight: 600 }}>{p.hints.round2}</div>
                  ) : isPlayerTurn && currentRound === 2 ? (
                    <div className="writing">入力中...</div>
                  ) : (
                    <div className="empty">-</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={timelineEndRef} />
      </div>

      {/* 入力フォーム */}
      {isMyTurn && (
        <form onSubmit={handleSubmit} className="setup-form" style={{ marginTop: '24px' }}>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <ChevronRight size={14} style={{ color: 'var(--color-primary)' }} />
              {settings.mode === 1 || settings.mode === 4 ? "自由なヒントワードを入力してください" : "ヒントにするカード名を選択してください"}
            </label>
            
            {settings.mode === 1 || settings.mode === 4 ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder={settings.mode === 4 ? "例: 温かい、飲み物、朝など..." : "例: 赤い、ドラゴン、属性など..."}
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  maxLength={15}
                  required
                  autoFocus
                />
                <button type="submit" className="primary" style={{ borderRadius: '12px' }}>
                  <Send size={16} />
                  送信
                </button>
              </div>
            ) : (
              // カード名検索用のUI
              <div className="search-container" ref={searchRef}>
                {/* タイプフィルタータグ */}
                <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <Tag size={12} />
                    種族・属性で絞り込む:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                    {MAJOR_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleToggleType(type)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '0.75rem',
                          borderRadius: '999px',
                          border: '1px solid',
                          borderColor: selectedType === type ? 'var(--color-primary)' : 'var(--border-color)',
                          background: selectedType === type ? 'var(--color-primary-glow)' : 'transparent',
                          color: selectedType === type ? 'var(--color-primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: selectedType === type ? 'bold' : 'normal',
                          transition: 'all 0.15s'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={selectedType ? `[${selectedType}] タイプのカード名を検索...` : "カード名を入力して検索..."}
                      value={hintInput}
                      onChange={(e) => {
                        setHintInput(e.target.value);
                        setShowResults(true);
                      }}
                      onFocus={() => setShowResults(true)}
                      style={{ paddingLeft: '44px' }}
                      required={!selectedType}
                    />
                  </div>
                  <button type="submit" className="primary" style={{ borderRadius: '12px' }}>
                    <Send size={16} />
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
                {showResults && (hintInput.trim() !== '' || selectedType !== null) && searchResults.length === 0 && (
                  <div className="search-results" style={{ padding: '16px', color: 'var(--color-accent)', fontSize: '0.85rem', textAlign: 'center' }}>
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
