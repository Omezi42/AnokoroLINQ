import { useState, useEffect } from 'react';
import { ref, set, onValue, get, update, remove, onDisconnect } from 'firebase/database';
import { db } from './firebase';
import type { Room, Player, GameMode, RoomSettings } from './types';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { Voting } from './components/Voting';
import { Results } from './components/Results';
import { THEMES, CARD_NAMES, CLASSIC_WORDS } from './cardData';
import { UserPlus, Sparkles } from 'lucide-react';
import './App.css';

// 部屋コードのランダム生成 (英数字4桁)
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ユーザーID of 取得または生成 (LocalStorageに保存)
const getOrCreateUserId = (): string => {
  let userId = localStorage.getItem('anokoro_linq_user_id');
  if (!userId) {
    userId = 'usr_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('anokoro_linq_user_id', userId);
  }
  return userId;
};

function App() {
  const [userId] = useState<string>(getOrCreateUserId());
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem('anokoro_linq_username');
    return (saved && saved !== 'null' && saved !== 'undefined') ? saved.trim() : '';
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isBanned, setIsBanned] = useState<boolean>(false);

  // ブラックリストのリアルタイム監視
  useEffect(() => {
    if (!userId) return;
    const blacklistRef = ref(db, `blacklist/${userId}`);
    const unsubscribe = onValue(blacklistRef, (snapshot) => {
      if (snapshot.val() === true) {
        setIsBanned(true);
      } else {
        setIsBanned(false);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  // 接続状態の監視と自動切断処理 (onDisconnect)
  useEffect(() => {
    if (!roomCode || !userId) return;

    const connectedRef = ref(db, '.info/connected');
    const myConnectionRef = ref(db, `rooms/${roomCode}/players/${userId}/isConnected`);
    let disconnectRef: any = null;

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myConnectionRef, true);
        disconnectRef = onDisconnect(myConnectionRef);
        disconnectRef.set(false);
      }
    });

    return () => {
      unsubscribe();
      if (disconnectRef) {
        disconnectRef.cancel();
      }
    };
  }, [roomCode, userId]);

  // 部屋のデータを購読
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoom(data as Room);
      } else {
        setRoom(null);
        setRoomCode('');
        setInputRoomCode('');
        alert("部屋が存在しないか、削除されました。");
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // ホストが結果画面に遷移した時にスコア計算を行う
  useEffect(() => {
    if (!room || room.status !== 'results' || !room.gameFlow || room.hostId !== userId) return;
    
    // すでにこの結果フェーズでスコア計算が済んでいる場合はスキップ
    const scoreCalcRef = ref(db, `rooms/${room.id}/scoreCalculated`);
    get(scoreCalcRef).then((snapshot) => {
      if (snapshot.val() === true) return;

      // スコア計算の実行
      const linkPairIds = room.gameFlow?.linkPairs || [];
      const players = room.players;
      const playerList = Object.values(players);
      const updates: Record<string, any> = {};

      if (linkPairIds.length < 2) return;
      const [spyAId, spyBId] = linkPairIds;
      const spyA = players[spyAId];
      const spyB = players[spyBId];

      // スパイ同士が互いを指名できているか？
      const spyAVotedSpyB = spyA?.vote?.player1 === spyBId || spyA?.vote?.player2 === spyBId;
      const spyBVotedSpyA = spyB?.vote?.player1 === spyAId || spyB?.vote?.player2 === spyAId;
      const isLinkSuccessful = spyAVotedSpyB && spyBVotedSpyA;

      // 各市民がスパイを見破ったか？
      const successfulCitizenIds: string[] = [];
      playerList.forEach((p) => {
        if (linkPairIds.includes(p.id)) return;
        const v1 = p.vote?.player1;
        const v2 = p.vote?.player2;
        // スパイ2人両方を指名しているか
        const correctCount = (v1 === spyAId || v1 === spyBId ? 1 : 0) + (v2 === spyAId || v2 === spyBId ? 1 : 0);
        if (correctCount === 2) {
          successfulCitizenIds.push(p.id);
        }
      });

      const anyCitizenGuessedSpies = successfulCitizenIds.length > 0;

      playerList.forEach((player) => {
        const isLink = linkPairIds.includes(player.id);
        let pointsGained = 0;

        if (isLink) {
          // スパイ側
          if (!anyCitizenGuessedSpies && isLinkSuccessful) {
            // スパイ成功：市民に見破られず、かつスパイ同士がリンク成功
            pointsGained = 2;
          } else {
            // スパイ失敗（見破られた、またはリンク失敗）
            pointsGained = 0;
          }
        } else {
          // 市民側
          if (successfulCitizenIds.includes(player.id)) {
            // 見破り成功した市民
            pointsGained = 2;
          } else if (!anyCitizenGuessedSpies && !isLinkSuccessful) {
            // 通信失敗：誰も見破れず、スパイ同士もリンク失敗
            pointsGained = 1;
          } else {
            // それ以外
            pointsGained = 0;
          }
        }

        const newScore = (player.score || 0) + pointsGained;
        updates[`rooms/${room.id}/players/${player.id}/score`] = newScore;
      });

      updates[`rooms/${room.id}/scoreCalculated`] = true;
      update(ref(db), updates);
    });
  }, [room?.status, room?.gameFlow, room?.hostId, userId, room?.id]);

  // 全員の投票が完了したかをホストが監視して、結果画面へ遷移する
  useEffect(() => {
    if (!room || room.status !== 'voting' || room.hostId !== userId) return;

    const players = Object.values(room.players || {});
    
    // 接続中の全プレイヤーが投票を終えているか？
    const activePlayers = players.filter(p => p.isConnected !== false);
    const allVoted = activePlayers.every(p => {
      const isLink = room.gameFlow?.linkPairs?.includes(p.id) || p.role === 'link';
      if (isLink) {
        return p.vote && p.vote.player1;
      } else {
        return p.vote && p.vote.player1 && p.vote.player2;
      }
    });

    if (allVoted && activePlayers.length >= 4) {
      update(ref(db, `rooms/${room.id}`), {
        status: 'results'
      });
    }
  }, [room, userId]);

  // 部屋の作成
  const handleCreateRoom = async () => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      alert("ニックネームを入力してください。");
      return;
    }
    localStorage.setItem('anokoro_linq_username', trimmedName);
    setIsJoining(true);

    const code = generateRoomCode();
    const newRoom: Room = {
      id: code,
      status: 'waiting',
      hostId: userId,
      settings: {
        mode: 1,
        themeType: 'random'
      },
      players: {
        [userId]: {
          id: userId,
          name: trimmedName,
          isHost: true,
          score: 0,
          role: 'none',
          targetWord: '',
          hints: { round1: '', round2: '' },
          vote: { player1: '', player2: '' },
          isConnected: true
        }
      }
    };

    try {
      await set(ref(db, `rooms/${code}`), newRoom);
      setRoomCode(code);
      setInputRoomCode(code);
    } catch (error) {
      console.error(error);
      alert("部屋の作成に失敗しました。");
    } finally {
      setIsJoining(false);
    }
  };

  // 部屋への参加
  const handleJoinRoom = async () => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      alert("ニックネームを入力してください。");
      return;
    }
    if (!inputRoomCode.trim()) {
      alert("ルームコードを入力してください。");
      return;
    }
    const cleanCode = inputRoomCode.trim().toUpperCase();
    localStorage.setItem('anokoro_linq_username', trimmedName);
    setIsJoining(true);

    try {
      const roomRef = ref(db, `rooms/${cleanCode}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        alert("指定されたルームコードの部屋が見つかりません。");
        setIsJoining(false);
        return;
      }

      const existingRoom = snapshot.val() as Room;
      if (existingRoom.status !== 'waiting') {
        alert("この部屋のゲームはすでに開始されているか、終了しています。");
        setIsJoining(false);
        return;
      }

      const newPlayer: Player = {
        id: userId,
        name: trimmedName,
        isHost: false,
        score: 0,
        role: 'none',
        targetWord: '',
        hints: { round1: '', round2: '' },
        vote: { player1: '', player2: '' },
        isConnected: true
      };

      await set(ref(db, `rooms/${cleanCode}/players/${userId}`), newPlayer);
      setRoomCode(cleanCode);
    } catch (error) {
      console.error(error);
      alert("部屋への参加に失敗しました。");
    } finally {
      setIsJoining(false);
    }
  };

  // 部屋から退出
  const handleLeaveRoom = async () => {
    if (!roomCode || !room) return;
    
    const isHost = room.hostId === userId;

    if (isHost) {
      if (confirm("あなたが退室すると部屋が解散されます。よろしいですか？")) {
        await remove(ref(db, `rooms/${roomCode}`));
        setRoomCode('');
        setInputRoomCode('');
      }
    } else {
      await remove(ref(db, `rooms/${roomCode}/players/${userId}`));
      setRoomCode('');
      setInputRoomCode('');
    }
  };

  // ゲーム開始 (ホスト)
  const handleStartGame = async (mode: GameMode, manualWord?: string) => {
    if (!room || room.hostId !== userId) return;

    const players = Object.values(room.players || {});
    
    // 接続中のプレイヤー数をチェック
    const activePlayers = players.filter(p => p.isConnected !== false);
    if (activePlayers.length < 4) {
      alert("接続中のプレイヤーが4人以上必要です。");
      return;
    }

    // 1. お題ワードの決定
    let secretWord = "";
    if (manualWord && manualWord.trim()) {
      secretWord = manualWord.trim();
    } else {
      if (mode === 4) {
        // モード4: 本家風ワードリストからランダム
        secretWord = CLASSIC_WORDS[Math.floor(Math.random() * CLASSIC_WORDS.length)];
      } else if (mode === 2) {
        // モード2: テーマからランダム
        secretWord = THEMES[Math.floor(Math.random() * THEMES.length)];
      } else {
        // モード1・3: カード名からランダム (NotFound, VOIDを除く)
        const cleanCards = CARD_NAMES.filter(n => n !== "NotFound" && n !== "VOID");
        secretWord = cleanCards[Math.floor(Math.random() * cleanCards.length)];
      }
    }

    // 2. リンクペアの決定 (接続中プレイヤーからランダムに2名)
    const shuffledPlayerIds = activePlayers.map(p => p.id);
    for (let i = shuffledPlayerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayerIds[i], shuffledPlayerIds[j]] = [shuffledPlayerIds[j], shuffledPlayerIds[i]];
    }
    const linkPairs = [shuffledPlayerIds[0], shuffledPlayerIds[1]];

    // 3. プレイヤーの初期設定オブジェクト
    const updatedPlayers: Record<string, Player> = {};
    players.forEach((p) => {
      // 接続が切れているプレイヤーはスコアのみ維持して初期化
      const isLink = linkPairs.includes(p.id);
      updatedPlayers[p.id] = {
        ...p,
        role: isLink ? 'link' : 'citizen',
        targetWord: isLink ? secretWord : '？',
        hints: { round1: '', round2: '' },
        vote: { player1: '', player2: '' }
      };
    });

    // 4. 手番順の決定 (接続中プレイヤーをシャッフル)
    const turnOrder = [...shuffledPlayerIds];

    // DB更新
    const gameUpdate = {
      status: 'playing',
      'settings/mode': mode,
      'settings/themeType': manualWord ? 'custom' : 'random',
      scoreCalculated: false,
      players: updatedPlayers,
      gameFlow: {
        round: 1,
        turnPlayerId: turnOrder[0],
        turnOrder: turnOrder,
        turnIndex: 0,
        secretWord: secretWord,
        linkPairs: linkPairs
      }
    };

    await update(ref(db, `rooms/${roomCode}`), gameUpdate);
  };

  // ヒントの提出
  const handleSubmitHint = async (hint: string) => {
    if (!room || !room.gameFlow) return;
    
    const flow = room.gameFlow;
    const currentRound = flow.round;
    const turnIndex = flow.turnIndex;
    const turnOrder = flow.turnOrder;
    const playersCount = turnOrder.length;

    // 1. 自分のヒントを更新 (部屋のルートからの相対パス)
    const hintPath = currentRound === 1 
      ? `players/${userId}/hints/round1`
      : `players/${userId}/hints/round2`;

    // 2. 次の手番進行を計算
    const nextIndex = turnIndex + 1;
    let nextRound = currentRound;
    let nextIndexInRound = nextIndex;
    let nextPlayerId = "";
    let nextStatus = 'playing';

    if (nextIndex >= playersCount) {
      // ラウンド終了
      if (currentRound === 1) {
        nextRound = 2;
        nextIndexInRound = 0;
        nextPlayerId = turnOrder[0];
      } else {
        // 全ヒント提出完了 ➔ 投票へ
        nextStatus = 'voting';
      }
    } else {
      nextPlayerId = turnOrder[nextIndex];
    }

    const updates: Record<string, any> = {};
    updates[hintPath] = hint;
    updates[`gameFlow/round`] = nextRound;
    updates[`gameFlow/turnIndex`] = nextIndexInRound;
    
    if (nextStatus === 'voting') {
      updates[`status`] = 'voting';
      updates[`gameFlow/turnPlayerId`] = "";
    } else {
      updates[`gameFlow/turnPlayerId`] = nextPlayerId;
    }

    await update(ref(db, `rooms/${roomCode}`), updates);
  };

  // 投票の送信
  const handleVote = async (player1Id: string, player2Id: string) => {
    if (!roomCode) return;
    await update(ref(db, `rooms/${roomCode}/players/${userId}/vote`), {
      player1: player1Id,
      player2: player2Id
    });
  };

  // もう一度遊ぶ (ホスト) - スコアは維持したまま新しいお題で開始
  const handleNextGame = () => {
    if (room) {
      const currentThemeType = room.settings.themeType || 'random';
      if (currentThemeType === 'custom') {
        const input = prompt("次のお題を入力してください（空欄の場合はランダムお題になります）：");
        if (input === null) return; // キャンセルされたら開始しない
        handleStartGame(room.settings.mode, input.trim() !== "" ? input.trim() : undefined);
      } else {
        handleStartGame(room.settings.mode);
      }
    }
  };

  // ロビーに戻る (ホスト) - 待機状態に戻る
  const handleBackToLobby = async () => {
    if (!room) return;
    
    const players = Object.values(room.players || {});
    const resetPlayers: Record<string, Player> = {};
    players.forEach(p => {
      resetPlayers[p.id] = {
        ...p,
        role: 'none',
        targetWord: '',
        hints: { round1: '', round2: '' },
        vote: { player1: '', player2: '' }
      };
    });

    await update(ref(db, `rooms/${roomCode}`), {
      status: 'waiting',
      scoreCalculated: false,
      players: resetPlayers,
      gameFlow: null
    });
  };

  // 設定の更新
  const handleUpdateSettings = async (settings: Partial<RoomSettings>) => {
    if (!roomCode) return;
    await update(ref(db, `rooms/${roomCode}/settings`), settings);
  };

  return (
    <div className="app-container">
      <header>
        <h1 className="animate-float">『あの頃の自作TCG』LINQ</h1>
        <p className="subtitle">カードゲームの言葉で繋がる、正体隠匿系連想ゲーム</p>
      </header>

      <main style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {isBanned ? (
          <div className="setup-screen glass-panel animate-pulse-glow" style={{ borderColor: 'var(--color-accent)' }}>
            <h2 style={{ color: 'var(--color-accent)' }}>アクセス制限</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', textAlign: 'center', margin: '20px 0', lineHeight: '1.6' }}>
              このアカウントは管理者によってアクセスが制限（BAN）されているため、ゲームをプレイできません。
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              ユーザーID: <code>{userId}</code>
            </p>
          </div>
        ) : !roomCode ? (
          /* セットアップ画面 (部屋作成・参加) */
          <div className="setup-screen glass-panel animate-pulse-glow">
            <h2>ゲームに参加</h2>
            <div className="setup-form">
              <div className="input-group">
                <label>ニックネーム</label>
                <input
                  type="text"
                  placeholder="あなたの名前"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                <button 
                  className="primary" 
                  onClick={handleCreateRoom}
                  disabled={isJoining || !userName.trim()}
                >
                  <Sparkles size={18} />
                  部屋を作る
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="ルームコード"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    style={{ textAlign: 'center', textTransform: 'uppercase' }}
                  />
                  <button 
                    className="secondary" 
                    onClick={handleJoinRoom}
                    disabled={isJoining || !userName.trim() || !inputRoomCode.trim()}
                  >
                    <UserPlus size={18} />
                    部屋に入る
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left' }}>
              <h4 style={{ marginBottom: '8px', color: 'var(--text-main)' }}>ゲームルール概要</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                プレイヤーの中に2人だけ、同じ「秘密のお題」を知っている<strong>リンクペア</strong>がいます。
                他のプレイヤー（一般市民）はお題を知りません（表示は『？』）。<br/><br/>
                各自順番にヒントを出し合い、2ラウンドのヒント公開が終わった後、誰と誰が同じお題を持っているペアなのかを推理して投票します。
              </p>
            </div>
          </div>
        ) : (
          /* ゲーム中画面 */
          room && (
            <>
              {room.status === 'waiting' && (
                <Lobby
                  room={room}
                  currentPlayerId={userId}
                  onStartGame={handleStartGame}
                  onLeaveRoom={handleLeaveRoom}
                  onShowToast={showToastNotification}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
              {room.status === 'playing' && (
                <GameBoard
                  room={room}
                  currentPlayerId={userId}
                  onSubmitHint={handleSubmitHint}
                />
              )}
              {room.status === 'voting' && (
                <Voting
                  room={room}
                  currentPlayerId={userId}
                  onVote={handleVote}
                />
              )}
              {room.status === 'results' && (
                <Results
                  room={room}
                  currentPlayerId={userId}
                  onNextGame={handleNextGame}
                  onBackToLobby={handleBackToLobby}
                />
              )}
            </>
          )
        )}
      </main>
      <div className={`toast-notification ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
}

export default App;
