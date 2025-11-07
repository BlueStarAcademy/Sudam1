import React, { useState, useMemo, useEffect } from 'react';
import { GameMode, UserWithStatus, GameSettings, Negotiation } from '../types';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, DEFAULT_GAME_SETTINGS } from '../constants';
import { 
  BOARD_SIZES, TIME_LIMITS, BYOYOMI_COUNTS, BYOYOMI_TIMES, CAPTURE_BOARD_SIZES, 
  CAPTURE_TARGETS, TTAMOK_CAPTURE_TARGETS, SPEED_BOARD_SIZES, SPEED_TIME_LIMITS, BASE_STONE_COUNTS,
  HIDDEN_STONE_COUNTS, SCAN_COUNTS, MISSILE_BOARD_SIZES, MISSILE_COUNTS,
  ALKKAGI_STONE_COUNTS, ALKKAGI_ROUNDS, ALKKAGI_GAUGE_SPEEDS, ALKKAGI_ITEM_COUNTS,
  CURLING_STONE_COUNTS, CURLING_ROUNDS, CURLING_GAUGE_SPEEDS, CURLING_ITEM_COUNTS,
  OMOK_BOARD_SIZES, HIDDEN_BOARD_SIZES, DICE_GO_ITEM_COUNTS
} from '../constants/gameSettings';
import { AlkkagiPlacementType, AlkkagiLayoutType } from '../types';
import Button from './Button';
import DraggableWindow from './DraggableWindow';
import Avatar from './Avatar';
import { useAppContext } from '../hooks/useAppContext';
import { AVATAR_POOL, BORDER_POOL } from '../constants';

interface ChallengeSelectionModalProps {
  opponent: UserWithStatus;
  onChallenge: (mode: GameMode, settings?: GameSettings) => void;
  onClose: () => void;
  lobbyType: 'strategic' | 'playful';
  negotiations?: Negotiation[];
  currentUser?: UserWithStatus;
}

