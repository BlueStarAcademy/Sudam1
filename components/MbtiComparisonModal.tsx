import React, { useMemo } from 'react';
import { User } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import DraggableWindow from './DraggableWindow';

interface MbtiComparisonModalProps {
    opponentUser: User;
    onClose: () => void;
    isTopmost?: boolean;
}

// MBTI별 바둑성향 정의
const MBTI_GO_STYLES: Record<string, {
    style: string;
    strengths: string[];
    weaknesses: string[];
    playStyle: string;
}> = {
    'ISTJ': {
        style: '견실한 실리파',
        strengths: ['정석 준수', '끝내기 정확도', '안정적인 집 짓기'],
        weaknesses: ['변칙 대응', '창의적 수', '대세관'],
        playStyle: '정석과 기본기에 충실하며, 확실한 실리를 추구합니다. 끝내기에서 강한 면모를 보입니다.'
    },
    'ISFJ': {
        style: '방어적 실리파',
        strengths: ['안정적인 집 짓기', '상대 공격 방어', '신중한 판단'],
        weaknesses: ['적극적 공격', '변칙 수', '대세관'],
        playStyle: '안정적인 집 짓기에 집중하며, 상대의 공격을 잘 막아냅니다. 신중하고 조심스러운 기풍입니다.'
    },
    'INFJ': {
        style: '전략적 직관파',
        strengths: ['대세관', '상대 심리 읽기', '장기 전략'],
        weaknesses: ['단기 계산', '실리 추구', '끝내기'],
        playStyle: '큰 그림을 그리며 장기적인 전략을 세웁니다. 상대의 의도를 읽고 대응하는 능력이 뛰어납니다.'
    },
    'INTJ': {
        style: '논리적 전략가',
        strengths: ['전략 수립', '논리적 계산', '장기 계획'],
        weaknesses: ['감각적 수', '임기응변', '상대 심리'],
        playStyle: '체계적인 전략을 세우고 논리적으로 수를 읽습니다. 한번 정한 작전을 끝까지 밀고 나갑니다.'
    },
    'ISTP': {
        style: '실용적 문제해결자',
        strengths: ['문제 해결', '실용적 수', '유연한 대응'],
        weaknesses: ['장기 전략', '끝내기', '안정성'],
        playStyle: '현재 상황에 맞는 최선의 수를 찾아냅니다. 실용적이고 유연한 기풍입니다.'
    },
    'ISFP': {
        style: '감각적 자유인',
        strengths: ['감각적 수', '창의적 발상', '유연한 대응'],
        weaknesses: ['전략 수립', '끝내기', '안정성'],
        playStyle: '감각에 의존하며 자유롭게 두는 기풍입니다. 때로는 예상치 못한 수를 둡니다.'
    },
    'INFP': {
        style: '이상주의적 창의파',
        strengths: ['창의적 수', '변칙 대응', '직관적 판단'],
        weaknesses: ['실리 추구', '끝내기', '안정성'],
        playStyle: '이상적인 바둑을 추구하며 창의적인 수를 선호합니다. 감성적인 판단을 합니다.'
    },
    'INTP': {
        style: '분석적 탐구자',
        strengths: ['논리적 분석', '변칙 수', '이론적 이해'],
        weaknesses: ['실리 추구', '끝내기', '안정성'],
        playStyle: '이론과 논리에 기반하여 수를 분석합니다. 복잡한 수순을 즐기며 탐구합니다.'
    },
    'ESTP': {
        style: '적극적 행동파',
        strengths: ['적극적 공격', '수싸움', '즉흥적 대응'],
        weaknesses: ['장기 전략', '끝내기', '신중함'],
        playStyle: '적극적으로 공격하고 수싸움을 즐깁니다. 즉흥적이고 대담한 수를 둡니다.'
    },
    'ESFP': {
        style: '활발한 감각파',
        strengths: ['감각적 수', '즉흥적 대응', '활발한 기풍'],
        weaknesses: ['장기 전략', '끝내기', '신중함'],
        playStyle: '활발하고 감각적인 수를 선호합니다. 즉흥적으로 판을 이끌어갑니다.'
    },
    'ENFP': {
        style: '열정적 창의파',
        strengths: ['창의적 수', '열정적 공격', '변칙 대응'],
        weaknesses: ['안정성', '끝내기', '신중함'],
        playStyle: '열정적으로 창의적인 수를 둡니다. 변칙적이고 예측하기 어려운 기풍입니다.'
    },
    'ENTP': {
        style: '도전적 논쟁가',
        strengths: ['변칙 수', '논리적 공격', '창의적 발상'],
        weaknesses: ['안정성', '끝내기', '신중함'],
        playStyle: '도전적이고 논리적인 공격을 선호합니다. 변칙적이고 창의적인 수를 즐깁니다.'
    },
    'ESTJ': {
        style: '체계적 실리파',
        strengths: ['체계적 수', '실리 추구', '안정성'],
        weaknesses: ['변칙 대응', '창의적 수', '대세관'],
        playStyle: '체계적이고 계획적으로 실리를 추구합니다. 정석과 기본기에 충실합니다.'
    },
    'ESFJ': {
        style: '협조적 안정파',
        strengths: ['안정적 집 짓기', '협조적 수', '신중함'],
        weaknesses: ['적극적 공격', '변칙 수', '대세관'],
        playStyle: '안정적이고 협조적인 수를 선호합니다. 신중하게 집을 짓는 기풍입니다.'
    },
    'ENFJ': {
        style: '영감적 전략가',
        strengths: ['대세관', '상대 심리 읽기', '전략 수립'],
        weaknesses: ['단기 계산', '실리 추구', '끝내기'],
        playStyle: '상대를 이해하고 전략을 세웁니다. 큰 그림을 그리며 영감을 주는 수를 둡니다.'
    },
    'ENTJ': {
        style: '결단력 있는 리더',
        strengths: ['전략 수립', '결단력', '리더십'],
        weaknesses: ['감각적 수', '임기응변', '상대 심리'],
        playStyle: '명확한 전략을 세우고 결단력 있게 밀고 나갑니다. 리더십 있는 기풍입니다.'
    }
};

