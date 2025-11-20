import React, { useState } from 'react';
import { GameRecord } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import SgfViewer from './SgfViewer.js';

interface GameRecordViewerModalProps {
    record: GameRecord;
    onClose: () => void;
    isTopmost?: boolean;
}

const GameRecordViewerModal: React.FC<GameRecordViewerModalProps> = ({ record, onClose }) => {
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    
    // SGF에서 총 수순 계산 (간단한 추정)
    const totalMoves = (record.sgfContent.match(/;([BW])\[/g) || []).length;
    const canGoBack = currentMoveIndex > 0;
    const canGoForward = currentMoveIndex < totalMoves;
    
    const handlePrevious = () => {
        if (canGoBack) {
            setCurrentMoveIndex(prev => prev - 1);
        }
    };
    
    const handleNext = () => {
        if (canGoForward) {
            setCurrentMoveIndex(prev => prev + 1);
        }
    };
    
    const handleFirst = () => {
        setCurrentMoveIndex(0);
    };
    
    const handleLast = () => {
        setCurrentMoveIndex(totalMoves);
    };

    const scoreDetails = record.gameResult.scoreDetails;
    
    return (
        <DraggableWindow 
            title={`기보 보기 - ${record.opponent.nickname}`} 
            onClose={onClose} 
            initialPosition={{ x: 50, y: 50 }}
            initialWidth={1000}
            windowId="gameRecordViewer"
        >
            <div className="p-4 w-full overflow-x-auto">
                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm font-semibold mb-2">게임 정보</div>
                        <div className="text-xs text-gray-400 space-y-1">
                            <div>상대: {record.opponent.nickname}</div>
                            <div>모드: {record.mode}</div>
                            <div>날짜: {new Date(record.date).toLocaleString('ko-KR')}</div>
                            <div>결과: {record.gameResult.winner === Player.Black ? '흑 승' : record.gameResult.winner === Player.White ? '백 승' : '무승부'}</div>
                        </div>
                    </div>
                    
                    {scoreDetails && (
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="text-sm font-semibold mb-2">점수 상세</div>
                            <div className="text-xs text-gray-400 space-y-1">
                                <div>흑: {record.gameResult.blackScore}점</div>
                                {scoreDetails.black.timeBonus > 0 && (
                                    <div className="text-yellow-400">  시간보너스: +{scoreDetails.black.timeBonus}점</div>
                                )}
                                {scoreDetails.black.baseStoneBonus > 0 && (
                                    <div className="text-blue-400">  베이스보너스: +{scoreDetails.black.baseStoneBonus}점</div>
                                )}
                                {scoreDetails.black.hiddenStoneBonus > 0 && (
                                    <div className="text-purple-400">  히든보너스: +{scoreDetails.black.hiddenStoneBonus}점</div>
                                )}
                                {scoreDetails.black.itemBonus > 0 && (
                                    <div className="text-green-400">  아이템보너스: +{scoreDetails.black.itemBonus}점</div>
                                )}
                                <div className="mt-2">백: {record.gameResult.whiteScore}점</div>
                                {scoreDetails.white.timeBonus > 0 && (
                                    <div className="text-yellow-400">  시간보너스: +{scoreDetails.white.timeBonus}점</div>
                                )}
                                {scoreDetails.white.baseStoneBonus > 0 && (
                                    <div className="text-blue-400">  베이스보너스: +{scoreDetails.white.baseStoneBonus}점</div>
                                )}
                                {scoreDetails.white.hiddenStoneBonus > 0 && (
                                    <div className="text-purple-400">  히든보너스: +{scoreDetails.white.hiddenStoneBonus}점</div>
                                )}
                                {scoreDetails.white.itemBonus > 0 && (
                                    <div className="text-green-400">  아이템보너스: +{scoreDetails.white.itemBonus}점</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mb-4">
                    <div className="bg-gray-900 rounded-lg p-4" style={{ minHeight: '400px' }}>
                        <SgfViewer 
                            timeElapsed={currentMoveIndex}
                            fileIndex={null}
                            showLastMoveOnly={false}
                            sgfContent={record.sgfContent}
                        />
                    </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-400">
                        수순: {currentMoveIndex} / {totalMoves}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleFirst} disabled={!canGoBack} className="px-3 py-1 text-xs">
                            처음
                        </Button>
                        <Button onClick={handlePrevious} disabled={!canGoBack} className="px-3 py-1 text-xs">
                            이전
                        </Button>
                        <Button onClick={handleNext} disabled={!canGoForward} className="px-3 py-1 text-xs">
                            다음
                        </Button>
                        <Button onClick={handleLast} disabled={!canGoForward} className="px-3 py-1 text-xs">
                            마지막
                        </Button>
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <Button onClick={onClose} className="px-4 py-2">
                        닫기
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GameRecordViewerModal;

