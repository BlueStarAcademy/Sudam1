import React, { useState, useMemo, useEffect } from 'react';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { GameMode, ServerAction, GameSettings, Player, AlkkagiPlacementType } from '../../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, DEFAULT_GAME_SETTINGS, aiUserId } from '../../constants';
import { 
  BOARD_SIZES, TIME_LIMITS, BYOYOMI_COUNTS, BYOYOMI_TIMES, CAPTURE_BOARD_SIZES, 
  CAPTURE_TARGETS, TTAMOK_CAPTURE_TARGETS, SPEED_BOARD_SIZES, SPEED_TIME_LIMITS, BASE_STONE_COUNTS,
  HIDDEN_STONE_COUNTS, SCAN_COUNTS, MISSILE_BOARD_SIZES, MISSILE_COUNTS,
  ALKKAGI_STONE_COUNTS, ALKKAGI_ROUNDS, ALKKAGI_GAUGE_SPEEDS, ALKKAGI_ITEM_COUNTS,
  CURLING_STONE_COUNTS, CURLING_ROUNDS, CURLING_GAUGE_SPEEDS, CURLING_ITEM_COUNTS,
  OMOK_BOARD_SIZES, HIDDEN_BOARD_SIZES, DICE_GO_ITEM_COUNTS
} from '../../constants/gameSettings.js';
import Avatar from '../Avatar.js';

interface AiChallengeModalProps {
    lobbyType: 'strategic' | 'playful';
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}

const GameCard: React.FC<{ 
    mode: GameMode, 
    image: string, 
    onSelect: (mode: GameMode) => void,
    isSelected: boolean,
}> = ({ mode, image, onSelect, isSelected }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className={`bg-panel text-on-panel rounded-lg flex flex-col items-center text-center transition-all transform ${
                isSelected
                    ? 'ring-2 ring-purple-500 hover:-translate-y-1 shadow-lg cursor-pointer'
                    : 'hover:-translate-y-1 shadow-lg cursor-pointer'
            }`}
            style={{ padding: '8px', gap: '4px' }}
            onClick={() => onSelect(mode)}
        >
            <div 
                className="w-full flex-shrink-0 bg-tertiary rounded-md flex items-center justify-center text-tertiary overflow-hidden shadow-inner relative"
                style={{ height: '100px', marginBottom: '4px', padding: '4px' }}
            >
                {!imgError ? (
                    <img 
                        src={image} 
                        alt={mode} 
                        className="w-full h-full object-contain"
                        onError={() => setImgError(true)} 
                    />
                ) : (
                    <span style={{ fontSize: '10px' }}>{mode}</span>
                )}
            </div>
            <div className="flex-grow flex flex-col w-full">
                <h3 
                    className="font-bold leading-tight text-primary"
                    style={{ fontSize: '11px', marginBottom: '2px' }}
                >
                    {mode}
                </h3>
            </div>
        </div>
    );
};

