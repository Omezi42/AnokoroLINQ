import { useState, useEffect } from 'react';
import { ref, set, onValue, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { Room, Player, GameMode } from './types';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { Voting } from './components/Voting';
import { Results } from './components/Results';
import { THEMES, CARD_NAMES } from './cardData';
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

// ユーザーIDの取得または生成 (LocalStorageに保存)
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
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('anokoro_linq_username') || '');
  const [roomCode, setRoomCode] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

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
        alert("部屋が存在しないか、削除されました。");
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // 投票が全員完了したかをホストが監視して、結果画面に遷移する処理
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.gameFlow) return;
    
    // 全員のヒントが埋まっているか？（安全策として、ヒントが揃ったら投票画面に行くのはゲーム進行ロジックで制御している）
    // ここでは 'voting' ステータスにおいて、全員の投票が完了したかを監視
  }, [room]);

  // ホストが結果画面に遷移した時にスコア計算を行う
  useEffect(() => {
    if (!room || room.status !== 'results' || !room.gameFlow || room.hostId !== userId) return;
    
    // すでにこの結果フェーズでスコア計算が済んでいる場合はスキップ
    // Firebase側で rooms/roomCode/scoreCalculated が true なら実行しない
    // (onValueの複数回発火から保護するため、Realtime Databaseのトランザクションを使用)
    const scoreCalcRef = ref(db, `rooms/${room.id}/scoreCalculated`);
    get(scoreCalcRef).then((snapshot) => {
      if (snapshot.val() === true) return;

      // スコア計算の実行
      const linkPairIds = room.gameFlow?.linkPairs || [];
      const players = room.players;
      const playerList = Object.values(players);
      const updates: Record<string, any> = {};

      playerList.forEach((player) => {
        const isLink = linkPairIds.includes(player.id);
        let pointsGained = 0;
        const vote1 = player.vote?.player1;
        const vote2 = player.vote?.player2;

        if (isLink) {
          // リンクの得点
          // 1. 相方を当てたか？
          const partnerId = linkPairIds.find(id => id !== player.id);
          if (partnerId && (vote1 === partnerId || vote2 === partnerId)) {
            pointsGained += 2;
          }
          // 2. 市民にバレなかったか？
          const citizens = playerList.filter(p => !linkPairIds.includes(p.id));
          const gotVotedByCitizen = citizens.some(c => c.vote?.player1 === player.id || c.vote?.player2 === player.id);
          if (!gotVotedByCitizen) {
            pointsGained += 1;
          }
        } else {
          // 市民の得点
          // リンクペアを当てたか？
          const p1Correct = linkPairIds.includes(vote1);
          const p2Correct = linkPairIds.includes(vote2);
          if (p1Correct && p2Correct) {
            pointsGained += 2;
          } else if (p1Correct || p2Correct) {
            pointsGained += 1;
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
    // 接続している全プレイヤーが投票を終えているか？
    const allVoted = players.every(p => p.vote && p.vote.player1 && p.vote.player2);

    if (allVoted && players.length >= 4) {
      update(ref(db, `rooms/${room.id}`), {
        status: 'results'
      });
    }
  }, [room, userId]);

  // 部屋の作成
  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      alert("ニックネームを入力してください。");
      return;
    }
    localStorage.setItem('anokoro_linq_username', userName.trim());
    setIsJoining(true);

    const code = generateRoomCode();
    const newRoom: Room = {
      id: code,
      status: 'waiting',
      hostId: userId,
      settings: {
        mode: 1
      },
      players: {
        [userId]: {
          id: userId,
          name: userName.trim(),
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
    } catch (error) {
      console.error(error);
      alert("部屋の作成に失敗しました。");
    } finally {
      setIsJoining(false);
    }
  };

  // 部屋への参加
  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      alert("ニックネームを入力してください。");
      return;
    }
    if (!roomCode.trim()) {
      alert("ルームコードを入力してください。");
      return;
    }
    const cleanCode = roomCode.trim().toUpperCase();
    localStorage.setItem('anokoro_linq_username', userName.trim());
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
        name: userName.trim(),
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
      }
    } else {
      await remove(ref(db, `rooms/${roomCode}/players/${userId}`));
      setRoomCode('');
    }
  };

  // ゲーム開始 (ホスト)
  const handleStartGame = async (mode: GameMode) => {
    if (!room || room.hostId !== userId) return;

    const players = Object.values(room.players || {});
    if (players.length < 4) {
      alert("ゲームを開始するには4人以上のプレイヤーが必要です。");
      return;
    }

    // 1. お題ワードの決定
    let secretWord = "";
    if (mode === 2) {
      // モード2: テーマからランダム
      secretWord = THEMES[Math.floor(Math.random() * THEMES.length)];
    } else {
      // モード1・3: カード名からランダム (NotFound, VOIDを除く)
      const cleanCards = CARD_NAMES.filter(n => n !== "NotFound" && n !== "VOID");
      secretWord = cleanCards[Math.floor(Math.random() * cleanCards.length)];
    }

    // 2. リンクペアの決定 (ランダムに2名)
    const shuffledPlayerIds = players.map(p => p.id).sort(() => Math.random() - 0.5);
    const linkPairs = [shuffledPlayerIds[0], shuffledPlayerIds[1]];

    // 3. プレイヤーの初期設定オブジェクト
    const updatedPlayers: Record<string, Player> = {};
    players.forEach((p) => {
      const isLink = linkPairs.includes(p.id);
      updatedPlayers[p.id] = {
        ...p,
        role: isLink ? 'link' : 'citizen',
        targetWord: isLink ? secretWord : '？',
        hints: { round1: '', round2: '' },
        vote: { player1: '', player2: '' }
      };
    });

    // 4. 手番順の決定 (シャッフル)
    const turnOrder = [...shuffledPlayerIds];

    // DB更新
    const gameUpdate = {
      status: 'playing',
      'settings/mode': mode,
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

    // 1. 自分のヒントを更新
    const hintPath = currentRound === 1 
      ? `rooms/${roomCode}/players/${userId}/hints/round1`
      : `rooms/${roomCode}/players/${userId}/hints/round2`;

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
    updates[`rooms/${roomCode}/gameFlow/round`] = nextRound;
    updates[`rooms/${roomCode}/gameFlow/turnIndex`] = nextIndexInRound;
    
    if (nextStatus === 'voting') {
      updates[`rooms/${roomCode}/status`] = 'voting';
      updates[`rooms/${roomCode}/gameFlow/turnPlayerId`] = "";
    } else {
      updates[`rooms/${roomCode}/gameFlow/turnPlayerId`] = nextPlayerId;
    }

    await update(ref(db), updates);
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
      handleStartGame(room.settings.mode);
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

  return (
    <div className="app-container">
      <header>
        <h1 className="animate-float">『あの頃の自作TCG』LINQ</h1>
        <p className="subtitle">カードゲームの言葉で繋がる、正体隠匿系連想ゲーム</p>
      </header>

      <main style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {!roomCode ? (
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
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    style={{ textAlign: 'center', textTransform: 'uppercase' }}
                  />
                  <button 
                    className="secondary" 
                    onClick={handleJoinRoom}
                    disabled={isJoining || !userName.trim() || !roomCode.trim()}
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
    </div>
  );
}

export default App;
