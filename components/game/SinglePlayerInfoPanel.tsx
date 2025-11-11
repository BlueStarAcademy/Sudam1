import React, { useState } from 'react';

const goProverbs = [
    { term: "부득탐승(不得貪勝)", meaning: "너무 이기려고 탐하지 말라." },
    { term: "입계의완(入界宜緩)", meaning: "상대의 세력권에 들어갈 때는 천천히, 그리고 부드럽게 들어가라." },
    { term: "공피고아(攻彼顧我)", meaning: "상대를 공격하기 전에 나를 먼저 돌아보고 약점이 없는지 살펴라." },
    { term: "기자쟁선(棄子爭先)", meaning: "작은 돌을 버리더라도 선수를 잡아 더욱 중요한 곳으로 향하라." },
    { term: "사소취대(捨小就大)", meaning: "작은 이익을 버리고 큰 이익을 취하라." },
    { term: "봉위수기(逢危須棄)", meaning: "위험에 처하면 돌을 버릴 줄 알아야 한다." },
    { term: "신물경속(愼勿輕速)", meaning: "신중하되, 경솔하고 빠르게 두지 말라." },
    { term: "동수상응(動須相應)", meaning: "돌의 행마는 서로 호응하며 리듬을 타야 한다." },
    { term: "피강자보(彼强自保)", meaning: "상대가 강한 곳에서는 나 자신을 먼저 지켜라." },
    { term: "세고취화(勢孤取和)", meaning: "세력이 약하고 외로울 때는 싸우지 말고 평화를 취하라." },
    { term: "아생연후살타(我生然後殺他)", meaning: "나의 돌을 먼저 살린 후에 상대의 돌을 잡으러 가라." },
    { term: "적의 급소는 나의 급소", meaning: "상대가 두고 싶어하는 좋은 자리는 나에게도 좋은 자리이다." }
];

const ProverbPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [proverbIndex] = useState(() => Math.floor(Math.random() * goProverbs.length));
    const currentProverb = goProverbs[proverbIndex];

    return (
        <div className="bg-gray-800/80 backdrop-blur-sm p-3 rounded-md flex-1 border border-gray-700/50 text-stone-300 flex flex-col min-h-0">
            <h3 className="text-base font-bold border-b border-gray-700 pb-1 mb-2 text-amber-300 flex justify-between items-center flex-shrink-0">
                <span>바둑 격언</span>
                {onClose && <button onClick={onClose} className="text-xl font-bold text-gray-400 hover:text-white">×</button>}
            </h3>
            <div className="flex-grow flex flex-col items-center justify-center text-center min-h-0">
                <p className="text-2xl font-semibold text-stone-100">{currentProverb.term}</p>
                <p className="text-sm text-stone-300 mt-2">{currentProverb.meaning}</p>
            </div>
        </div>
    );
};

export default ProverbPanel;
