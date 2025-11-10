import React, { useRef, useEffect } from 'react';
import { CommentaryLine } from '../types.js';

interface ScoreGraphAndCommentaryProps {
    commentary: CommentaryLine[];
    timeElapsed: number;
    p1Percent: number;
    p2Percent: number;
    isSimulating: boolean;
    p1Nickname?: string;
    p2Nickname?: string;
}

const parseCommentary = (commentaryLine: CommentaryLine) => {
    const { text, isRandomEvent, phase } = commentaryLine;

    if (text.startsWith('최종 결과 발표!')) {
        return <strong className="text-yellow-400">{text}</strong>;
    }

    // 초반/중반/종반전 시작 메시지에 색상 적용 (그래프 색상과 일치)
    if (text.includes('초반전이 시작되었습니다')) {
        return <strong className="text-green-500">{text}</strong>;
    }
    if (text.includes('중반전이 시작되었습니다')) {
        return <strong className="text-yellow-500">{text}</strong>;
    }
    if (text.includes('종반전이 시작되었습니다')) {
        return <strong className="text-red-500">{text}</strong>;
    }

    const leadRegex = /(\d+\.\d+집|\d+\.5집)/g;
    const parts = text.split(leadRegex);

    return (
        <span className={isRandomEvent ? 'text-cyan-400' : ''}>
            {parts.map((part, index) => {
                if (leadRegex.test(part)) {
                    return <strong key={index} className="text-yellow-400">{part}</strong>;
                }
                return part;
            })}
        </span>
    );
};

const SimulationProgressBar: React.FC<{ timeElapsed: number; totalDuration: number }> = ({ timeElapsed, totalDuration }) => {
    const progress = (timeElapsed / totalDuration) * 100;
    const earlyStage = Math.min(progress, (40 / 140) * 100);
    const midStage = Math.min(Math.max(0, progress - (40 / 140) * 100), (60 / 140) * 100);
    const endStage = Math.min(Math.max(0, progress - (100 / 140) * 100), (40 / 140) * 100);

    return (
        <div>
            <div className="w-full bg-gray-900 rounded-full h-2 flex border border-gray-600">
                <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${earlyStage}%` }} title="초반전"></div>
                <div className="bg-yellow-500 h-full" style={{ width: `${midStage}%` }} title="중반전"></div>
                <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${endStage}%` }} title="끝내기"></div>
            </div>
            <div className="flex text-xs text-gray-400 mt-1">
                <div style={{ width: `${(40/140)*100}%` }}>초반</div>
                <div style={{ width: `${(60/140)*100}%` }} className="text-center">중반</div>
                <div style={{ width: `${(40/140)*100}%` }} className="text-right">종반</div>
            </div>
        </div>
    );
};

const ScoreGraphAndCommentary: React.FC<ScoreGraphAndCommentaryProps> = ({ commentary, timeElapsed, p1Percent, p2Percent, isSimulating, p1Nickname, p2Nickname }) => {
    const commentaryContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (commentaryContainerRef.current) {
            commentaryContainerRef.current.scrollTop = commentaryContainerRef.current.scrollHeight;
        }
    }, [commentary]);
    
    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-shrink-0 p-4 pt-2">
                <h4 className="text-center font-bold text-sm mb-2 text-gray-400">점수 그래프</h4>
                {p1Nickname && p2Nickname && (
                    <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="truncate max-w-[45%]">흑: {p1Nickname}</span>
                        <span className="truncate max-w-[45%] text-right">백: {p2Nickname}</span>
                    </div>
                )}
                <div className="flex w-full h-3 bg-gray-700 rounded-full overflow-hidden border-2 border-black/30 relative">
                    <div className="bg-black transition-all duration-500 ease-in-out" style={{ width: `${p1Percent}%` }}></div>
                    <div className="bg-white transition-all duration-500 ease-in-out" style={{ width: `${p2Percent}%` }}></div>
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-400/50" title="중앙"></div>
                </div>
                 <div className="mt-2">
                    <SimulationProgressBar timeElapsed={timeElapsed} totalDuration={140} />
                </div>
            </div>
            <div className="flex-grow flex flex-col px-4 pb-4 min-h-0">
                <h4 className="text-center font-bold text-sm mb-2 text-gray-400 flex-shrink-0">
                    실시간 중계
                    {isSimulating && <span className="ml-2 text-yellow-400 animate-pulse">경기 진행 중...</span>}
                </h4>
                <div ref={commentaryContainerRef} className="overflow-y-auto space-y-2 text-sm text-gray-300 bg-gray-800/50 p-3 rounded-md h-56">
                    {commentary.length > 0 ? (
                        commentary.slice(-30).map((line, index) => <p key={`${index}-${line.text}`} className="animate-fade-in">{parseCommentary(line)}</p>)
                    ) : (
                        <p className="text-gray-500 text-center">경기 시작 대기 중...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScoreGraphAndCommentary;