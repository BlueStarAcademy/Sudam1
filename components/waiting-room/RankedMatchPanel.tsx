import React, { useState, useEffect, useMemo } from 'react';
import { GameMode, ServerAction, UserWithStatus } from '../../types.js';
import Button from '../Button.js';
import RankedMatchSelectionModal from './RankedMatchSelectionModal.js';

interface RankedMatchPanelProps {
    lobbyType: 'strategic' | 'playful';
    currentUser: UserWithStatus;
    onAction: (action: ServerAction) => Promise<any>;
    isMatching?: boolean;
    matchingStartTime?: number;
    onCancelMatching?: () => void;
    onMatchingStateChange?: (isMatching: boolean, startTime: number) => void;
}

const RankedMatchPanel: React.FC<RankedMatchPanelProps> = ({ 
    lobbyType, 
    currentUser, 
    onAction,
    isMatching = false,
    matchingStartTime = 0,
    onCancelMatching,
    onMatchingStateChange
}) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 매칭 중일 때 경과 시간 업데이트
    useEffect(() => {
        if (!isMatching || !matchingStartTime) {
            setElapsedTime(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - matchingStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isMatching, matchingStartTime]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartMatching = async (selectedModes: GameMode[]) => {
        try {
            const result: any = await onAction({
                type: 'START_RANKED_MATCHING',
                payload: { lobbyType, selectedModes }
            });
            setIsModalOpen(false);
            
            // HTTP 응답에서 매칭 정보 확인하여 즉시 상태 업데이트
            // handleAction은 result 객체를 반환하거나, clientResponse를 포함할 수 있음
            const matchingInfo = result?.matchingInfo || result?.clientResponse?.matchingInfo;
            if (matchingInfo && onMatchingStateChange) {
                console.log('[RankedMatchPanel] Matching started, updating state:', matchingInfo);
                onMatchingStateChange(true, matchingInfo.startTime || Date.now());
            } else {
                // 매칭 정보가 없으면 현재 시간을 시작 시간으로 사용 (WebSocket 메시지 대기)
                console.log('[RankedMatchPanel] No matchingInfo in response, using current time');
                if (onMatchingStateChange) {
                    onMatchingStateChange(true, Date.now());
                }
            }
        } catch (error) {
            console.error('Failed to start ranked matching:', error);
        }
    };

    const handleCancelMatching = async () => {
        try {
            await onAction({ type: 'CANCEL_RANKED_MATCHING' });
            if (onMatchingStateChange) {
                onMatchingStateChange(false, 0);
            }
            if (onCancelMatching) {
                onCancelMatching();
            }
        } catch (error) {
            console.error('Failed to cancel ranked matching:', error);
        }
    };

    return (
        <>
            <div className="p-3 flex flex-col gap-3 min-h-0 text-on-panel">
                <h2 className="text-xl font-semibold mb-2 border-b border-color pb-2 flex-shrink-0">
                    랭킹전
                </h2>
                
                {!isMatching ? (
                    <>
                        <p className="text-sm text-tertiary mb-2">
                            자동 매칭으로 랭킹 점수가 변동되는 경기를 진행합니다.
                        </p>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            colorScheme="green"
                            className="w-full !py-2 !text-sm font-bold"
                        >
                            랭킹전 시작
                        </Button>
                    </>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-center mb-3">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <span className="ml-3 text-lg font-bold text-yellow-300">매칭 중...</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-yellow-200">대기 시간</span>
                                <span className="text-lg text-yellow-300 font-mono font-bold">{formatTime(elapsedTime)}</span>
                            </div>
                        </div>
                        <Button
                            onClick={handleCancelMatching}
                            colorScheme="red"
                            className="w-full !py-2 !text-sm font-bold"
                        >
                            매칭 취소
                        </Button>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <RankedMatchSelectionModal
                    lobbyType={lobbyType}
                    onClose={() => setIsModalOpen(false)}
                    onStartMatching={handleStartMatching}
                />
            )}
        </>
    );
};

export default RankedMatchPanel;

