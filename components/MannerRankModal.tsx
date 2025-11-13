import React, { useMemo } from 'react';
import { User } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import { getMannerScore, getMannerRank, getMannerStyle, MANNER_RANKS } from '../services/manner.js';
import { getMannerEffects } from '../services/effectService.js';

interface MannerRankModalProps {
    user: User;
    onClose: () => void;
    isTopmost?: boolean;
}

const MannerRankModal: React.FC<MannerRankModalProps> = ({ user, onClose, isTopmost }) => {
    const totalMannerScore = getMannerScore(user);
    const mannerRank = getMannerRank(totalMannerScore);
    const mannerStyle = getMannerStyle(totalMannerScore);
    const currentEffects = getMannerEffects(user);

    // 현재 등급 정보
    const currentRankInfo = useMemo(() => {
        return MANNER_RANKS.find(rank => totalMannerScore >= rank.min && totalMannerScore <= rank.max) || MANNER_RANKS[0];
    }, [totalMannerScore]);

    // 다음 등급 정보
    const nextRankInfo = useMemo(() => {
        const currentIndex = MANNER_RANKS.findIndex(rank => rank.name === currentRankInfo.name);
        if (currentIndex < MANNER_RANKS.length - 1) {
            return MANNER_RANKS[currentIndex + 1];
        }
        return null;
    }, [currentRankInfo]);


    // 현재 적용 중인 효과 요약
    const activeEffects = useMemo(() => {
        const active: string[] = [];

        if (currentEffects.maxActionPoints > 30) {
            active.push(`최대 행동력: ${currentEffects.maxActionPoints} (기본 30 + ${currentEffects.maxActionPoints - 30})`);
        } else if (currentEffects.maxActionPoints < 30) {
            active.push(`최대 행동력: ${currentEffects.maxActionPoints} (기본 30 ${currentEffects.maxActionPoints - 30})`);
        }

        if (currentEffects.winGoldBonusPercent > 0) {
            active.push(`승리 골드 보너스: +${currentEffects.winGoldBonusPercent}%`);
        }

        if (currentEffects.winDropBonusPercent > 0) {
            active.push(`승리 드롭 보너스: +${currentEffects.winDropBonusPercent}%`);
        }

        if (currentEffects.disassemblyJackpotBonusPercent > 0) {
            active.push(`분해 잭팟 보너스: +${currentEffects.disassemblyJackpotBonusPercent}%`);
        }

        if (currentEffects.allStatsFlatBonus > 0) {
            active.push(`모든 능력치 보너스: +${currentEffects.allStatsFlatBonus}`);
        }

        if (currentEffects.goldRewardMultiplier < 1) {
            active.push(`골드 보상: ${Math.round(currentEffects.goldRewardMultiplier * 100)}%`);
        }

        if (currentEffects.dropChanceMultiplier < 1) {
            active.push(`드롭 확률: ${Math.round(currentEffects.dropChanceMultiplier * 100)}%`);
        }

        if (currentEffects.actionPointRegenInterval > 300000) { // 5분보다 길면
            const minutes = Math.round(currentEffects.actionPointRegenInterval / 60000);
            active.push(`행동력 재생 간격: ${minutes}분`);
        }

        return active;
    }, [currentEffects]);

    return (
        <DraggableWindow title="매너 등급 정보" onClose={onClose} windowId="manner-rank" initialWidth={600} isTopmost={isTopmost}>
            <div className="flex flex-col gap-4 p-4">
                {/* 현재 등급 정보 */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-200">현재 등급</h3>
                        <span className={`text-xl font-bold ${mannerRank.color}`}>{mannerRank.rank}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">매너 점수</span>
                        <span className="text-gray-200 font-semibold">{totalMannerScore}점</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                        <div className={`${mannerStyle.colorClass} h-full rounded-full transition-all`} style={{ width: `${mannerStyle.percentage}%` }}></div>
                    </div>
                    {nextRankInfo && (
                        <div className="text-sm text-gray-400">
                            다음 등급까지: <span className="text-gray-200 font-semibold">{nextRankInfo.min - totalMannerScore}점</span>
                        </div>
                    )}
                </div>

                {/* 등급별 효과 정보 */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-lg font-bold text-gray-200 mb-3">등급별 효과</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-3 pb-4">
                        {MANNER_RANKS.slice().reverse().map((rank, index) => {
                            const isActive = totalMannerScore >= rank.min && totalMannerScore <= rank.max;
                            const rankColor = getMannerRank(rank.min === 0 ? 0 : rank.min).color;
                            const effects: string[] = [];
                            
                            // 긍정 효과 (누적)
                            if (rank.min >= 2000) {
                                effects.push('모든 능력치 +10');
                            }
                            if (rank.min >= 1600) {
                                effects.push('분해 잭팟 보너스 +20%');
                            }
                            if (rank.min >= 1200) {
                                effects.push('승리 드롭 보너스 +20%');
                            }
                            if (rank.min >= 800) {
                                effects.push('승리 골드 보너스 +20%');
                            }
                            if (rank.min >= 400) {
                                effects.push('최대 행동력 +10');
                            }
                            
                            // 부정 효과
                            if (rank.max <= 0) {
                                effects.push('최대 행동력 -20');
                            }
                            if (rank.max <= 49 && rank.max > 0) {
                                effects.push('행동력 재생 간격 최소 20분');
                            }
                            if (rank.max <= 99 && rank.max > 0) {
                                effects.push('골드 보상 50% 감소');
                            }
                            if (rank.max <= 199 && rank.max > 0) {
                                effects.push('드롭 확률 50% 감소');
                            }
                            
                            // 기본 등급
                            if (rank.min >= 200 && rank.max <= 399) {
                                effects.push('기본 효과 (효과 없음)');
                            }
                            
                            return (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${isActive ? 'border-amber-400 bg-amber-900/20' : 'border-gray-700 bg-gray-900/30'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${rankColor}`}>{rank.name}</span>
                                            {isActive && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded">
                                                    나의 등급
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {rank.min === 0 && rank.max === 0 ? '0점' : 
                                             rank.max === Infinity ? `${rank.min}점 이상` : 
                                             `${rank.min}~${rank.max}점`}
                                        </span>
                                    </div>
                                    {effects.length > 0 && (
                                        <div className="text-sm text-gray-300 space-y-1">
                                            {effects.map((effect, i) => (
                                                <div key={i}>• {effect}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 설명 */}
                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-700/50">
                    <p className="text-sm text-blue-200">
                        매너 점수는 모든 게임 모드에서 통합 관리됩니다. '보통' 등급(200점)을 기준으로, 매너 플레이 시 점수가 오르고 비매너 행동(접속 종료, 시간 초과 등) 시 점수가 하락합니다. 등급이 오를수록 좋은 효과가 누적되며, 등급이 내려가면 나쁜 효과가 단계별로 쌓입니다. 다시 등급을 올리면 가장 최근에 쌓인 페널티부터 하나씩 제거됩니다.
                    </p>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MannerRankModal;

