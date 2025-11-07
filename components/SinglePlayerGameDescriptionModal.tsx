import React from 'react';
import { LiveGameSession, SinglePlayerStageInfo } from '../types.js';
import { SINGLE_PLAYER_STAGES } from '../constants/singlePlayerConstants.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants/gameModes.js';
import { GameMode } from '../types/enums.js';
import Button from './Button.js';

interface SinglePlayerGameDescriptionModalProps {
    session: LiveGameSession;
    onStart: () => void;
    onClose?: () => void;
}

const SinglePlayerGameDescriptionModal: React.FC<SinglePlayerGameDescriptionModalProps> = ({ session, onStart, onClose }) => {
    const stage = SINGLE_PLAYER_STAGES.find(s => s.id === session.stageId);
    
    if (!stage) {
        return null;
    }

    // 게임 모드 이름 찾기
    const getGameModeName = (mode: GameMode): string => {
        const specialMode = SPECIAL_GAME_MODES.find(m => m.mode === mode);
        if (specialMode) return specialMode.name;
        
        const playfulMode = PLAYFUL_GAME_MODES.find(m => m.mode === mode);
        if (playfulMode) return playfulMode.name;
        
        return mode;
    };

    const gameModeName = getGameModeName(session.mode);
    
    // 문양돌 개수 확인
    const blackPatternCount = stage.placements.blackPattern || 0;
    const whitePatternCount = stage.placements.whitePattern || 0;
    const hasPatternStones = blackPatternCount > 0 || whitePatternCount > 0;
    
    // 승리 목표 설명
    const getWinCondition = (): string => {
        // 살리기 바둑 모드
        if (session.settings.isSurvivalMode) {
            return `흑(유저)이 ${session.settings.survivalTurns}턴 이내에 백(AI)의 돌을 ${stage.targetScore.black}개 이상 따내면 승리`;
        }
        
        // 따내기 바둑: 턴 제한과 목표 점수가 모두 있는 경우
        if (stage.blackTurnLimit && stage.targetScore.black > 0) {
            return `${stage.blackTurnLimit}턴 이내에 ${stage.targetScore.black}점 이상 획득하기`;
        }
        
        // 따내기 바둑: captureTarget만 있는 경우
        if (session.mode === GameMode.Capture && session.settings.captureTarget) {
            return `흑이 ${session.settings.captureTarget}개 이상의 돌을 따내면 승리`;
        }
        
        // 일반 계가 승리 조건
        if (stage.targetScore.black > 0 && stage.targetScore.white > 0) {
            return `계가 시 흑 ${stage.targetScore.black}집, 백 ${stage.targetScore.white}집 이상 확보`;
        }
        
        return '계가 시 더 많은 집을 확보한 플레이어 승리';
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-600">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-3">
                        {stage.name} - 게임 설명
                    </h2>
                    
                    <div className="space-y-4 text-white">
                        {/* 승리 목표 - 이미지와 함께 */}
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                <span>🎯</span>
                                <span>승리 목표</span>
                            </h3>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-gray-200 font-medium">{getWinCondition()}</p>
                            </div>
                        </div>

                        {/* 문양돌 설명 */}
                        {hasPatternStones && (
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2">문양돌</h3>
                                <div className="bg-gray-700/50 rounded-lg p-3 space-y-3">
                                    {/* 문양돌 이미지 및 설명 */}
                                    <div className="flex items-start gap-3">
                                        {/* 흑 문양돌 이미지 */}
                                        {blackPatternCount > 0 && (
                                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                                <div className="relative w-16 h-16">
                                                    <div className="w-16 h-16 rounded-full bg-black border-2 border-gray-400 flex items-center justify-center">
                                                        <img 
                                                            src="/images/single/BlackDouble.png" 
                                                            alt="흑 문양돌"
                                                            className="w-12 h-12 object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = '<span class="text-white text-xl">⭐</span>';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-300">흑 {blackPatternCount}개</span>
                                            </div>
                                        )}
                                        {/* 백 문양돌 이미지 */}
                                        {whitePatternCount > 0 && (
                                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                                <div className="relative w-16 h-16">
                                                    <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-400 flex items-center justify-center">
                                                        <img 
                                                            src="/images/single/WhiteDouble.png" 
                                                            alt="백 문양돌"
                                                            className="w-12 h-12 object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = '<span class="text-black text-xl">⭐</span>';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-300">백 {whitePatternCount}개</span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-gray-200 text-sm mb-2">
                                                문양돌을 따내면 <span className="text-green-400 font-bold">2점</span>을 획득합니다.
                                            </p>
                                            <p className="text-gray-300 text-xs">
                                                문양돌을 빼앗기면 상대방이 <span className="text-red-400 font-bold">2점</span>을 획득합니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 살리기 바둑 모드 */}
                        {session.settings.isSurvivalMode && session.settings.survivalTurns && (
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                    <span>⚔️</span>
                                    <span>특수 규칙</span>
                                </h3>
                                <div className="bg-gray-700/50 rounded-lg p-3">
                                    <p className="text-gray-200">
                                        AI(백)가 <span className="text-red-400 font-bold">{session.settings.survivalTurns}턴</span> 동안 살아남아야 합니다.
                                        <br />
                                        <span className="text-blue-400">유저(흑)는 이 시간 내에 AI의 돌을 잡아 승리해야 합니다.</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 턴 제한 */}
                        {stage.blackTurnLimit && (
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                    <span>⏱️</span>
                                    <span>턴 제한</span>
                                </h3>
                                <div className="bg-gray-700/50 rounded-lg p-3">
                                    <p className="text-gray-200">
                                        흑(유저)은 <span className="text-red-400 font-bold">{stage.blackTurnLimit}턴</span> 이내에 승리해야 합니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 자동 계가 */}
                        {stage.autoScoringTurns && stage.autoScoringTurns > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                    <span>⏰</span>
                                    <span>자동 계가</span>
                                </h3>
                                <div className="bg-gray-700/50 rounded-lg p-3">
                                    <p className="text-gray-200">
                                        <span className="text-blue-400 font-bold">{stage.autoScoringTurns}턴</span> 후 자동으로 계가가 진행됩니다.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
                        {onClose && (
                            <Button 
                                onClick={onClose} 
                                colorScheme="gray" 
                                className="flex-1"
                            >
                                취소
                            </Button>
                        )}
                        <Button 
                            onClick={onStart} 
                            colorScheme="accent" 
                            className="flex-1"
                        >
                            시작하기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SinglePlayerGameDescriptionModal;
