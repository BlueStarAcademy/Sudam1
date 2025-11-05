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

    return (
        <div className="bg-panel rounded-lg shadow-lg p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold text-on-panel mb-4 border-b border-color pb-2">
                {selectedClass === SinglePlayerLevel.입문 ? '입문반' :
                 selectedClass === SinglePlayerLevel.초급 ? '초급반' :
                 selectedClass === SinglePlayerLevel.중급 ? '중급반' :
                 selectedClass === SinglePlayerLevel.고급 ? '고급반' : '유단자'} 스테이지
            </h2>
            
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-4 lg:grid-cols-5 gap-3">
                    {stages.map((stage, index) => {
                        const isCleared = isStageCleared(stage.id);
                        const isLocked = isStageLocked(index);
                        const stageNumber = parseInt(stage.id.split('-')[1]);

                        return (
                            <div
                                key={stage.id}
                                className={`
                                    relative bg-tertiary rounded-lg p-3 flex flex-col items-center justify-between
                                    transition-all duration-200 min-h-[120px]
                                    ${isLocked 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : isCleared
                                        ? 'ring-2 ring-green-500 cursor-pointer hover:shadow-lg'
                                        : 'cursor-pointer hover:shadow-lg hover:scale-105'
                                    }
                                `}
                                onClick={() => !isLocked && handleStageEnter(stage.id)}
                            >
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
                                        <span className="text-white font-bold text-xs">🔒</span>
                                    </div>
                                )}
                                
                                {isCleared && (
                                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}

                                <div className="text-center w-full">
                                    <div className="text-2xl font-bold text-primary mb-1">
                                        {stageNumber}
                                    </div>
                                    <div className="text-xs text-on-panel mb-2">
                                        {stage.name}
                                    </div>
                                </div>

                                <div className="w-full space-y-1 text-xs text-on-panel">
                                    <div className="flex justify-between">
                                        <span>AP:</span>
                                        <span className="font-bold">{stage.actionPointCost}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>보드:</span>
                                        <span className="font-bold">{stage.boardSize}×{stage.boardSize}</span>
                                    </div>
                                    {isCleared && (
                                        <div className="text-green-400 text-xs mt-1">
                                            클리어 완료
                                        </div>
                                    )}
                                </div>

                                {!isLocked && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStageEnter(stage.id);
                                        }}
                                        colorScheme="blue"
                                        className="w-full mt-2 !text-xs !py-1"
                                        disabled={currentUser.actionPoints.current < stage.actionPointCost}
                                    >
                                        입장
                                    </Button>
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