const GameCard: React.FC<{ 
    mode: GameMode, 
    image: string, 
    onSelect: (mode: GameMode) => void,
    isSelected: boolean,
    isRejected: boolean,
    scaleFactor?: number
}> = ({ mode, image, onSelect, isSelected, isRejected, scaleFactor = 1 }) => {
    const [imgError, setImgError] = useState(false);
    
    // 스케일에 따른 크기 계산 (더 컴팩트하게)
    const padding = Math.max(3, Math.round(6 * scaleFactor));
    const imageHeight = Math.max(70, Math.round(100 * scaleFactor));
    const fontSize = Math.max(8, Math.round(10 * scaleFactor));
    const titleFontSize = Math.max(9, Math.round(11 * scaleFactor));

    return (
        <div
            className={`bg-panel text-on-panel rounded-lg flex flex-col items-center text-center transition-all transform ${
                isRejected 
                    ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' 
                    : isSelected
                    ? 'ring-2 ring-primary hover:-translate-y-1 shadow-lg cursor-pointer'
                    : 'hover:-translate-y-1 shadow-lg cursor-pointer'
            }`}
            style={{ padding: `${padding}px`, gap: `${Math.max(4, Math.round(8 * scaleFactor))}px` }}
            onClick={() => {
                if (!isRejected) {
                    onSelect(mode);
                }
            }}
        >
            <div 
                className="w-full flex-shrink-0 bg-tertiary rounded-md flex items-center justify-center text-tertiary overflow-hidden shadow-inner relative"
                style={{ 
                    height: `${imageHeight}px`,
                    marginBottom: `${Math.max(4, Math.round(8 * scaleFactor))}px`,
                    padding: `${Math.max(4, Math.round(8 * scaleFactor))}px`
                }}
            >
                {!imgError ? (
                    <>
                        <img 
                            src={image} 
                            alt={mode} 
                            className={`w-full h-full object-contain ${isRejected ? 'grayscale' : ''}`}
                            onError={() => setImgError(true)} 
                        />
                        {isRejected && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <span 
                                    className="text-white font-bold text-center"
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    거부중
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <span style={{ fontSize: `${fontSize}px` }}>{mode}</span>
                )}
            </div>
            <div className="flex-grow flex flex-col w-full">
                <h3 
                    className={`font-bold leading-tight ${isRejected ? 'text-gray-400' : 'text-primary'}`}
                    style={{ fontSize: `${titleFontSize}px`, marginBottom: `${Math.max(2, Math.round(4 * scaleFactor))}px` }}
                >
                    {mode}
                </h3>
            </div>
        </div>
    );
};

const ChallengeSelectionModal: React.FC<ChallengeSelectionModalProps> = ({ opponent, onChallenge, onClose, lobbyType, negotiations, currentUser: propCurrentUser }) => {
  const { currentUserWithStatus: contextCurrentUser, handlers, onlineUsers } = useAppContext();
  const currentUser = propCurrentUser || contextCurrentUser;
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  
  // 브라우저 크기에 따라 창 크기 계산
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 뷰포트 크기에 비례한 창 크기 계산 (80% 너비, 최소 550px, 최대 950px)
  const calculatedWidth = Math.max(550, Math.min(950, windowWidth * 0.8));
  // 뷰포트 크기에 비례한 창 높이 계산 (75% 높이, 최소 550px, 최대 850px) - 알까기 설정이 잘리지 않도록 높이 증가
  const calculatedHeight = Math.max(550, Math.min(850, windowHeight * 0.75));
  
  // 창 크기에 비례한 스케일 팩터 계산 (기준: 900px 너비)
  const baseWidth = 900;
  const scaleFactor = Math.max(0.7, Math.min(1.2, calculatedWidth / baseWidth));
  
  // 스케일 팩터를 CSS 변수로 전달
  const containerStyle = {
    '--scale-factor': scaleFactor,
  } as React.CSSProperties;
  
  // 현재 negotiation 상태 확인
  const currentNegotiation = useMemo(() => {
    if (!currentUser || !negotiations) return null;
    // negotiations가 배열인지 객체인지 확인
    const negotiationsArray = Array.isArray(negotiations) ? negotiations : Object.values(negotiations);
    return negotiationsArray.find(n => 
      n.challenger.id === currentUser.id && 
      n.opponent.id === opponent.id && 
      (n.status === 'pending' || n.status === 'draft')
    ) || null;
  }, [currentUser, opponent.id, negotiations]);
  
  const isWaitingForResponse = currentNegotiation?.status === 'pending' && currentNegotiation.proposerId === opponent.id;

  const availableGames = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;

  // 상대방이 대기실에서 나갔는지 확인
  useEffect(() => {
    const currentOpponent = onlineUsers.find(u => u.id === opponent.id);
    // 상대방이 더 이상 온라인이 아니거나, 대기 가능한 상태가 아니면 모달 닫기
    if (!currentOpponent || (currentOpponent.status !== 'waiting' && currentOpponent.status !== 'online' && currentOpponent.status !== 'resting')) {
      onClose();
    }
  }, [onlineUsers, opponent.id, onClose]);

  // negotiation이 종료되면 모달 닫기 (수락/거절/게임 시작/타임아웃)
  useEffect(() => {
    // negotiation이 사라졌거나 상태가 변경되었으면 모달 닫기
    if (currentNegotiation && isWaitingForResponse) {
      // negotiation이 pending 상태이고 proposerId가 opponent인 경우는 계속 기다림
      // negotiation이 accepted 되었거나 declined 되었을 때만 닫기
      if (currentNegotiation.status === 'accepted' || currentNegotiation.status === 'declined') {
        onClose();
      }
      // 타임아웃은 timeRemaining이 0이 되었을 때 처리됨
    } else if (!currentNegotiation && isWaitingForResponse) {
      // negotiation이 없는데 이전에 응답을 기다리고 있었으면 종료된 것 (타임아웃 또는 수락/거절)
      // 약간의 지연을 두고 확인하여 WebSocket 업데이트 지연을 고려
      const timeout = setTimeout(() => {
        // negotiations를 다시 확인
        const negotiationsArray = Array.isArray(negotiations) ? negotiations : Object.values(negotiations || {});
        const stillNoNegotiation = !negotiationsArray.find(n => 
          n.challenger.id === currentUser?.id && 
          n.opponent.id === opponent.id && 
          (n.status === 'pending' || n.status === 'draft')
        );
        if (stillNoNegotiation) {
          console.log('[ChallengeSelectionModal] Negotiation disappeared, closing modal');
          onClose();
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentNegotiation, isWaitingForResponse, onClose, negotiations, currentUser, opponent.id]);
  
  // negotiation이 업데이트되면 selectedMode와 settings 동기화
  useEffect(() => {
    if (currentNegotiation && currentNegotiation.status === 'pending') {
      if (!selectedMode || selectedMode !== currentNegotiation.mode) {
        setSelectedMode(currentNegotiation.mode);
      }
      if (JSON.stringify(settings) !== JSON.stringify(currentNegotiation.settings)) {
        setSettings(currentNegotiation.settings);
      }
    }
  }, [currentNegotiation, selectedMode, settings]);

  // 상대방 프로필 정보
  const opponentAvatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === opponent.avatarId)?.url, [opponent.avatarId]);
  const opponentBorderUrl = useMemo(() => BORDER_POOL.find(b => b.id === opponent.borderId)?.url, [opponent.borderId]);

  // 선택한 게임에 대한 상대방 전적
  const selectedGameStats = useMemo(() => {
    if (!selectedMode) return null;
    const stats = opponent.stats || {};
    const gameStats = stats[selectedMode];
    if (!gameStats) {
      return { wins: 0, losses: 0, rankingScore: 1200 };
    }
    return gameStats;
  }, [selectedMode, opponent.stats]);

  // 게임 모드별 레벨 계산
  const opponentLevel = useMemo(() => {
    if (lobbyType === 'strategic') {
      return Math.floor(opponent.strategyXp / 100) + 1;
    } else {
      return Math.floor(opponent.playfulXp / 100) + 1;
    }
  }, [opponent, lobbyType]);

  // 선택한 게임 정의
  const selectedGameDefinition = useMemo(() => {
    if (!selectedMode) return null;
    return availableGames.find(game => game.mode === selectedMode) || null;
  }, [selectedMode, availableGames]);

  // 30초 타임아웃 시각화
  const negotiationDeadline = currentNegotiation?.deadline;
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  
  // negotiationDeadline이 변경되면 timeRemaining 업데이트
  useEffect(() => {
    if (negotiationDeadline) {
      const remaining = Math.max(0, Math.ceil((negotiationDeadline - Date.now()) / 1000));
      const newTimeRemaining = Math.min(remaining, 30);
      setTimeRemaining(newTimeRemaining);
    } else {
      // deadline이 없으면 30초로 초기화
      setTimeRemaining(30);
    }
  }, [negotiationDeadline]);
  
  // 타이머 업데이트
  useEffect(() => {
    if (!negotiationDeadline && !isWaitingForResponse) return;
    
    // deadline이 없지만 응답을 기다리는 중이면 기본 30초 타이머 시작
    const startTime = negotiationDeadline ? negotiationDeadline : (Date.now() + 30000);
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((startTime - Date.now()) / 1000));
      const newTimeRemaining = Math.min(remaining, 30);
      setTimeRemaining(newTimeRemaining);
      
      // 시간이 0초가 되면 모달 닫기
      if (newTimeRemaining <= 0) {
        console.log('[ChallengeSelectionModal] Time expired, closing modal');
        onClose();
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [negotiationDeadline, isWaitingForResponse, onClose]);
  
  const progressPercentage = (timeRemaining / 30) * 100;

  const handleGameSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    // 로컬 스토리지에서 선호 설정 불러오기
    try {
      const storageKey = `preferredGameSettings_${mode}`;
      const savedSettingsJSON = localStorage.getItem(storageKey);
      if (savedSettingsJSON) {
        const savedSettings = JSON.parse(savedSettingsJSON);
        setSettings({ ...DEFAULT_GAME_SETTINGS, ...savedSettings });
      } else {
        setSettings({ ...DEFAULT_GAME_SETTINGS });
      }
    } catch (e) {
      setSettings({ ...DEFAULT_GAME_SETTINGS });
    }
  };

  const handleSettingChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleChallenge = async () => {
    if (!selectedMode) return;

    // 거부된 게임인지 확인
    if (opponent.rejectedGameModes?.includes(selectedMode)) {
      return;
    }

    // 현재 유저가 대기 상태인지 확인하고, 아니면 대기 상태로 설정
    if (currentUser && currentUser.status !== 'waiting' && currentUser.status !== 'resting') {
      try {
        await handlers.handleAction({ 
          type: 'ENTER_WAITING_ROOM', 
          payload: { mode: lobbyType === 'strategic' ? 'strategic' : 'playful' } 
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        onChallenge(selectedMode, settings);
      } catch (error) {
        console.error('Failed to enter waiting room:', error);
        onChallenge(selectedMode, settings);
      }
    } else {
      onChallenge(selectedMode, settings);
    }
  };

  // 게임 모드별 설정 UI 렌더링
  const renderGameSettings = () => {
    if (!selectedMode) {
      return (
        <div 
          className="text-center text-gray-400"
          style={{ 
            paddingTop: `${Math.max(32, Math.round(32 * scaleFactor))}px`,
            paddingBottom: `${Math.max(32, Math.round(32 * scaleFactor))}px`,
            fontSize: `${Math.max(11, Math.round(14 * scaleFactor))}px`
          }}
        >
          좌측에서 게임 종류를 선택하세요
        </div>
      );
    }

    const showBoardSize = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice].includes(selectedMode);
    const showKomi = ![GameMode.Capture, GameMode.Omok, GameMode.Ttamok, GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief, GameMode.Base].includes(selectedMode);
    const showTimeControls = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief].includes(selectedMode);
    const showCaptureTarget = selectedMode === GameMode.Capture;
    const showTtamokCaptureTarget = selectedMode === GameMode.Ttamok;
    const showOmokRules = selectedMode === GameMode.Omok || selectedMode === GameMode.Ttamok;
    const showBaseStones = selectedMode === GameMode.Base;
    const showHiddenStones = selectedMode === GameMode.Hidden;
    const showMissileCount = selectedMode === GameMode.Missile;
    const showDiceGoSettings = selectedMode === GameMode.Dice;
    const showAlkkagiSettings = selectedMode === GameMode.Alkkagi;
    const showCurlingSettings = selectedMode === GameMode.Curling;
    
    // 반응형 스타일 헬퍼 (더 컴팩트하게)
    const settingRowStyle = {
      gap: `${Math.max(3, Math.round(6 * scaleFactor))}px`,
      marginBottom: `${Math.max(4, Math.round(6 * scaleFactor))}px`
    };
    const labelStyle = {
      fontSize: `${Math.max(9, Math.round(11 * scaleFactor))}px`
    };
    const inputStyle = {
      fontSize: `${Math.max(9, Math.round(11 * scaleFactor))}px`,
      padding: `${Math.max(4, Math.round(6 * scaleFactor))}px`
    };

    return (
      <div 
        className="h-full"
        style={{ 
          gap: `${Math.max(4, Math.round(6 * scaleFactor))}px`,
          paddingRight: `${Math.max(4, Math.round(6 * scaleFactor))}px`
        }}
      >
        {showBoardSize && (
          <div 
            className="flex flex-row lg:grid lg:grid-cols-2 items-center"
            style={settingRowStyle}
          >
            <label 
              className="font-semibold text-gray-300 flex-shrink-0"
              style={labelStyle}
            >
              판 크기
            </label>
            <select 
              value={settings.boardSize} 
              onChange={e => handleSettingChange('boardSize', parseInt(e.target.value, 10) as GameSettings['boardSize'])}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
              style={inputStyle}
            >
              {(selectedMode === GameMode.Omok || selectedMode === GameMode.Ttamok ? OMOK_BOARD_SIZES : 
                selectedMode === GameMode.Capture ? CAPTURE_BOARD_SIZES : 
                selectedMode === GameMode.Speed ? SPEED_BOARD_SIZES : 
                selectedMode === GameMode.Hidden ? HIDDEN_BOARD_SIZES : 
                selectedMode === GameMode.Thief ? [9, 13, 19] : 
                selectedMode === GameMode.Missile ? MISSILE_BOARD_SIZES : 
                BOARD_SIZES).map(size => (
                <option key={size} value={size}>{size}줄</option>
              ))}
            </select>
          </div>
        )}

        {showKomi && (
          <div 
            className="flex flex-row lg:grid lg:grid-cols-2 items-center"
            style={settingRowStyle}
          >
            <label 
              className="font-semibold text-gray-300 flex-shrink-0"
              style={labelStyle}
            >
              덤 (백)
            </label>
            <div className="flex items-center" style={{ gap: `${Math.max(8, Math.round(8 * scaleFactor))}px` }}>
              <input 
                type="number" 
                step="1" 
                value={Math.floor(settings.komi)} 
                onChange={e => handleSettingChange('komi', parseInt(e.target.value, 10) + 0.5)} 
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                style={inputStyle}
              />
              <span 
                className="font-bold text-gray-300 whitespace-nowrap"
                style={labelStyle}
              >
                .5 집
              </span>
            </div>
          </div>
        )}

        {showTimeControls && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">제한 시간</label>
              <select 
                value={settings.timeLimit} 
                onChange={e => handleSettingChange('timeLimit', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {TIME_LIMITS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">초읽기</label>
              <div className="flex gap-2">
                <select 
                  value={settings.byoyomiTime} 
                  onChange={e => handleSettingChange('byoyomiTime', parseInt(e.target.value))}
                  className="flex-1 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                >
                  {BYOYOMI_TIMES.map(t => <option key={t} value={t}>{t}초</option>)}
                </select>
                <select 
                  value={settings.byoyomiCount} 
                  onChange={e => handleSettingChange('byoyomiCount', parseInt(e.target.value))}
                  className="flex-1 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                >
                  {BYOYOMI_COUNTS.map(c => <option key={c} value={c}>{c}회</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {showCaptureTarget && (
          <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">포획 목표</label>
            <select 
              value={settings.captureTarget} 
              onChange={e => handleSettingChange('captureTarget', parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
            >
              {CAPTURE_TARGETS.map(t => <option key={t} value={t}>{t}점</option>)}
            </select>
          </div>
        )}

        {showBaseStones && (
          <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">베이스 돌</label>
            <select 
              value={settings.baseStones} 
              onChange={e => handleSettingChange('baseStones', parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
            >
              {BASE_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
            </select>
          </div>
        )}

        {showHiddenStones && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">히든아이템</label>
              <select 
                value={settings.hiddenStoneCount} 
                onChange={e => handleSettingChange('hiddenStoneCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {HIDDEN_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">스캔아이템</label>
              <select 
                value={settings.scanCount || 5} 
                onChange={e => handleSettingChange('scanCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {SCAN_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
          </>
        )}

        {showMissileCount && (
          <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">미사일 개수</label>
            <select 
              value={settings.missileCount} 
              onChange={e => handleSettingChange('missileCount', parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
            >
              {MISSILE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
            </select>
          </div>
        )}

        {showAlkkagiSettings && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">돌 개수</label>
              <select 
                value={settings.alkkagiStoneCount} 
                onChange={e => handleSettingChange('alkkagiStoneCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드</label>
              <select 
                value={settings.alkkagiRounds} 
                onChange={e => handleSettingChange('alkkagiRounds', parseInt(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_ROUNDS.map(r => <option key={r} value={r}>{r}라운드</option>)}
              </select>
            </div>
          </>
        )}

        {showDiceGoSettings && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드 설정</label>
              <select 
                value={settings.diceGoRounds ?? 3} 
                onChange={e => handleSettingChange('diceGoRounds', parseInt(e.target.value, 10) as 1 | 2 | 3)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {[1, 2, 3].map(r => <option key={r} value={r}>{r}라운드</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">홀수 주사위</label>
              <select 
                value={settings.oddDiceCount ?? 1} 
                onChange={e => handleSettingChange('oddDiceCount', parseInt(e.target.value, 10))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {DICE_GO_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">짝수 주사위</label>
              <select 
                value={settings.evenDiceCount ?? 1} 
                onChange={e => handleSettingChange('evenDiceCount', parseInt(e.target.value, 10))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {DICE_GO_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
          </>
        )}

        {showTtamokCaptureTarget && (
          <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">따내기 목표</label>
            <select 
              value={settings.captureTarget ?? 20} 
              onChange={e => handleSettingChange('captureTarget', parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
            >
              {TTAMOK_CAPTURE_TARGETS.map(t => <option key={t} value={t}>{t}개</option>)}
            </select>
          </div>
        )}

        {showOmokRules && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">쌍삼 금지</label>
              <input 
                type="checkbox" 
                checked={settings.has33Forbidden ?? true} 
                onChange={e => handleSettingChange('has33Forbidden', e.target.checked)} 
                className="w-5 h-5"
              />
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">장목 금지</label>
              <input 
                type="checkbox" 
                checked={settings.hasOverlineForbidden ?? true} 
                onChange={e => handleSettingChange('hasOverlineForbidden', e.target.checked)} 
                className="w-5 h-5"
              />
            </div>
          </>
        )}

        {showAlkkagiSettings && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">돌 개수</label>
              <select 
                value={settings.alkkagiStoneCount ?? 5} 
                onChange={e => handleSettingChange('alkkagiStoneCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드</label>
              <select 
                value={settings.alkkagiRounds ?? 1} 
                onChange={e => handleSettingChange('alkkagiRounds', parseInt(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_ROUNDS.map(r => <option key={r} value={r}>{r}라운드</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">배치 방식</label>
              <select 
                value={settings.alkkagiPlacementType ?? AlkkagiPlacementType.TurnByTurn} 
                onChange={e => handleSettingChange('alkkagiPlacementType', e.target.value as AlkkagiPlacementType)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {Object.values(AlkkagiPlacementType).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">배치 전장</label>
              <select 
                value={settings.alkkagiLayout ?? AlkkagiLayoutType.Normal} 
                onChange={e => handleSettingChange('alkkagiLayout', e.target.value as AlkkagiLayoutType)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {Object.values(AlkkagiLayoutType).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">게이지 속도</label>
              <select 
                value={settings.alkkagiGaugeSpeed ?? 700} 
                onChange={e => handleSettingChange('alkkagiGaugeSpeed', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_GAUGE_SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">슬로우 아이템</label>
              <select 
                value={settings.alkkagiSlowItemCount ?? 2} 
                onChange={e => handleSettingChange('alkkagiSlowItemCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">조준선 아이템</label>
              <select 
                value={settings.alkkagiAimingLineItemCount ?? 2} 
                onChange={e => handleSettingChange('alkkagiAimingLineItemCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {ALKKAGI_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
          </>
        )}

        {showCurlingSettings && (
          <>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">돌 개수</label>
              <select 
                value={settings.curlingStoneCount ?? 5} 
                onChange={e => handleSettingChange('curlingStoneCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {CURLING_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드</label>
              <select 
                value={settings.curlingRounds ?? 3} 
                onChange={e => handleSettingChange('curlingRounds', parseInt(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {CURLING_ROUNDS.map(r => <option key={r} value={r}>{r}라운드</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">게이지 속도</label>
              <select 
                value={settings.curlingGaugeSpeed ?? 700} 
                onChange={e => handleSettingChange('curlingGaugeSpeed', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {CURLING_GAUGE_SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">슬로우 아이템</label>
              <select 
                value={settings.curlingSlowItemCount ?? 2} 
                onChange={e => handleSettingChange('curlingSlowItemCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {CURLING_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
            <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
              <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">조준선 아이템</label>
              <select 
                value={settings.curlingAimingLineItemCount ?? 2} 
                onChange={e => handleSettingChange('curlingAimingLineItemCount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
              >
                {CURLING_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
              </select>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <DraggableWindow title="대국 신청" windowId="challenge-selection" onClose={onClose} initialWidth={calculatedWidth} initialHeight={calculatedHeight}>
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="h-full flex flex-col overflow-hidden"
        style={containerStyle}
      >
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden" style={{ gap: `${Math.max(8, Math.round(16 * scaleFactor))}px` }}>
          {/* 좌측 패널: 게임 종류 선택 또는 게임 정보 */}
          <div 
            className="w-1/3 lg:w-1/2 border-r border-gray-700 flex flex-col min-h-0 overflow-hidden"
            style={{ paddingRight: `${Math.max(8, Math.round(16 * scaleFactor))}px` }}
          >
            <p 
              className="text-center text-yellow-300 flex-shrink-0"
              style={{ 
                marginBottom: `${Math.max(6, Math.round(10 * scaleFactor))}px`,
                fontSize: `${Math.max(9, Math.round(11 * scaleFactor))}px`
              }}
            >
              {isWaitingForResponse 
                ? `${opponent.nickname}님의 응답을 기다리는 중...` 
                : `${opponent.nickname}님에게 대국을 신청합니다.`}
            </p>
            
            {isWaitingForResponse && selectedGameDefinition ? (
              <>
                {/* 타임아웃 카운트다운 */}
                {negotiationDeadline && (
                  <div className="flex-shrink-0" style={{ marginBottom: `${Math.max(8, Math.round(10 * scaleFactor))}px` }}>
                    <div 
                      className="bg-gray-800/50 rounded-lg border border-gray-700"
                      style={{ padding: `${Math.max(8, Math.round(10 * scaleFactor))}px` }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: `${Math.max(6, Math.round(6 * scaleFactor))}px` }}>
                        <span className="text-gray-400" style={{ fontSize: `${Math.max(9, Math.round(11 * scaleFactor))}px` }}>
                          응답 남은 시간
                        </span>
                        <span 
                          className={`font-bold ${timeRemaining <= 5 ? 'text-red-400' : timeRemaining <= 10 ? 'text-yellow-400' : 'text-green-400'}`}
                          style={{ fontSize: `${Math.max(12, Math.round(16 * scaleFactor))}px` }}
                        >
                          {timeRemaining}초
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full overflow-hidden" style={{ height: `${Math.max(8, Math.round(12 * scaleFactor))}px` }}>
                        <div 
                          className={`h-full transition-all duration-100 ${timeRemaining <= 5 ? 'bg-red-500' : timeRemaining <= 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 게임 이미지 */}
                <div className="flex-shrink-0" style={{ marginBottom: `${Math.max(10, Math.round(14 * scaleFactor))}px` }}>
                  <div 
                    className="w-full bg-tertiary rounded-lg flex items-center justify-center overflow-hidden shadow-inner relative"
                    style={{ height: `${Math.max(120, Math.round(160 * scaleFactor))}px` }}
                  >
                    <img 
                      src={selectedGameDefinition.image} 
                      alt={selectedMode} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 
                    className="text-center font-bold text-primary mt-2"
                    style={{ fontSize: `${Math.max(14, Math.round(18 * scaleFactor))}px` }}
                  >
                    {selectedMode}
                  </h3>
                </div>
                
                {/* 게임 설명 */}
                <div className="flex-grow overflow-y-auto" style={{ paddingRight: `${Math.max(4, Math.round(8 * scaleFactor))}px` }}>
                  <h4 
                    className="font-semibold text-gray-300"
                    style={{ 
                      marginBottom: `${Math.max(8, Math.round(12 * scaleFactor))}px`,
                      fontSize: `${Math.max(11, Math.round(14 * scaleFactor))}px`
                    }}
                  >
                    게임 설명
                  </h4>
                  <p 
                    className="text-tertiary leading-relaxed"
                    style={{ fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px` }}
                  >
                    {selectedGameDefinition.description || '선택된 게임에 대한 설명이 없습니다.'}
                  </p>
                </div>
              </>
            ) : (
              <div 
                className="flex-1 grid grid-cols-2 overflow-y-auto min-h-0"
                style={{ 
                  gap: `${Math.max(6, Math.round(12 * scaleFactor))}px`,
                  paddingRight: `${Math.max(4, Math.round(8 * scaleFactor))}px`
                }}
              >
                {availableGames.map((game) => {
                  const isRejected = opponent.rejectedGameModes?.includes(game.mode) || false;
                  return (
                    <GameCard
                      key={game.mode}
                      mode={game.mode}
                      image={game.image}
                      onSelect={handleGameSelect}
                      isSelected={selectedMode === game.mode}
                      isRejected={isRejected}
                      scaleFactor={scaleFactor}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* 우측 패널: 프로필 + 전적 + 협상 설정 */}
          <div 
            className="w-2/3 lg:w-1/2 flex flex-col min-h-0 overflow-hidden"
            style={{ paddingLeft: `${Math.max(8, Math.round(16 * scaleFactor))}px` }}
          >
            {/* 상대방 프로필 */}
            <div 
              className="bg-gray-900/50 rounded-lg border border-gray-700 flex-shrink-0"
              style={{ 
                padding: `${Math.max(8, Math.round(12 * scaleFactor))}px`,
                marginBottom: `${Math.max(8, Math.round(12 * scaleFactor))}px`
              }}
            >
              <div 
                className="flex items-center"
                style={{ 
                  gap: `${Math.max(8, Math.round(12 * scaleFactor))}px`,
                  marginBottom: `${Math.max(8, Math.round(12 * scaleFactor))}px`
                }}
              >
                <Avatar 
                  userId={opponent.id} 
                  userName={opponent.nickname} 
                  avatarUrl={opponentAvatarUrl} 
                  borderUrl={opponentBorderUrl} 
                  size={Math.max(32, Math.round(40 * scaleFactor))} 
                />
                <div className="flex-grow">
                  <h3 
                    className="font-bold"
                    style={{ fontSize: `${Math.max(14, Math.round(18 * scaleFactor))}px` }}
                  >
                    {opponent.nickname}
                  </h3>
                  <p 
                    className="text-gray-400"
                    style={{ fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px` }}
                  >
                    {lobbyType === 'strategic' ? '전략' : '놀이'} Lv.{opponentLevel}
                  </p>
                </div>
              </div>
              {/* 선택한 게임 전적 */}
              {selectedMode && selectedGameStats && (
                <div 
                  className="border-t border-gray-700"
                  style={{ 
                    paddingTop: `${Math.max(12, Math.round(16 * scaleFactor))}px`,
                    marginTop: `${Math.max(12, Math.round(16 * scaleFactor))}px`
                  }}
                >
                  <p 
                    className="font-semibold text-gray-300"
                    style={{ 
                      marginBottom: `${Math.max(8, Math.round(8 * scaleFactor))}px`,
                      fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px`
                    }}
                  >
                    {selectedMode} 전적
                  </p>
                  <div 
                    className="flex justify-between items-center"
                    style={{ fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px` }}
                  >
                    <span className="text-gray-400">승률</span>
                    <span className="font-bold">
                      {selectedGameStats.wins}승 {selectedGameStats.losses}패 
                      ({selectedGameStats.wins + selectedGameStats.losses > 0 
                        ? Math.round((selectedGameStats.wins / (selectedGameStats.wins + selectedGameStats.losses)) * 100) 
                        : 0}%)
                    </span>
                  </div>
                  <div 
                    className="flex justify-between items-center"
                    style={{ 
                      marginTop: `${Math.max(4, Math.round(4 * scaleFactor))}px`,
                      fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px`
                    }}
                  >
                    <span className="text-gray-400">랭킹 점수</span>
                    <span className="font-mono text-yellow-300">{selectedGameStats.rankingScore}점</span>
                  </div>
                </div>
              )}
            </div>

            {/* 협상 설정 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <h4 
                className="font-semibold text-gray-300 flex-shrink-0"
                style={{ 
                  marginBottom: `${Math.max(6, Math.round(8 * scaleFactor))}px`,
                  fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px`
                }}
              >
                대국 설정
              </h4>
              {isWaitingForResponse ? (
                <div 
                  className="overflow-y-auto"
                  style={{ 
                    gap: `${Math.max(8, Math.round(12 * scaleFactor))}px`,
                    paddingRight: `${Math.max(8, Math.round(8 * scaleFactor))}px`
                  }}
                >
                  {renderGameSettings()}
                </div>
              ) : (
                renderGameSettings()
              )}
            </div>

            {/* 하단 버튼 */}
            <div 
              className="border-t border-gray-700 flex justify-end flex-shrink-0"
              style={{ 
                marginTop: `${Math.max(6, Math.round(8 * scaleFactor))}px`,
                paddingTop: `${Math.max(6, Math.round(8 * scaleFactor))}px`,
                gap: `${Math.max(8, Math.round(12 * scaleFactor))}px`
              }}
            >
              <Button 
                onClick={onClose} 
                variant="secondary" 
                style={{ 
                  fontSize: `${Math.max(11, Math.round(14 * scaleFactor))}px`,
                  padding: `${Math.max(6, Math.round(8 * scaleFactor))}px ${Math.max(12, Math.round(16 * scaleFactor))}px`
                }}
              >
                취소
              </Button>
              {isWaitingForResponse ? (
                <Button 
                  variant="primary" 
                  disabled
                  style={{ 
                    fontSize: `${Math.max(11, Math.round(14 * scaleFactor))}px`,
                    padding: `${Math.max(6, Math.round(8 * scaleFactor))}px ${Math.max(12, Math.round(16 * scaleFactor))}px`
                  }}
                >
                  응답 대기 중...
                </Button>
              ) : (
                <Button 
                  onClick={handleChallenge} 
                  variant="primary" 
                  disabled={!selectedMode}
                  style={{ 
                    fontSize: `${Math.max(11, Math.round(14 * scaleFactor))}px`,
                    padding: `${Math.max(6, Math.round(8 * scaleFactor))}px ${Math.max(12, Math.round(16 * scaleFactor))}px`
                  }}
                >
                  대국 신청
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};

export default ChallengeSelectionModal;
