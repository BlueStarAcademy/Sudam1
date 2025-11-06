import React, { useMemo, useState, useEffect } from 'react';
import { GameMode, UserWithStatus, GameSettings, Negotiation, ServerAction } from '../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, DEFAULT_GAME_SETTINGS } from '../constants.js';
import { 
  BOARD_SIZES, TIME_LIMITS, BYOYOMI_COUNTS, BYOYOMI_TIMES, CAPTURE_BOARD_SIZES, 
  CAPTURE_TARGETS, SPEED_BOARD_SIZES, SPEED_TIME_LIMITS, BASE_STONE_COUNTS,
  HIDDEN_STONE_COUNTS, SCAN_COUNTS, MISSILE_BOARD_SIZES, MISSILE_COUNTS,
  ALKKAGI_STONE_COUNTS, ALKKAGI_ROUNDS, CURLING_STONE_COUNTS, CURLING_ROUNDS,
  OMOK_BOARD_SIZES, HIDDEN_BOARD_SIZES, TTAMOK_CAPTURE_TARGETS, DICE_GO_ITEM_COUNTS,
  ALKKAGI_ITEM_COUNTS, CURLING_ITEM_COUNTS, ALKKAGI_GAUGE_SPEEDS, CURLING_GAUGE_SPEEDS,
  FISCHER_INCREMENT_SECONDS
} from '../constants/gameSettings.js';
import { AlkkagiPlacementType, AlkkagiLayoutType } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import Avatar from './Avatar.js';
import { useAppContext } from '../hooks/useAppContext.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants.js';

interface ChallengeReceivedModalProps {
  negotiation: Negotiation;
  currentUser: UserWithStatus;
  onAccept: (settings: GameSettings) => void;
  onDecline: () => void;
  onProposeModification: (settings: GameSettings) => void;
  onClose: () => void;
  onAction: (action: ServerAction) => void;
}

