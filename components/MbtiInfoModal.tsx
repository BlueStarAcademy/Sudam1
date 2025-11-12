import React, { useState, useMemo, useEffect } from 'react';
import DraggableWindow from './DraggableWindow.js';
import { MBTI_QUESTIONS } from '../constants/mbtiQuestions';
import { useAppContext } from '../hooks/useAppContext.js';

interface MbtiInfoModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

const MBTI_DESCRIPTIONS: Record<string, string> = {
    ISTJ: '현실적, 책임감, 신중함',
    ISFJ: '헌신적, 온화함, 섬세함',
    INFJ: '통찰력, 이상주의, 깊이 있음',
    INTJ: '전략적, 독립적, 논리적',
    ISTP: '논리적, 실용적, 문제 해결사',
    ISFP: '겸손함, 예술적, 융통성',
    INFP: '이상주의, 공감 능력, 창의적',
    INTP: '지적 호기심, 분석적, 독창적',
    ESTP: '활동적, 현실적, 대담함',
    ESFP: '사교적, 낙천적, 즉흥적',
    ENFP: '열정적, 상상력 풍부, 사교적',
    ENTP: '독창적, 박식함, 논쟁가',
    ESTJ: '체계적, 현실적, 리더십',
    ESFJ: '사교적, 협조적, 배려심',
    ENFJ: '카리스마, 영감, 리더십',
    ENTJ: '결단력, 리더십, 전략가',
};

const MbtiInfoModal: React.FC<MbtiInfoModalProps> = ({ onClose, isTopmost }) => {
    const { currentUser, handlers } = useAppContext();
    const [isSettingMbti, setIsSettingMbti] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResult, setShowResult] = useState(false);
    const [calculatedMbti, setCalculatedMbti] = useState<string | null>(null);
    const [hasClaimedReward, setHasClaimedReward] = useState<boolean>(() => !!currentUser?.mbti);

    const hasMbti = useMemo(() => !!currentUser?.mbti, [currentUser]);

    useEffect(() => {
        if (currentUser?.mbti) {
            setHasClaimedReward(true);
        }
    }, [currentUser?.mbti]);

    const handleStartMbtiSetting = () => {
        setIsSettingMbti(true);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setShowResult(false);
        setCalculatedMbti(null);
    };

    const handleAnswer = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNextQuestion = async () => {
        if (currentQuestionIndex < MBTI_QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // All questions answered, calculate MBTI
            const mbti = calculateMbti();
            setCalculatedMbti(mbti);
            // Dispatch action to update MBTI
            const isFirstTime = !hasMbti && !hasClaimedReward;
            await handlers.handleAction({
                type: 'UPDATE_MBTI',
                payload: { mbti, isMbtiPublic: true, isFirstTime }
            });
            setShowResult(true);
            if (isFirstTime) {
                setHasClaimedReward(true);
            }
            console.log('MBTI set:', mbti, 'MBTI reward processed.');
        }
    };

    const calculateMbti = (): string => {
        let mbti = '';
        MBTI_QUESTIONS.forEach(q => {
            mbti += answers[q.id] || '?'; // Use '?' if not answered, though all should be by this point
        });
        return mbti;
    };

    const currentQuestion = MBTI_QUESTIONS[currentQuestionIndex];

    return (
        <DraggableWindow title="MBTI 성향 안내" onClose={onClose} windowId="mbti-info" initialWidth={400} isTopmost={isTopmost}>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {!isSettingMbti && !hasMbti && !hasClaimedReward && (
                    <div className="text-center mb-4">
                        <p className="text-lg font-bold text-white mb-2">MBTI란 무엇인가요?</p>
                        <p className="text-sm text-gray-300 mb-4">
                            MBTI(Myers-Briggs Type Indicator)는 개인의 선호도를 바탕으로 성격 유형을 이해하는 도구입니다.
                            자신을 더 잘 이해하고 다른 사람들과의 관계를 개선하는 데 도움을 줄 수 있습니다.
                        </p>
                        <button
                            onClick={handleStartMbtiSetting}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            MBTI 설정하기
                        </button>
                        <p className="text-sm text-yellow-400 mt-2">완료 시 100 다이아몬드를 드립니다!</p>
                    </div>
                )}

                {isSettingMbti && !showResult && (
                    <div className="space-y-4">
                        <p className="text-lg font-bold text-white">{currentQuestion.question}</p>
                        <div className="space-y-2">
                            {currentQuestion.options.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAnswer(currentQuestion.id, option.value)}
                                    className={`block w-full text-left p-3 rounded-md transition-colors duration-200
                                        ${answers[currentQuestion.id] === option.value
                                            ? 'bg-blue-700 text-white'
                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                                        }`}
                                >
                                    {option.text}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleNextQuestion}
                                disabled={!answers[currentQuestion.id]}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {currentQuestionIndex < MBTI_QUESTIONS.length - 1 ? '다음' : '완료'}
                            </button>
                        </div>
                    </div>
                )}

                {showResult && calculatedMbti && (
                    <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-300 mb-4">당신의 MBTI는 {calculatedMbti} 입니다!</p>
                        <p className="text-lg text-green-400 mb-4">100 다이아몬드 획득!</p>
                        <button
                            onClick={onClose}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            확인
                        </button>
                    </div>
                )}

                {!isSettingMbti && (hasMbti || showResult) && (
                    <>
                        <p className="text-lg font-bold text-white mb-2">현재 MBTI: {currentUser?.mbti}</p>
                        <div className="text-center mb-4">
                            <button
                                onClick={handleStartMbtiSetting}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                                MBTI 다시 설정하기
                            </button>
                        </div>
                        <ul className="space-y-2 mt-4">
                            {Object.entries(MBTI_DESCRIPTIONS).map(([type, description]) => (
                                <li key={type} className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-md">
                                    <span className="font-bold text-lg text-yellow-300 w-16">{type}</span>
                                    <span className="text-sm text-gray-300">{description}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </DraggableWindow>
    );
};

export default MbtiInfoModal;
