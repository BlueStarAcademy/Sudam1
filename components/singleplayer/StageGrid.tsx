import React, { useMemo } from 'react';
import { SinglePlayerLevel, UserWithStatus } from '../../types.js';
import { SINGLE_PLAYER_STAGES } from '../../constants/singlePlayerConstants.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';

interface StageGridProps {
    selectedClass: SinglePlayerLevel;
    currentUser: UserWithStatus;
}

const StageGrid: React.FC<StageGridProps> = ({ selectedClass, currentUser }) => {
    const { handlers } = useAppContext();

    // 선택된 단계의 스테이지들 필터링
    const stages = useMemo(() => {
        return SINGLE_PLAYER_STAGES
            .filter(stage => stage.level === selectedClass)
            .sort((a, b) => {
                // 스테이지 번호로 정렬 (예: 입문-1, 입문-2, ...)
                const aNum = parseInt(a.id.split('-')[1]);
                const bNum = parseInt(b.id.split('-')[1]);
                return aNum - bNum;
            });
    }, [selectedClass]);

    // 클리어한 스테이지 확인 (나중에 currentUser에서 가져올 수 있음)
    const clearedStages = useMemo(() => {
        return (currentUser as any).clearedSinglePlayerStages || [];
    }, [currentUser]);

    const handleStageEnter = (stageId: string) => {
        handlers.handleAction({
            type: 'START_SINGLE_PLAYER_GAME',
            payload: { stageId }
        });
    };

    const isStageCleared = (stageId: string) => {
        return clearedStages.includes(stageId);
    };

    const isStageLocked = (stageIndex: number) => {
        // 첫 번째 스테이지는 항상 열려있음
        if (stageIndex === 0) return false;
        // 이전 스테이지를 클리어했으면 열림
        const previousStage = stages[stageIndex - 1];
        return previousStage ? !isStageCleared(previousStage.id) : true;
    };

    // 스테이지의 게임 모드 이름 결정 (살리기 바둑과 따내기 바둑 구분)
    const getStageGameModeName = (stage: typeof stages[0]): string => {
        if (stage.hiddenCount !== undefined) {
            return '히든 바둑';
        } else if (stage.missileCount !== undefined) {
            return '미사일 바둑';
        } else if (stage.timeControl.type === 'fischer') {
            return '스피드 바둑';
        } else if (stage.survivalTurns !== undefined) {
            return '살리기 바둑';
        } else if (stage.blackTurnLimit !== undefined) {
            return '따내기 바둑';
        } else {
            return '정통 바둑';
        }
    };

    return (
        <div className="bg-panel rounded-lg shadow-lg p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold text-on-panel mb-4 border-b border-color pb-2">
                {selectedClass === SinglePlayerLevel.입문 ? '입문반' :
                 selectedClass === SinglePlayerLevel.초급 ? '초급반' :
                 selectedClass === SinglePlayerLevel.중급 ? '중급반' :
                 selectedClass === SinglePlayerLevel.고급 ? '고급반' : '유단자'} 스테이지
            </h2>
            
            <div className="flex-1 overflow-hidden">
                <div
                    className="grid gap-2 h-full"
                    style={{
                        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(4, minmax(0, 1fr))'
                    }}
                >
                    {stages.map((stage, index) => {
                        const isCleared = isStageCleared(stage.id);
                        const isLocked = isStageLocked(index);
                        const stageNumber = parseInt(stage.id.split('-')[1]);
                        const gameModeName = getStageGameModeName(stage);
                        const hasEnoughAP = currentUser.actionPoints.current >= stage.actionPointCost;

                        return (
                            <div
                                key={stage.id}
                                className={`
                                    relative bg-tertiary/90 rounded-lg border border-color/40 px-2.5 py-3 flex flex-col items-center justify-between min-h-0 min-w-0
                                    transition-transform duration-150
                                    ${isLocked 
                                        ? 'opacity-50 cursor-not-allowed'
                                        : isCleared
                                            ? 'cursor-pointer ring-1 ring-green-500/70 hover:scale-[1.02]'
                                            : 'cursor-pointer hover:scale-[1.03] hover:shadow-md'
                                    }
                                `}
                                onClick={() => !isLocked && handleStageEnter(stage.id)}
                            >
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center z-10">
                                        <span className="text-white font-bold text-lg">🔒</span>
                                    </div>
                                )}

                                {isCleared && (
                                    <div className="absolute top-1.5 right-1.5 bg-green-500/90 rounded-full w-5 h-5 flex items-center justify-center z-20 shadow text-[11px] font-bold text-white">
                                        ✓
                                    </div>
                                )}

                                <div className="text-center w-full mb-1">
                                    <div className="text-xl font-black text-primary drop-shadow">
                                        {stageNumber}
                                    </div>
                                </div>

                                <div className="w-full mb-1.5">
                                    <div className="bg-gray-700/60 rounded-md px-2 py-1 border border-gray-600/50">
                                        <div className="text-[11px] font-semibold text-center text-yellow-300 truncate">
                                            {gameModeName}
                                        </div>
                                    </div>
                                </div>

                                {isCleared && (
                                    <div className="text-green-400 text-[10px] font-semibold mb-1">
                                        클리어 완료
                                    </div>
                                )}

                                {!isLocked ? (
                                    <Button
                                        onClick={(e) => {
                                            e?.stopPropagation();
                                            handleStageEnter(stage.id);
                                        }}
                                        colorScheme="blue"
                                        className="w-full mt-auto !text-[10px] !py-1.5"
                                        disabled={!hasEnoughAP}
                                    >
                                        입장 (⚡{stage.actionPointCost})
                                    </Button>
                                ) : (
                                    <div className="mt-auto text-[10px] text-gray-400 text-center">
                                        이전 스테이지 클리어 필요
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StageGrid;

