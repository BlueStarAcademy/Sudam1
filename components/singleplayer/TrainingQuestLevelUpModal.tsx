import React, { useState, useEffect } from 'react';
import { SinglePlayerMissionInfo } from '../../types.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';

interface TrainingQuestLevelUpModalProps {
    mission: SinglePlayerMissionInfo;
    currentLevel: number;
    upgradeCost: number;
    canLevelUp: boolean;
    nextLevelUnlockStage?: string;
    currentUserGold: number;
    accumulatedCollection: number;
    requiredCollection: number;
    progressPercent: number;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

const TrainingQuestLevelUpModal: React.FC<TrainingQuestLevelUpModalProps> = ({
    mission,
    currentLevel,
    upgradeCost,
    canLevelUp,
    nextLevelUnlockStage,
    currentUserGold,
    accumulatedCollection,
    requiredCollection,
    progressPercent,
    onConfirm,
    onClose,
}) => {
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const [displayLevel, setDisplayLevel] = useState(currentLevel);
    const [showLevelUpEffect, setShowLevelUpEffect] = useState(false);

    const currentLevelInfo = currentLevel > 0 ? mission.levels[currentLevel - 1] : null;
    const nextLevelInfo = mission.levels && mission.levels[currentLevel];

    // currentLevel이 변경되면 애니메이션 트리거
    useEffect(() => {
        if (currentLevel > displayLevel) {
            setIsLevelingUp(true);
            setShowLevelUpEffect(true);
            
            // 레벨 카운트업 애니메이션
            const startLevel = displayLevel;
            const endLevel = currentLevel;
            const duration = 800; // 0.8초
            const steps = 20;
            const stepDuration = duration / steps;
            let step = 0;

            const interval = setInterval(() => {
                step++;
                const progress = step / steps;
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(startLevel + (endLevel - startLevel) * easeOutCubic);
                setDisplayLevel(current);

                if (step >= steps) {
                    clearInterval(interval);
                    setDisplayLevel(endLevel);
                    setTimeout(() => {
                        setIsLevelingUp(false);
                        setTimeout(() => setShowLevelUpEffect(false), 500);
                    }, 200);
                }
            }, stepDuration);

            return () => clearInterval(interval);
        } else if (currentLevel < displayLevel) {
            // 레벨이 내려간 경우 (리셋 등) 즉시 동기화
            setDisplayLevel(currentLevel);
        }
    }, [currentLevel, displayLevel]);

    if (!nextLevelInfo) {
        return null;
    }

    const hasEnoughGold = currentUserGold >= upgradeCost;
    const productionRateChange = currentLevelInfo ? (currentLevelInfo.productionRateMinutes - nextLevelInfo.productionRateMinutes) : 0;
    const rewardAmountChange = currentLevelInfo ? (nextLevelInfo.rewardAmount - currentLevelInfo.rewardAmount) : nextLevelInfo.rewardAmount;
    const maxCapacityChange = currentLevelInfo ? (nextLevelInfo.maxCapacity - currentLevelInfo.maxCapacity) : nextLevelInfo.maxCapacity;

    const normalizedRequired = Math.max(0, requiredCollection);
    const normalizedAccumulated = Math.max(0, accumulatedCollection);
    const xpPercent = normalizedRequired > 0
        ? Math.min(100, Math.round((normalizedAccumulated / normalizedRequired) * 100))
        : (canLevelUp ? 100 : Math.max(0, Math.round(progressPercent)));
    const xpReady = normalizedRequired === 0 || normalizedAccumulated >= normalizedRequired;
    const xpRemaining = xpReady ? 0 : Math.max(0, normalizedRequired - normalizedAccumulated);

    const handleEnhance = async () => {
        if (!canLevelUp || !hasEnoughGold) return;
        await onConfirm();
    };

    return (
        <DraggableWindow 
            title={`${mission.name} 강화`} 
            onClose={onClose} 
            windowId={`training-quest-levelup-${mission.id}`}
            initialWidth={540}
            initialHeight={620}
            isTopmost
        >
            <div className="h-full flex flex-col bg-[#080d1c] text-slate-200 rounded-xl">
                <div className="relative bg-gradient-to-r from-indigo-900/80 via-slate-900/90 to-slate-950/95 px-4 py-3.5 shadow-inner rounded-t-xl">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.45),transparent_65%)] pointer-events-none rounded-t-xl" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900/60 border border-indigo-400/40 flex items-center justify-center shadow-[0_0_20px_-8px_rgba(129,140,248,0.8)]">
                            {mission.image ? (
                                <img src={mission.image} alt={mission.name} className="w-full h-full object-contain p-2 drop-shadow-[0_8px_15px_rgba(79,70,229,0.5)]" />
                            ) : (
                                <span className="text-3xl">📜</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white drop-shadow-[0_4px_15px_rgba(79,70,229,0.5)]">{mission.name}</h2>
                            <div className="mt-1 flex items-baseline gap-2 relative">
                                <span
                                    className={`text-sm font-semibold transition-all duration-300 ${
                                        isLevelingUp 
                                            ? 'text-green-400 scale-125 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]' 
                                            : showLevelUpEffect
                                                ? 'text-emerald-300 scale-110'
                                                : 'text-indigo-100/80'
                                    }`}
                                >
                                    Lv.{displayLevel}
                                </span>
                                {showLevelUpEffect && (
                                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
                                )}
                                {!isLevelingUp && displayLevel < currentLevel + 1 && (
                                    <span className="text-xs text-indigo-200/60">→ Lv.{currentLevel + 1}</span>
                                )}
                                {isLevelingUp && (
                                    <span className="text-xs text-green-300 animate-pulse">↑</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
                    <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-3 shadow-[0_18px_38px_-26px_rgba(16,185,129,0.65)]">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-emerald-200">{xpPercent}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-emerald-900/40 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-yellow-300 transition-all duration-300"
                                style={{ width: `${Math.min(100, xpPercent)}%` }}
                            />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-100/90">
                            <span>
                                {normalizedRequired > 0
                                    ? `${Math.min(normalizedAccumulated, normalizedRequired).toLocaleString()} / ${normalizedRequired.toLocaleString()}`
                                    : '요구 경험치 없음'}
                            </span>
                            <span>
                                {xpReady ? '강화 준비 완료' : `남은 경험치 ${xpRemaining.toLocaleString()}`}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-indigo-400/30 bg-slate-900/60 p-3.5 shadow-[0_20px_40px_-30px_rgba(99,102,241,0.8)]">
                            <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-200/70 mb-2">현재 레벨</p>
                            {currentLevelInfo ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300/90 flex items-center gap-1.5">
                                            <img src="/images/icon/timer.png" alt="생산 속도" className="w-4 h-4" />
                                            생산 속도
                                        </span>
                                        <span className="font-semibold text-indigo-100">{currentLevelInfo.productionRateMinutes}분</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300/90 flex items-center gap-1.5">
                                            <img src={mission.rewardType === 'gold' ? '/images/icon/Gold.png' : '/images/icon/Zem.png'} alt="보상" className="w-4 h-4" />
                                            생산량
                                        </span>
                                        <span className="font-semibold text-indigo-100">{currentLevelInfo.rewardAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300/90 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-purple-500/50 flex items-center justify-center text-[10px] font-bold text-purple-100">MAX</span>
                                            최대 저장량
                                        </span>
                                        <span className="font-semibold text-indigo-100">{currentLevelInfo.maxCapacity.toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400/80 italic">시작 전 상태입니다.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-cyan-400/40 bg-slate-900/60 p-3.5 shadow-[0_20px_40px_-30px_rgba(34,211,238,0.8)]">
                            <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-200/70 mb-2">다음 레벨</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300/90 flex items-center gap-1.5">
                                        <img src="/images/icon/timer.png" alt="생산 속도" className="w-4 h-4" />
                                        생산 속도
                                    </span>
                                    <span className="font-semibold text-cyan-100 flex items-center gap-1.5">
                                        {nextLevelInfo.productionRateMinutes}분
                                        {productionRateChange !== 0 && (
                                            <span className="text-emerald-300 text-xs">
                                                {productionRateChange > 0 ? `-${productionRateChange.toFixed(1)}` : `+${Math.abs(productionRateChange).toFixed(1)}`}분
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300/90 flex items-center gap-1.5">
                                        <img src={mission.rewardType === 'gold' ? '/images/icon/Gold.png' : '/images/icon/Zem.png'} alt="보상" className="w-4 h-4" />
                                        생산량
                                    </span>
                                    <span className="font-semibold text-cyan-100 flex items-center gap-1.5">
                                        {nextLevelInfo.rewardAmount.toLocaleString()}
                                        {rewardAmountChange !== 0 && (
                                            <span className="text-emerald-300 text-xs">
                                                {rewardAmountChange > 0 ? `+${rewardAmountChange}` : rewardAmountChange}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300/90 flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full bg-purple-500/50 flex items-center justify-center text-[10px] font-bold text-purple-100">MAX</span>
                                        최대 저장량
                                    </span>
                                    <span className="font-semibold text-cyan-100 flex items-center gap-1.5">
                                        {nextLevelInfo.maxCapacity.toLocaleString()}
                                        {maxCapacityChange !== 0 && (
                                            <span className="text-emerald-300 text-xs">
                                                {maxCapacityChange > 0 ? `+${maxCapacityChange}` : maxCapacityChange}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {nextLevelUnlockStage && (
                        <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-3.5 py-2.5 text-sm text-yellow-100 flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            <span>{nextLevelUnlockStage} 스테이지를 클리어해야 합니다.</span>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-slate-700/70 bg-slate-950/40 flex gap-3 rounded-b-xl">
                    <Button 
                        onClick={onClose} 
                        colorScheme="none"
                        className="flex-1 rounded-lg border border-slate-600/60 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70"
                    >
                        취소
                    </Button>
                    <Button 
                        onClick={handleEnhance} 
                        colorScheme="none"
                        className={`flex-1 justify-center rounded-lg border border-indigo-400/70 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-[0_18px_40px_-18px_rgba(99,102,241,0.9)] hover:from-indigo-400 hover:to-cyan-400 ${(!canLevelUp || !hasEnoughGold) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!canLevelUp || !hasEnoughGold}
                    >
                        {!canLevelUp
                            ? '강화 조건 미충족'
                            : !hasEnoughGold
                                ? '골드 부족'
                                : (
                                    <span className="flex items-center gap-2 font-semibold tracking-wide">
                                        <img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4 drop-shadow" />
                                        <span>{upgradeCost.toLocaleString()}</span>
                                        <span>강화하기</span>
                                    </span>
                                )}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default TrainingQuestLevelUpModal;