const AiChallengeModal: React.FC<AiChallengeModalProps> = ({ lobbyType, onClose, onAction }) => {
    const availableGameModes = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
    const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(availableGameModes[0]?.mode || null);
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
    // 뷰포트 크기에 비례한 창 높이 계산 (75% 높이, 최소 500px, 최대 800px)
    const calculatedHeight = Math.max(500, Math.min(800, windowHeight * 0.75));

    const selectedGameDefinition = useMemo(() => {
        return availableGameModes.find(mode => mode.mode === selectedGameMode);
    }, [availableGameModes, selectedGameMode]);

    // 게임 모드 변경 시 설정 초기화
    useEffect(() => {
        if (selectedGameMode) {
            const savedSettings = localStorage.getItem(`preferredGameSettings_${selectedGameMode}`);
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    setSettings({ ...DEFAULT_GAME_SETTINGS, ...parsed });
                } catch {
                    setSettings({ ...DEFAULT_GAME_SETTINGS });
                }
            } else {
                setSettings({ ...DEFAULT_GAME_SETTINGS });
            }
        }
    }, [selectedGameMode]);

    const handleSettingChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            if (selectedGameMode) {
                localStorage.setItem(`preferredGameSettings_${selectedGameMode}`, JSON.stringify(newSettings));
            }
            return newSettings;
        });
    };

    const handleChallenge = () => {
        if (selectedGameMode) {
            onAction({ type: 'START_AI_GAME', payload: { mode: selectedGameMode, settings } });
            onClose();
        }
    };

    // 게임 모드별 설정 UI 렌더링
    const renderGameSettings = () => {
        if (!selectedGameMode) {
            return (
                <div className="text-center text-gray-400 py-8">
                    좌측에서 게임 종류를 선택하세요
                </div>
            );
        }

        const showBoardSize = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice].includes(selectedGameMode);
        const showKomi = ![GameMode.Capture, GameMode.Omok, GameMode.Ttamok, GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief, GameMode.Base].includes(selectedGameMode);
        const showTimeControls = ![GameMode.Alkkagi, GameMode.Curling, GameMode.Dice, GameMode.Thief].includes(selectedGameMode);
        const showCaptureTarget = selectedGameMode === GameMode.Capture;
        const showTtamokCaptureTarget = selectedGameMode === GameMode.Ttamok;
        const showBaseStones = selectedGameMode === GameMode.Base;
        const showHiddenStones = selectedGameMode === GameMode.Hidden;
        const showMissileCount = selectedGameMode === GameMode.Missile;
        const showDiceGoSettings = selectedGameMode === GameMode.Dice;
        const showAlkkagiSettings = selectedGameMode === GameMode.Alkkagi;
        const showCurlingSettings = selectedGameMode === GameMode.Curling;
        const showThiefSettings = selectedGameMode === GameMode.Thief;
        // 도둑과 경찰은 역할 설정으로 대체되므로 순서 설정에서 제외
        const showPlayerColor = [GameMode.Dice, GameMode.Alkkagi, GameMode.Curling].includes(selectedGameMode);
        const showOmokForbiddenRules = selectedGameMode === GameMode.Omok;
        const showTtamokForbiddenRules = selectedGameMode === GameMode.Ttamok;

        return (
            <div className="h-full flex flex-col gap-2 overflow-y-auto pr-2">
                {showBoardSize && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">판 크기</label>
                        <select 
                            value={settings.boardSize} 
                            onChange={e => handleSettingChange('boardSize', parseInt(e.target.value, 10) as GameSettings['boardSize'])}
                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                        >
                            {(selectedGameMode === GameMode.Omok || selectedGameMode === GameMode.Ttamok ? OMOK_BOARD_SIZES : 
                                selectedGameMode === GameMode.Capture ? CAPTURE_BOARD_SIZES : 
                                selectedGameMode === GameMode.Speed ? SPEED_BOARD_SIZES : 
                                selectedGameMode === GameMode.Hidden ? HIDDEN_BOARD_SIZES : 
                                selectedGameMode === GameMode.Thief ? [9, 13, 19] : 
                                selectedGameMode === GameMode.Missile ? MISSILE_BOARD_SIZES : 
                                BOARD_SIZES).map(size => (
                                <option key={size} value={size}>{size}줄</option>
                            ))}
                        </select>
                    </div>
                )}

                {showKomi && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">덤 (백)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                step="1" 
                                value={Math.floor(settings.komi)} 
                                onChange={e => handleSettingChange('komi', parseInt(e.target.value, 10) + 0.5)} 
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2" 
                            />
                            <span className="font-bold text-gray-300 whitespace-nowrap text-xs lg:text-sm">.5 집</span>
                        </div>
                    </div>
                )}

                {showTimeControls && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">제한 시간</label>
                            <select 
                                value={settings.timeLimit} 
                                onChange={e => handleSettingChange('timeLimit', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {TIME_LIMITS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
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
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
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
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">포획 목표</label>
                        <select 
                            value={settings.ttamokCaptureTarget || 5} 
                            onChange={e => handleSettingChange('ttamokCaptureTarget', parseInt(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                        >
                            {TTAMOK_CAPTURE_TARGETS.map(t => <option key={t} value={t}>{t}점</option>)}
                        </select>
                    </div>
                )}

                {showOmokForbiddenRules && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">삼삼 금지</label>
                            <input 
                                type="checkbox" 
                                checked={settings.has33Forbidden ?? true} 
                                onChange={e => handleSettingChange('has33Forbidden', e.target.checked)} 
                                className="w-5 h-5"
                            />
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">육목 이상 금지</label>
                            <input 
                                type="checkbox" 
                                checked={settings.hasOverlineForbidden ?? true} 
                                onChange={e => handleSettingChange('hasOverlineForbidden', e.target.checked)} 
                                className="w-5 h-5"
                            />
                        </div>
                    </>
                )}

                {showTtamokForbiddenRules && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">삼삼 금지</label>
                            <input 
                                type="checkbox" 
                                checked={settings.has33Forbidden ?? true} 
                                onChange={e => handleSettingChange('has33Forbidden', e.target.checked)} 
                                className="w-5 h-5"
                            />
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">육목 이상 금지</label>
                            <input 
                                type="checkbox" 
                                checked={settings.hasOverlineForbidden ?? true} 
                                onChange={e => handleSettingChange('hasOverlineForbidden', e.target.checked)} 
                                className="w-5 h-5"
                            />
                        </div>
                    </>
                )}

                {showPlayerColor && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">순서</label>
                        <select 
                            value={settings.player1Color === Player.Black ? 'black' : settings.player1Color === Player.White ? 'white' : 'random'} 
                            onChange={e => {
                                if (e.target.value === 'black') {
                                    handleSettingChange('player1Color', Player.Black);
                                } else if (e.target.value === 'white') {
                                    handleSettingChange('player1Color', Player.White);
                                } else {
                                    handleSettingChange('player1Color', undefined);
                                }
                            }}
                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                        >
                            <option value="random">랜덤</option>
                            <option value="black">{selectedGameMode === GameMode.Dice ? '선공' : '선공 (흑)'}</option>
                            <option value="white">{selectedGameMode === GameMode.Dice ? '후공' : '후공 (백)'}</option>
                        </select>
                    </div>
                )}

                {showThiefSettings && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">역할</label>
                        <select 
                            value={settings.player1Color === Player.Black ? 'thief' : settings.player1Color === Player.White ? 'police' : 'random'} 
                            onChange={e => {
                                if (e.target.value === 'thief') {
                                    handleSettingChange('player1Color', Player.Black);
                                } else if (e.target.value === 'police') {
                                    handleSettingChange('player1Color', Player.White);
                                } else {
                                    handleSettingChange('player1Color', undefined);
                                }
                            }}
                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                        >
                            <option value="random">랜덤</option>
                            <option value="thief">도둑 (흑)</option>
                            <option value="police">경찰 (백)</option>
                        </select>
                    </div>
                )}

                {showBaseStones && (
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
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
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">히든아이템</label>
                            <select 
                                value={settings.hiddenStoneCount} 
                                onChange={e => handleSettingChange('hiddenStoneCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {HIDDEN_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
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
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                        <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">미사일 개수</label>
                        <select 
                            value={settings.missileCount || 3} 
                            onChange={e => handleSettingChange('missileCount', parseInt(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                        >
                            {MISSILE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                        </select>
                    </div>
                )}

                {showDiceGoSettings && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드 설정</label>
                            <select 
                                value={settings.diceGoRounds ?? 3} 
                                onChange={e => handleSettingChange('diceGoRounds', parseInt(e.target.value, 10) as 1 | 2 | 3)}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {[1, 2, 3].map(r => <option key={r} value={r}>{r}라운드</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">아이템 개수</label>
                            <select 
                                value={settings.diceGoItemCount || 2} 
                                onChange={e => handleSettingChange('diceGoItemCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {DICE_GO_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                    </>
                )}

                {showAlkkagiSettings && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">돌 개수</label>
                            <select 
                                value={settings.alkkagiStoneCount ?? 5} 
                                onChange={e => handleSettingChange('alkkagiStoneCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {ALKKAGI_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드</label>
                            <select 
                                value={settings.alkkagiRounds ?? 3} 
                                onChange={e => handleSettingChange('alkkagiRounds', parseInt(e.target.value) as 1 | 2 | 3)}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {ALKKAGI_ROUNDS.map(r => <option key={r} value={r}>{r}라운드</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">배치 방식</label>
                            <select 
                                value={settings.alkkagiPlacementType ?? AlkkagiPlacementType.TurnByTurn} 
                                onChange={e => handleSettingChange('alkkagiPlacementType', e.target.value as AlkkagiPlacementType)}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {Object.values(AlkkagiPlacementType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">게이지 속도</label>
                            <select 
                                value={settings.alkkagiGaugeSpeed ?? 700} 
                                onChange={e => handleSettingChange('alkkagiGaugeSpeed', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {ALKKAGI_GAUGE_SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">아이템 개수</label>
                            <select 
                                value={settings.alkkagiItemCount ?? 2} 
                                onChange={e => handleSettingChange('alkkagiItemCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {ALKKAGI_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                    </>
                )}

                {showCurlingSettings && (
                    <>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">돌 개수</label>
                            <select 
                                value={settings.curlingStoneCount ?? 5} 
                                onChange={e => handleSettingChange('curlingStoneCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {CURLING_STONE_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">라운드</label>
                            <select 
                                value={settings.curlingRounds ?? 3} 
                                onChange={e => handleSettingChange('curlingRounds', parseInt(e.target.value) as 1 | 2 | 3)}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {CURLING_ROUNDS.map(r => <option key={r} value={r}>{r}라운드</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">게이지 속도</label>
                            <select 
                                value={settings.curlingGaugeSpeed ?? 700} 
                                onChange={e => handleSettingChange('curlingGaugeSpeed', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {CURLING_GAUGE_SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
                            <label className="font-semibold text-gray-300 text-xs lg:text-sm flex-shrink-0">슬로우 아이템</label>
                            <select 
                                value={settings.curlingSlowItemCount ?? 2} 
                                onChange={e => handleSettingChange('curlingSlowItemCount', parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 lg:p-2"
                            >
                                {CURLING_ITEM_COUNTS.map(c => <option key={c} value={c}>{c}개</option>)}
                            </select>
                        </div>
                        <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 items-center">
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
        <DraggableWindow title="AI와 대결하기" onClose={onClose} windowId="ai-challenge" initialWidth={calculatedWidth} initialHeight={calculatedHeight} isTopmost>
            <div className="flex h-full">
                {/* Left Panel: Game Selection */}
                <div className="w-1/3 bg-tertiary/30 p-4 flex flex-col text-on-panel rounded-l-lg border-r border-gray-700">
                    <h3 className="font-bold text-lg mb-3 text-purple-300">게임 종류 선택</h3>
                    <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto pr-2">
                        {availableGameModes.map((game) => (
                            <GameCard
                                key={game.mode}
                                mode={game.mode}
                                image={game.image}
                                onSelect={setSelectedGameMode}
                                isSelected={selectedGameMode === game.mode}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Panel: AI Profile and Game Settings */}
                <div className="w-2/3 bg-primary p-4 flex flex-col rounded-r-lg">
                    {/* AI Profile */}
                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-3 mb-4 flex-shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar userId={aiUserId} userName="AI" size={48} className="border-2 border-purple-500" />
                            <div>
                                <h3 className="font-bold text-lg text-purple-300">AI</h3>
                                <p className="text-sm text-gray-400">
                                    {selectedGameDefinition ? `${selectedGameDefinition.name}봇${lobbyType === 'strategic' ? '(카타고)' : ''}` : 'AI 봇'}
                                </p>
                            </div>
                        </div>
                        {selectedGameDefinition && (
                            <div className="border-t border-gray-700 pt-3 mt-3">
                                <h4 className="font-semibold text-gray-300 text-sm mb-2">게임 설명</h4>
                                <p className="text-xs text-tertiary leading-relaxed">
                                    {selectedGameDefinition.description || '선택된 게임에 대한 설명이 없습니다.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Game Settings */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <h4 className="font-semibold text-gray-300 text-sm mb-2 flex-shrink-0">대국 설정</h4>
                        {renderGameSettings()}
                    </div>

                    {/* Bottom Buttons */}
                    <div className="border-t border-gray-700 flex justify-end gap-2 mt-4 pt-4 flex-shrink-0">
                        <Button onClick={onClose} colorScheme="gray">취소</Button>
                        <Button onClick={handleChallenge} colorScheme="purple" disabled={!selectedGameMode}>
                            시작
                        </Button>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default AiChallengeModal;