const ChallengeReceivedModal: React.FC<ChallengeReceivedModalProps> = ({ 
  negotiation, 
  currentUser, 
  onAccept, 
  onDecline, 
  onProposeModification, 
  onClose,
  onAction
}) => {
  const { onlineUsers } = useAppContext();
  
  const challenger = negotiation.challenger;
  const [settings, setSettings] = useState<GameSettings>(negotiation.settings);
  const selectedMode = negotiation.mode;
  
  // negotiation.settings가 변경되면 로컬 state 업데이트
  useEffect(() => {
    setSettings(negotiation.settings);
  }, [negotiation.settings]);
  
  const handleSettingChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 설정이 변경되었는지 확인
  const settingsHaveChanged = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(negotiation.settings);
  }, [settings, negotiation.settings]);

  const challengerAvatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === challenger.avatarId)?.url, [challenger.avatarId]);
  const challengerBorderUrl = useMemo(() => BORDER_POOL.find(b => b.id === challenger.borderId)?.url, [challenger.borderId]);

  const selectedGameDefinition = useMemo(() => {
    const allGameModes = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES];
    return allGameModes.find(mode => mode.mode === selectedMode);
  }, [selectedMode]);

  const challengerLevel = useMemo(() => {
    const isStrategicLobby = SPECIAL_GAME_MODES.some(m => m.mode === selectedMode);
    if (isStrategicLobby) {
      return Math.floor(challenger.strategyXp / 100) + 1;
    } else {
      return Math.floor(challenger.playfulXp / 100) + 1;
    }
  }, [challenger, selectedMode]);

  const challengerGameStats = useMemo(() => {
    if (!selectedMode) return null;
    const stats = challenger.stats || {};
    const gameStats = stats[selectedMode];
    if (!gameStats) {
      return { wins: 0, losses: 0, rankingScore: 1200 };
    }
    return gameStats;
  }, [selectedMode, challenger.stats]);

  const getBoardSizeLabel = (size: number) => {
    const hiddenBoard = HIDDEN_BOARD_SIZES.find(b => b.size === size);
    return hiddenBoard ? hiddenBoard.label : `${size}x${size}`;
  };

  const getStoneCountLabel = (count: number) => {
    const hiddenStone = HIDDEN_STONE_COUNTS.find(s => s.count === count);
    return hiddenStone ? hiddenStone.label : `${count}개`;
  };

  const isGoGame = ['standard', 'speed', 'capture', 'omok', 'thief', 'missile'].includes(selectedMode);
  const isAlkkagiGame = selectedMode === 'alkkagi';
  const isCurlingGame = selectedMode === 'curling';
  
  const showBoardSize = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice].includes(selectedMode);
  const showKomi = ![GameMode.Capture, GameMode.Omok, GameMode.Ttamok, GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief, GameMode.Base].includes(selectedMode);
  const showTimeControls = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief].includes(selectedMode);
  const showFischer = selectedMode === GameMode.Speed || (selectedMode === GameMode.Mix && !!settings.mixedModes?.includes(GameMode.Speed));
  const showCaptureTarget = selectedMode === GameMode.Capture;
  const showTtamokCaptureTarget = selectedMode === GameMode.Ttamok;
  const showOmokRules = selectedMode === GameMode.Omok || selectedMode === GameMode.Ttamok;
  const showBaseStones = selectedMode === GameMode.Base;
  const showHiddenStones = selectedMode === GameMode.Hidden;
  const showMissileCount = selectedMode === GameMode.Missile;
  const showDiceGoSettings = selectedMode === GameMode.Dice;
  const showAlkkagiSettings = selectedMode === GameMode.Alkkagi;
  const showCurlingSettings = selectedMode === GameMode.Curling;
  const showMixModeSelection = selectedMode === GameMode.Mix;

  const [imgError, setImgError] = useState(false);
  
  // 30초 타임아웃 시각화
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [deadlineTime, setDeadlineTime] = useState<number | null>(null);
  
  // negotiation.deadline이 변경되면 즉시 타이머 시작
  useEffect(() => {
    if (negotiation.deadline) {
      // deadline을 받은 즉시 타이머 시작
      const deadline = negotiation.deadline;
      setDeadlineTime(deadline);
      // 즉시 남은 시간 계산
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemaining(Math.min(remaining, 60));
    } else {
      // deadline이 없으면 60초로 초기화
      setTimeRemaining(60);
      setDeadlineTime(null);
    }
  }, [negotiation.deadline]);
  
  // 타이머 업데이트 (즉시 시작)
  useEffect(() => {
    if (!deadlineTime) return;
    
    // 첫 업데이트는 즉시 실행
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((deadlineTime - Date.now()) / 1000));
      setTimeRemaining(Math.min(remaining, 60));
      
      // 시간이 0초가 되면 자동으로 거절 처리
      if (remaining <= 0) {
        console.log('[ChallengeReceivedModal] Time expired, auto-declining');
        onDecline();
      }
    };
    
    // 즉시 한 번 실행
    updateTime();
    
    // 이후 100ms마다 업데이트
    const interval = setInterval(updateTime, 100);
    
    return () => clearInterval(interval);
  }, [deadlineTime, onDecline]);
  
  const progressPercentage = (timeRemaining / 60) * 100;

  return (
    <DraggableWindow title="대국 신청 받음" onClose={onClose} windowId="challenge-received" initialWidth={900}>
      <div onMouseDown={(e) => e.stopPropagation()} className="text-sm">
        <div className="flex flex-row gap-2 lg:gap-4 h-[500px] lg:h-[600px] min-h-[500px] lg:min-h-[600px]">
          {/* 좌측 패널: 게임 종류 이미지 및 게임 설명 */}
          <div className="w-1/3 lg:w-1/2 border-r border-gray-700 pr-2 lg:pr-4 flex flex-col">
            <p className="text-center text-yellow-300 mb-2 lg:mb-4 text-xs flex-shrink-0">{challenger.nickname}님에게서 대국 신청이 도착했습니다.</p>
            
            {/* 타임아웃 카운트다운 */}
            {negotiation.deadline && (
              <div className="mb-3 flex-shrink-0">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">응답 남은 시간</span>
                    <span className={`text-lg font-bold ${timeRemaining <= 5 ? 'text-red-400' : timeRemaining <= 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {timeRemaining}초
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-100 ${timeRemaining <= 5 ? 'bg-red-500' : timeRemaining <= 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* 게임 이미지 */}
            {selectedGameDefinition && (
              <div className="mb-4 flex-shrink-0">
                <div className="w-full h-[200px] lg:h-[250px] bg-tertiary rounded-lg flex items-center justify-center overflow-hidden shadow-inner relative">
                  {!imgError ? (
                    <img 
                      src={selectedGameDefinition.image} 
                      alt={selectedMode} 
                      className="w-full h-full object-contain"
                      onError={() => setImgError(true)} 
                    />
                  ) : (
                    <span className="text-lg font-bold">{selectedMode}</span>
                  )}
                </div>
                <h3 className="text-center text-lg font-bold text-primary mt-2">{selectedMode}</h3>
              </div>
            )}
            
            {/* 게임 설명 */}
            <div className="flex-grow overflow-y-auto pr-1">
              <h4 className="font-semibold text-gray-300 mb-2 lg:mb-3 text-sm">게임 설명</h4>
              <p className="text-xs text-tertiary leading-relaxed">
                {selectedGameDefinition?.description || '선택된 게임에 대한 설명이 없습니다.'}
              </p>
            </div>
          </div>

          {/* 우측 패널: 프로필 + 전적 + 대국 설정 */}
          <div className="w-2/3 lg:w-1/2 pl-2 lg:pl-4 flex flex-col">
            {/* 신청자 프로필 */}
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <Avatar 
                  userId={challenger.id} 
                  userName={challenger.nickname} 
                  avatarUrl={challengerAvatarUrl} 
                  borderUrl={challengerBorderUrl} 
                  size={48} 
                />
                <div className="flex-grow">
                  <h3 className="text-lg font-bold">{challenger.nickname}</h3>
                  <p className="text-xs text-gray-400">
                    {SPECIAL_GAME_MODES.some(m => m.mode === selectedMode) ? '전략' : '놀이'} Lv.{challengerLevel}
                  </p>
                </div>
              </div>
              {/* 선택한 게임 전적 */}
              {selectedMode && challengerGameStats && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <p className="text-xs font-semibold text-gray-300 mb-2">{selectedMode} 전적</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">승률</span>
                    <span className="font-bold">
                      {challengerGameStats.wins}승 {challengerGameStats.losses}패 
                      ({challengerGameStats.wins + challengerGameStats.losses > 0 
                        ? Math.round((challengerGameStats.wins / (challengerGameStats.wins + challengerGameStats.losses)) * 100) 
                        : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-gray-400">랭킹 점수</span>
                    <span className="font-mono text-yellow-300">{challengerGameStats.rankingScore}점</span>
                  </div>
                </div>
              )}
            </div>

            {/* 대국 설정 */}
            <div className="flex-grow overflow-y-auto">
              <h4 className="font-semibold text-gray-300 mb-3 text-sm">대국 설정</h4>
              <div className="space-y-2 lg:space-y-3 pr-2">
              {showBoardSize && (
                <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
                  <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">판 크기</label>
                  <select 
                    value={settings.boardSize} 
                    onChange={e => handleSettingChange('boardSize', parseInt(e.target.value, 10) as GameSettings['boardSize'])}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
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
                <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
                  <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">덤 (백)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="1" 
                      value={Math.floor(settings.komi)} 
                      onChange={e => handleSettingChange('komi', parseInt(e.target.value, 10) + 0.5)} 
                      className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2" 
                    />
                    <span className="font-bold text-sm text-gray-300 whitespace-nowrap">.5 집</span>
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
                      {(selectedMode === GameMode.Speed ? SPEED_TIME_LIMITS : TIME_LIMITS).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {showFischer && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
                      <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">피셔 보너스</label>
                      <select 
                        value={settings.timeIncrement ?? FISCHER_INCREMENT_SECONDS} 
                        onChange={e => handleSettingChange('timeIncrement', parseInt(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                      >
                        {[0, 5, 10, 15, 20, 30].map(t => <option key={t} value={t}>{t}초</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
                    <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">초읽기</label>
                    <div className="flex gap-2">
                      <select 
                        value={settings.byoyomiTime} 
                        onChange={e => handleSettingChange('byoyomiTime', parseInt(e.target.value))}
                        className="flex-1 bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                      >
                        {BYOYOMI_TIMES.map(t => <option key={t} value={t}>{t}초</option>)}
                      </select>
                      <select 
                        value={settings.byoyomiCount} 
                        onChange={e => handleSettingChange('byoyomiCount', parseInt(e.target.value))}
                        className="flex-1 bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
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

              {selectedMode === GameMode.Thief && (
                <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1 lg:gap-2 items-center">
                  <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">도둑말 개수</label>
                  <select 
                    value={settings.thiefStoneCount} 
                    onChange={e => handleSettingChange('thiefStoneCount', parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                  >
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c}개</option>)}
                  </select>
                </div>
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

              {showMixModeSelection && (
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-300 text-xs lg:text-sm">믹스룰 게임 모드 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES]
                      .filter(m => m.mode !== GameMode.Mix && m.mode !== GameMode.Dice && m.mode !== GameMode.Omok && m.mode !== GameMode.Ttamok && m.mode !== GameMode.Alkkagi && m.mode !== GameMode.Curling)
                      .map(modeDef => {
                        const isSelected = settings.mixedModes?.includes(modeDef.mode) || false;
                        return (
                          <label key={modeDef.mode} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                const currentModes = settings.mixedModes || [];
                                if (e.target.checked) {
                                  handleSettingChange('mixedModes', [...currentModes, modeDef.mode]);
                                } else {
                                  handleSettingChange('mixedModes', currentModes.filter(m => m !== modeDef.mode));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-300">{modeDef.mode}</span>
                          </label>
                        );
                      })}
                  </div>
                  {settings.mixedModes && settings.mixedModes.length < 2 && (
                    <p className="text-xs text-red-400">최소 2개 이상의 게임 모드를 선택해야 합니다.</p>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="mt-2 lg:mt-4 border-t border-gray-700 pt-2 lg:pt-4 flex justify-between gap-2 lg:gap-3">
              <Button onClick={onDecline} variant="secondary" colorScheme="red" className="!text-sm !py-1.5 flex-1">거절</Button>
              <Button 
                onClick={() => onProposeModification(settings)}
                variant="secondary" 
                colorScheme="yellow" 
                className="!text-sm !py-1.5 flex-1"
                disabled={!settingsHaveChanged}
              >
                수정 제안
              </Button>
              <Button 
                onClick={() => onAccept(negotiation.settings)} 
                variant="primary" 
                colorScheme="green" 
                className="!text-sm !py-1.5 flex-1"
                disabled={settingsHaveChanged}
              >
                수락
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};

export default ChallengeReceivedModal;

