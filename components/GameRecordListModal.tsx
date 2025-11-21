import React, { useState, useMemo } from 'react';
import { User, GameRecord, ServerAction, Player } from '../types.js';
import { SPECIAL_GAME_MODES } from '../constants/gameModes.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';

interface GameRecordListModalProps {
    currentUser: User;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    onViewRecord: (record: GameRecord) => void;
    isTopmost?: boolean;
}

const GameRecordListModal: React.FC<GameRecordListModalProps> = ({ currentUser, onClose, onAction, onViewRecord }) => {
    const records = currentUser.savedGameRecords || [];
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => b.date - a.date);
    }, [records]);

    const recentRecords = useMemo(() => {
        return sortedRecords.slice(0, 3);
    }, [sortedRecords]);

    const getGameModeName = (mode: string) => {
        const modeInfo = SPECIAL_GAME_MODES.find(m => m.mode === mode);
        return modeInfo ? modeInfo.name : mode;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const formatDateShort = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const getResultText = (record: GameRecord) => {
        const isPlayerBlack = record.gameResult.winner === Player.Black;
        const isPlayerWhite = record.gameResult.winner === Player.White;
        const isDraw = record.gameResult.winner === Player.None;
        
        // 현재 사용자가 흑인지 백인지 판단 (간단히 winner로 추정)
        // 실제로는 게임 기록에 playerColor 정보가 있어야 하지만, 여기서는 winner로 추정
        if (isDraw) return { text: '무승부', color: 'text-gray-400' };
        if (isPlayerBlack) return { text: '흑 승', color: 'text-blue-400' };
        return { text: '백 승', color: 'text-yellow-400' };
    };

    const handleDelete = async (recordId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (deletingId) return;
        if (!confirm('기보를 삭제하시겠습니까?')) return;
        
        setDeletingId(recordId);
        try {
            onAction({ type: 'DELETE_GAME_RECORD', payload: { recordId } });
        } catch (error) {
            console.error('Failed to delete record:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const RecordSlot: React.FC<{ record: GameRecord | null; index: number }> = ({ record, index }) => {
        if (!record) {
            return (
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg p-4 border-2 border-dashed border-gray-700/50 flex items-center justify-center min-h-[120px]">
                    <div className="text-gray-500 text-sm">빈 슬롯</div>
                </div>
            );
        }

        const result = getResultText(record);
        const isWin = record.gameResult.winner !== Player.None;

        return (
            <div
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg p-4 border-2 border-gray-700/70 hover:border-gray-600/90 transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => onViewRecord(record)}
            >
                {/* 배경 그라데이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                                    {record.opponent.nickname}
                                </div>
                                <div className={`px-2 py-0.5 rounded text-xs font-semibold ${result.color} bg-gray-800/50`}>
                                    {result.text}
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                                {getGameModeName(record.mode)}
                            </div>
                        </div>
                        <button
                            onClick={(e) => handleDelete(record.id, e)}
                            disabled={deletingId === record.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
                            title="삭제"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-900/50 rounded p-2">
                            <div className="text-gray-500 mb-1">점수</div>
                            <div className="text-white font-semibold">
                                흑 {record.gameResult.blackScore} : {record.gameResult.whiteScore} 백
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2">
                            <div className="text-gray-500 mb-1">날짜</div>
                            <div className="text-white font-semibold">
                                {formatDateShort(record.date)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DraggableWindow 
            title="기보 목록" 
            onClose={onClose} 
            initialWidth={1200}
            windowId="gameRecordList"
        >
            <div className="p-6 w-full overflow-x-auto">
                {/* 헤더 정보 */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-white">저장된 기보</div>
                        <div className="text-sm text-gray-400">
                            {records.length} / 30
                        </div>
                    </div>
                </div>

                {/* 최근 3개 슬롯 */}
                {sortedRecords.length > 0 && (
                    <div className="mb-6">
                        <div className="text-sm font-semibold text-gray-300 mb-3">최근 기보</div>
                        <div className="grid grid-cols-3 gap-4">
                            {[0, 1, 2].map((index) => (
                                <RecordSlot key={index} record={recentRecords[index] || null} index={index} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 전체 목록 테이블 */}
                <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-300 mb-3">전체 기보 목록</div>
                    
                    {sortedRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700/50">
                            <div className="text-lg mb-2">저장된 기보가 없습니다</div>
                            <div className="text-sm">게임 종료 후 기보 저장 버튼을 눌러 기보를 저장하세요</div>
                        </div>
                    ) : (
                        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-900/50 border-b border-gray-700/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">상대 대국자</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">게임 모드</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">결과</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">점수</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">날짜</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30">
                                    {sortedRecords.map((record, index) => {
                                        const result = getResultText(record);
                                        return (
                                            <tr
                                                key={record.id}
                                                className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                                                onClick={() => onViewRecord(record)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-semibold text-white">
                                                        {record.opponent.nickname}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300">
                                                        {getGameModeName(record.mode)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={`text-sm font-semibold ${result.color}`}>
                                                        {result.text}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-300">
                                                        <span className="text-blue-400">흑 {record.gameResult.blackScore}</span>
                                                        <span className="mx-2 text-gray-500">:</span>
                                                        <span className="text-yellow-400">백 {record.gameResult.whiteScore}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-400">
                                                        {formatDate(record.date)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onViewRecord(record);
                                                            }}
                                                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            보기
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => handleDelete(record.id, e)}
                                                            disabled={deletingId === record.id}
                                                            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            {deletingId === record.id ? '삭제 중...' : '삭제'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose} className="px-6 py-2">
                        닫기
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GameRecordListModal;