// MBTI 상성 분석 함수
const analyzeCompatibility = (myMbti: string | null | undefined, opponentMbti: string | null | undefined) => {
    if (!myMbti || !opponentMbti || myMbti.length !== 4 || opponentMbti.length !== 4) {
        return null;
    }

    const myStyle = MBTI_GO_STYLES[myMbti];
    const opponentStyle = MBTI_GO_STYLES[opponentMbti];

    if (!myStyle || !opponentStyle) {
        return null;
    }

    // 차이점 분석
    const differences: string[] = [];
    const similarities: string[] = [];

    // 각 차원별 비교
    if (myMbti[0] !== opponentMbti[0]) {
        differences.push(myMbti[0] === 'E' ? '당신은 적극적, 상대는 신중함' : '당신은 신중, 상대는 적극적');
    } else {
        similarities.push(myMbti[0] === 'E' ? '둘 다 적극적인 기풍' : '둘 다 신중한 기풍');
    }

    if (myMbti[1] !== opponentMbti[1]) {
        differences.push(myMbti[1] === 'S' ? '당신은 실리파, 상대는 직관파' : '당신은 직관파, 상대는 실리파');
    } else {
        similarities.push(myMbti[1] === 'S' ? '둘 다 실리 중심' : '둘 다 직관 중심');
    }

    if (myMbti[2] !== opponentMbti[2]) {
        differences.push(myMbti[2] === 'T' ? '당신은 논리파, 상대는 감성파' : '당신은 감성파, 상대는 논리파');
    } else {
        similarities.push(myMbti[2] === 'T' ? '둘 다 논리적' : '둘 다 감성적');
    }

    if (myMbti[3] !== opponentMbti[3]) {
        differences.push(myMbti[3] === 'J' ? '당신은 계획파, 상대는 유연파' : '당신은 유연파, 상대는 계획파');
    } else {
        similarities.push(myMbti[3] === 'J' ? '둘 다 계획적' : '둘 다 유연함');
    }

    // 조심해야 할 부분
    const warnings: string[] = [];
    if (opponentMbti[0] === 'E') {
        warnings.push('상대는 적극적인 공격을 선호합니다. 수싸움에 휘말리지 않도록 주의하세요.');
    }
    if (opponentMbti[1] === 'N') {
        warnings.push('상대는 창의적이고 변칙적인 수를 둡니다. 예상치 못한 수에 대비하세요.');
    }
    if (opponentMbti[2] === 'T') {
        warnings.push('상대는 논리적이고 계산이 정확합니다. 함정에 빠지지 않도록 신중하게 두세요.');
    }
    if (opponentMbti[3] === 'J') {
        warnings.push('상대는 계획적이고 끝내기에 강합니다. 장기전으로 끌고 가는 것을 피하세요.');
    }

    // 공략 방법
    const strategies: string[] = [];
    if (opponentMbti[0] === 'I') {
        strategies.push('상대는 신중한 기풍입니다. 적극적으로 공격하여 판을 복잡하게 만드세요.');
    }
    if (opponentMbti[1] === 'S') {
        strategies.push('상대는 실리 중심입니다. 변칙적인 수로 대세를 잡으세요.');
    }
    if (opponentMbti[2] === 'F') {
        strategies.push('상대는 감성적입니다. 논리적인 수로 압박하세요.');
    }
    if (opponentMbti[3] === 'P') {
        strategies.push('상대는 유연한 기풍입니다. 계획적으로 끝내기까지 끌고 가세요.');
    }

    // 상성 점수 계산 (간단한 알고리즘)
    let compatibilityScore = 50; // 기본 50점
    const sameCount = [0, 1, 2, 3].filter(i => myMbti[i] === opponentMbti[i]).length;
    compatibilityScore += sameCount * 10; // 같은 차원당 +10점
    compatibilityScore -= (4 - sameCount) * 5; // 다른 차원당 -5점

    // 특정 조합 보너스/페널티
    if (myMbti[0] === 'E' && opponentMbti[0] === 'I') {
        compatibilityScore += 5; // E vs I는 상호 보완적
    }
    if (myMbti[1] === 'S' && opponentMbti[1] === 'N') {
        compatibilityScore -= 10; // S vs N은 상극
    }
    if (myMbti[2] === 'T' && opponentMbti[2] === 'F') {
        compatibilityScore += 5; // T vs F는 상호 보완적
    }
    if (myMbti[3] === 'J' && opponentMbti[3] === 'P') {
        compatibilityScore += 5; // J vs P는 상호 보완적
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    let compatibilityLevel: 'very-good' | 'good' | 'neutral' | 'bad' | 'very-bad';
    let compatibilityText: string;
    if (compatibilityScore >= 80) {
        compatibilityLevel = 'very-good';
        compatibilityText = '매우 좋은 상성';
    } else if (compatibilityScore >= 60) {
        compatibilityLevel = 'good';
        compatibilityText = '좋은 상성';
    } else if (compatibilityScore >= 40) {
        compatibilityLevel = 'neutral';
        compatibilityText = '보통 상성';
    } else if (compatibilityScore >= 20) {
        compatibilityLevel = 'bad';
        compatibilityText = '나쁜 상성';
    } else {
        compatibilityLevel = 'very-bad';
        compatibilityText = '매우 나쁜 상성';
    }

    return {
        myStyle,
        opponentStyle,
        differences,
        similarities,
        warnings,
        strategies,
        compatibilityScore,
        compatibilityLevel,
        compatibilityText
    };
};

const MbtiComparisonModal: React.FC<MbtiComparisonModalProps> = ({ opponentUser, onClose, isTopmost }) => {
    const { currentUserWithStatus } = useAppContext();

    const analysis = useMemo(() => {
        return analyzeCompatibility(currentUserWithStatus?.mbti, opponentUser.mbti);
    }, [currentUserWithStatus?.mbti, opponentUser.mbti]);

    if (!currentUserWithStatus?.mbti || !opponentUser.mbti) {
        return (
            <DraggableWindow title="MBTI 비교" onClose={onClose} windowId="mbti-comparison" initialWidth={500} initialHeight={300} isTopmost={isTopmost}>
                <div className="p-4 text-center">
                    <p className="text-gray-300 mb-4">
                        {!currentUserWithStatus?.mbti && !opponentUser.mbti
                            ? '양쪽 모두 MBTI가 설정되지 않았습니다.'
                            : !currentUserWithStatus?.mbti
                            ? '당신의 MBTI가 설정되지 않았습니다.'
                            : '상대방의 MBTI가 설정되지 않았습니다.'}
                    </p>
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        확인
                    </button>
                </div>
            </DraggableWindow>
        );
    }

    if (!analysis) {
        return (
            <DraggableWindow title="MBTI 비교" onClose={onClose} windowId="mbti-comparison" initialWidth={500} initialHeight={300} isTopmost={isTopmost}>
                <div className="p-4 text-center">
                    <p className="text-gray-300 mb-4">MBTI 정보를 분석할 수 없습니다.</p>
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        확인
                    </button>
                </div>
            </DraggableWindow>
        );
    }

    const compatibilityColor = {
        'very-good': 'text-green-400',
        'good': 'text-green-300',
        'neutral': 'text-yellow-300',
        'bad': 'text-orange-300',
        'very-bad': 'text-red-400'
    }[analysis.compatibilityLevel];

    const compatibilityBgColor = {
        'very-good': 'bg-green-900/30 border-green-500/50',
        'good': 'bg-green-800/30 border-green-400/50',
        'neutral': 'bg-yellow-900/30 border-yellow-500/50',
        'bad': 'bg-orange-900/30 border-orange-500/50',
        'very-bad': 'bg-red-900/30 border-red-500/50'
    }[analysis.compatibilityLevel];

    return (
        <DraggableWindow title="MBTI 바둑성향 비교" onClose={onClose} windowId="mbti-comparison" initialWidth={700} initialHeight={800} isTopmost={isTopmost}>
            <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '750px' }}>
                {/* 상성 점수 */}
                <div className={`p-4 rounded-lg border-2 ${compatibilityBgColor}`}>
                    <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">상성 점수</p>
                        <p className={`text-3xl font-bold ${compatibilityColor} mb-2`}>
                            {analysis.compatibilityScore}점
                        </p>
                        <p className={`text-lg font-semibold ${compatibilityColor}`}>
                            {analysis.compatibilityText}
                        </p>
                    </div>
                </div>

                {/* MBTI 정보 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">나의 MBTI</p>
                        <p className="text-xl font-bold text-blue-400 mb-2">{currentUserWithStatus.mbti}</p>
                        <p className="text-sm text-gray-300 mb-2">{analysis.myStyle.style}</p>
                        <p className="text-xs text-gray-400">{analysis.myStyle.playStyle}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">상대의 MBTI</p>
                        <p className="text-xl font-bold text-red-400 mb-2">{opponentUser.mbti}</p>
                        <p className="text-sm text-gray-300 mb-2">{analysis.opponentStyle.style}</p>
                        <p className="text-xs text-gray-400">{analysis.opponentStyle.playStyle}</p>
                    </div>
                </div>

                {/* 상대의 바둑성향 상세 */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-white mb-3">상대의 바둑성향</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-semibold text-green-300 mb-1">강점</p>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                {analysis.opponentStyle.strengths.map((strength, idx) => (
                                    <li key={idx}>{strength}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-300 mb-1">약점</p>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                {analysis.opponentStyle.weaknesses.map((weakness, idx) => (
                                    <li key={idx}>{weakness}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 조심해야 할 부분 */}
                {analysis.warnings.length > 0 && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-red-300 mb-3 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>조심해야 할 부분</span>
                        </h3>
                        <ul className="space-y-2">
                            {analysis.warnings.map((warning, idx) => (
                                <li key={idx} className="text-sm text-gray-200 flex items-start gap-2">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    <span>{warning}</span>
                                </li>
                            ))}
                        </ul>
                        {analysis.opponentStyle.strengths.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-red-500/30">
                                <p className="text-xs text-gray-400 mb-2">상대의 강점을 주의하세요:</p>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.opponentStyle.strengths.map((strength, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-red-800/50 rounded text-xs text-red-200">
                                            {strength}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 공략 방법 */}
                {analysis.strategies.length > 0 && (
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                            <span>💡</span>
                            <span>공략 작전</span>
                        </h3>
                        <ul className="space-y-2">
                            {analysis.strategies.map((strategy, idx) => (
                                <li key={idx} className="text-sm text-gray-200 flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>{strategy}</span>
                                </li>
                            ))}
                        </ul>
                        {analysis.opponentStyle.weaknesses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-500/30">
                                <p className="text-xs text-gray-400 mb-2">상대의 약점을 활용하세요:</p>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.opponentStyle.weaknesses.map((weakness, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-800/50 rounded text-xs text-blue-200">
                                            {weakness}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 차이점과 유사점 */}
                <div className="grid grid-cols-2 gap-4">
                    {analysis.differences.length > 0 && (
                        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-yellow-300 mb-2">차이점</h3>
                            <ul className="space-y-1">
                                {analysis.differences.map((diff, idx) => (
                                    <li key={idx} className="text-xs text-gray-300">• {diff}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {analysis.similarities.length > 0 && (
                        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-green-300 mb-2">유사점</h3>
                            <ul className="space-y-1">
                                {analysis.similarities.map((sim, idx) => (
                                    <li key={idx} className="text-xs text-gray-300">• {sim}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MbtiComparisonModal;

