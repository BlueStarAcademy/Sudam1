import React from 'react';
import DraggableWindow from '../DraggableWindow.js';
import { AnalysisResult, LiveGameSession, GameMode } from '../../types.js';

interface WindowProps {
    session: LiveGameSession;
    result: AnalysisResult;
    onClose: () => void;
}

const coordToStr = (x: number, y: number, boardSize: number) => {
    const letters = "ABCDEFGHJKLMNOPQRST";
    if (x >= 0 && x < letters.length) {
        return `${letters[x]}${boardSize - y}`;
    }
    return `${x},${y}`;
};

export const TerritoryAnalysisWindow: React.FC<WindowProps> = ({ session, result, onClose }) => {
    if (!result || !result.scoreDetails || !result.areaScore) {
        return (
            <DraggableWindow title="형세분석" onClose={onClose} initialWidth={380} windowId="analysis-territory" modal={false}>
                <p className="text-center text-gray-400">분석 데이터를 불러오는 중입니다...</p>
            </DraggableWindow>
        );
    }

    const { scoreDetails, winRateChange, scoreLead } = result;
    const { mode, settings } = session;
    const scoreDiff = scoreLead ?? (result.areaScore.black - result.areaScore.white);
    const leadPlayer = scoreDiff > 0 ? '흑' : '백';
    const leadAmount = Math.abs(scoreDiff).toFixed(1);
    const blackWinRate = result.winRateBlack;
    const whiteWinRate = 100 - blackWinRate;

    const blackColorIntensity = `rgba(220, 38, 38, ${Math.max(0, (blackWinRate - 50) / 50 * 0.7)})`;
    const whiteColorIntensity = `rgba(59, 130, 246, ${Math.max(0, (whiteWinRate - 50) / 50 * 0.7)})`;

    const isSpeedMode = mode === GameMode.Speed || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Speed));
    const isBaseMode = mode === GameMode.Base || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Base));
    const isHiddenMode = mode === GameMode.Hidden || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Hidden));
    
    return (
        <DraggableWindow title="형세분석" onClose={onClose} initialWidth={380} windowId="analysis-territory" modal={false}>
             <div className="text-sm text-white">
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between mb-1 text-xs">
                            <span className="font-semibold text-gray-300">흑 {blackWinRate.toFixed(1)}%</span>
                            {winRateChange !== undefined && (
                                <span className={`font-bold text-xs ${winRateChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {winRateChange > 0 ? '▲' : '▼'} {Math.abs(winRateChange).toFixed(1)}%
                                </span>
                            )}
                            <span className="font-semibold text-gray-300">백 {whiteWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex w-full h-4 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-900">
                            <div className="bg-black relative" style={{ width: `${blackWinRate}%` }}>
                                <div className="absolute inset-0" style={{ backgroundColor: blackColorIntensity }}></div>
                            </div>
                            <div className="bg-white relative" style={{ width: `${whiteWinRate}%` }}>
                                 <div className="absolute inset-0" style={{ backgroundColor: whiteColorIntensity }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between pt-1">
                        <span className="font-medium text-gray-300">예상 집 차이</span>
                        <span className="font-mono font-bold text-yellow-300">{leadPlayer} {leadAmount}집 우세</span>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg my-2 text-xs">
                        <div className="grid grid-cols-2 gap-x-4">
                            {/* Black Column */}
                            <div className="space-y-1">
                                <h4 className="font-bold text-center border-b border-gray-600 pb-1 mb-1">흑</h4>
                                <div className="flex justify-between"><span>영토:</span> <span className="font-mono">{scoreDetails.black.territory}</span></div>
                                <div className="flex justify-between"><span>따낸 돌:</span> <span className="font-mono">{scoreDetails.black.liveCaptures ?? 0}</span></div>
                                <div className="flex justify-between"><span>사석:</span> <span className="font-mono">{scoreDetails.black.deadStones ?? 0}</span></div>
                                {isBaseMode && <div className="flex justify-between"><span>베이스:</span> <span className="font-mono">{scoreDetails.black.baseStoneBonus}</span></div>}
                                {isHiddenMode && <div className="flex justify-between"><span>히든돌:</span> <span className="font-mono">{scoreDetails.black.hiddenStoneBonus}</span></div>}
                                {isSpeedMode && <div className="flex justify-between"><span>시간:</span> <span className="font-mono">{scoreDetails.black.timeBonus}</span></div>}
                                {scoreDetails.black.itemBonus > 0 && <div className="flex justify-between"><span>아이템:</span> <span className="font-mono">{scoreDetails.black.itemBonus}</span></div>}
                                <div className="flex justify-between border-t border-gray-500 mt-1 pt-1 font-bold"><span>총점:</span> <span className="font-mono">{result.areaScore.black.toFixed(1)}</span></div>
                            </div>
                            {/* White Column */}
                            <div className="space-y-1">
                                <h4 className="font-bold text-center border-b border-gray-600 pb-1 mb-1">백</h4>
                                <div className="flex justify-between"><span>영토:</span> <span className="font-mono">{scoreDetails.white.territory}</span></div>
                                <div className="flex justify-between"><span>따낸 돌:</span> <span className="font-mono">{scoreDetails.white.liveCaptures ?? 0}</span></div>
                                <div className="flex justify-between"><span>사석:</span> <span className="font-mono">{scoreDetails.white.deadStones ?? 0}</span></div>
                                <div className="flex justify-between"><span>덤:</span> <span className="font-mono">{scoreDetails.white.komi}</span></div>
                                {isBaseMode && <div className="flex justify-between"><span>베이스:</span> <span className="font-mono">{scoreDetails.white.baseStoneBonus}</span></div>}
                                {isHiddenMode && <div className="flex justify-between"><span>히든돌:</span> <span className="font-mono">{scoreDetails.white.hiddenStoneBonus}</span></div>}
                                {isSpeedMode && <div className="flex justify-between"><span>시간:</span> <span className="font-mono">{scoreDetails.white.timeBonus}</span></div>}
                                {scoreDetails.white.itemBonus > 0 && <div className="flex justify-between"><span>아이템:</span> <span className="font-mono">{scoreDetails.white.itemBonus}</span></div>}
                                <div className="flex justify-between border-t border-gray-500 mt-1 pt-1 font-bold"><span>총점:</span> <span className="font-mono">{result.areaScore.white.toFixed(1)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export const HintWindow: React.FC<WindowProps> = ({ session, result, onClose }) => {
    if (!result || !result.recommendedMoves) {
        return (
            <DraggableWindow title="AI 추천수" onClose={onClose} initialWidth={300} windowId="analysis-hint" modal={false}>
                <p className="text-center text-gray-400">추천수를 계산하는 중이거나, 추천수가 없습니다.</p>
            </DraggableWindow>
        );
    }
    
    const colors = ['border-blue-500', 'border-green-500', 'border-amber-500'];

    return (
        <DraggableWindow title="AI 추천수" onClose={onClose} initialWidth={300} windowId="analysis-hint" modal={false}>
            <ul className="space-y-1.5 text-xs">
                {result.recommendedMoves.map(move => (
                    <li key={move.order} className={`flex items-center justify-between p-1.5 bg-gray-900 rounded-md border-l-4 ${colors[move.order - 1]}`}>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base w-4 text-center">{move.order}</span>
                            <span className="font-mono text-base">{coordToStr(move.x, move.y, session.settings.boardSize)}</span>
                        </div>
                        <div className="text-right">
                             <span className="font-mono">{move.scoreLead > 0 ? `흑 +` : `백 +`}{Math.abs(move.scoreLead).toFixed(1)}</span>
                            <span className="block text-gray-400 font-mono">승률: {move.winrate.toFixed(1)}%</span>
                        </div>
                    </li>
                ))}
            </ul>
        </DraggableWindow>
    );
};