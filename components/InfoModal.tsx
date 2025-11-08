import React, { useState } from 'react';
import DraggableWindow from './DraggableWindow.js';
import { GAME_RULES } from '../gameRules.js';

interface InfoModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

type InfoTab = 'game' | 'level' | 'ranking' | 'equipment' | 'manner';

const InfoModal: React.FC<InfoModalProps> = ({ onClose, isTopmost }) => {
    const [activeTab, setActiveTab] = useState<InfoTab>('game');

    const tabs: { id: InfoTab; label: string }[] = [
        { id: 'game', label: '게임방법' },
        { id: 'level', label: '레벨' },
        { id: 'ranking', label: '랭킹시스템' },
        { id: 'equipment', label: '장비' },
        { id: 'manner', label: '매너등급' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'game':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-blue-300">전략 바둑</h3>
                            <p className="text-sm">클래식 바둑, 따내기 바둑 등 전통적인 규칙을 기반으로 한 모드입니다. 수읽기와 전략을 통해 승리를 쟁취하세요. 각 게임의 자세한 규칙은 대기실의 '?' 버튼을 눌러 확인할 수 있습니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-yellow-300">놀이 바둑</h3>
                            <p className="text-sm">주사위 바둑, 알까기 등 운과 순발력이 필요한 캐주얼 모드입니다. 가볍게 즐기며 새로운 재미를 느껴보세요. 각 게임의 자세한 규칙은 대기실의 '?' 버튼을 눌러 확인할 수 있습니다.</p>
                        </div>
                         <div>
                            <h3 className="font-bold text-lg text-purple-300">챔피언십</h3>
                            <p className="text-sm">AI 시뮬레이션으로 진행되는 자동 대회입니다. 자신의 능력치와 장비 세팅으로 가상의 선수들과 실력을 겨루고, 결과에 따라 보상을 획득할 수 있습니다. 매일 다른 종류의 대회에 참가할 수 있습니다.</p>
                        </div>
                    </div>
                );
            case 'level':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-200">레벨 시스템</h3>
                            <p className="text-sm">전략/놀이 바둑을 플레이하면 각 분야의 경험치(XP)를 얻습니다. 경험치가 100% 차면 레벨이 오릅니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-green-300">스탯 포인트</h3>
                            <p className="text-sm">전략 레벨과 놀이 레벨이 오를 때마다 각각 2포인트씩 보너스 스탯 포인트를 획득합니다. 프로필 화면의 '포인트 분배' 버튼을 눌러 6가지 핵심 능력치에 투자하고, 챔피언십에서 더 좋은 성적을 거두세요.</p>
                        </div>
                    </div>
                );
            case 'ranking':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-200">랭킹 점수</h3>
                            <p className="text-sm">각 게임 모드마다 랭킹 점수가 존재하며, 승리하면 오르고 패배하면 떨어집니다. 이 점수를 기준으로 랭킹이 매겨집니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-purple-300">시즌 제도</h3>
                            <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                                <li>시즌은 3개월 단위로 진행됩니다 (1분기, 2분기, 3분기, 4분기).</li>
                                <li>시즌 동안 각 게임 모드별로 <strong className="text-yellow-300">최소 20경기</strong>를 플레이해야 해당 모드의 랭킹 티어를 받을 자격이 주어집니다. (배치 경기)</li>
                                <li>20경기를 채우지 못한 모드는 시즌 종료 시 '새싹' 티어로 마감됩니다.</li>
                                <li>시즌 종료 시, 배치 경기를 완료한 플레이어들을 대상으로 랭킹 순위에 따라 티어가 결정되고 보상이 우편으로 지급됩니다.</li>
                                <li>새 시즌이 시작되면 모든 게임 모드의 전적(승/패)과 랭킹 점수가 초기화되며, 다시 20경기의 배치 경기가 필요합니다.</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'equipment':
                return (
                     <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-200">장비 시스템</h3>
                            <p className="text-sm">부채, 바둑판, 의상 등 6가지 종류의 장비를 장착하여 캐릭터의 능력치를 강화할 수 있습니다. 장비는 일반, 고급, 희귀, 에픽, 전설, 신화 등급으로 나뉩니다. 등급이 높을수록 더 강력한 옵션을 가집니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-cyan-300">강화</h3>
                            <p className="text-sm">재료를 사용하여 장비의 별 등급(★)을 최대 5성까지 높일 수 있습니다. 강화에 성공하면 장비의 주옵션이 크게 상승하고, 부옵션이 추가되거나 기존 부옵션 중 하나가 랜덤하게 강화됩니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-orange-300">분해</h3>
                            <p className="text-sm">사용하지 않는 장비를 분해하여 강화에 필요한 재료 아이템을 획득할 수 있습니다. 분해 시 '대박'이 발생하면 2배의 재료를 얻을 수 있습니다.</p>
                        </div>
                    </div>
                );
            case 'manner':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-200">매너 등급 시스템</h3>
                            <p className="text-sm">매너 점수는 모든 게임 모드에서 통합 관리됩니다. '보통' 등급을 기준으로, 매너 플레이 시 점수가 오르고 비매너 행동(접속 종료, 시간 초과 등) 시 점수가 하락합니다. 등급이 오를수록 좋은 효과가 누적되며, 등급이 내려가면 나쁜 효과가 단계별로 쌓입니다. 다시 등급을 올리면 가장 최근에 쌓인 페널티부터 하나씩 제거됩니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-200">등급별 점수 및 효과</h3>
                            <ul className="list-disc list-inside text-sm space-y-2 pl-2">
                                <li><span className="text-purple-400 font-semibold">마스터 (2000점 이상):</span> 모든 능력치 +10</li>
                                <li><span className="text-blue-400 font-semibold">프로 (1600점 ~ 1999점):</span> 장비 분해 시 대박 확률 +20%</li>
                                <li><span className="text-cyan-400 font-semibold">품격 (1200점 ~ 1599점):</span> 경기 승리 시 보상 상자 획득 확률 +20%</li>
                                <li><span className="text-teal-400 font-semibold">매우 좋음 (800점 ~ 1199점):</span> 경기 승리 시 골드 보상 +20%</li>
                                <li><span className="text-green-400 font-semibold">좋음 (400점 ~ 799점):</span> 최대 행동력 +10</li>
                                <li className="border-t border-gray-600 pt-2"><span className="text-gray-300 font-semibold">보통 (200점 ~ 399점):</span> 기본 상태</li>
                                <li className="border-t border-gray-600 pt-2"><span className="text-yellow-400 font-semibold">주의 (100점 ~ 199점):</span> 경기 보상 상자 획득 확률 50% 감소</li>
                                <li><span className="text-orange-400 font-semibold">나쁨 (50점 ~ 99점):</span> 경기 보상 골드 50% 감소</li>
                                <li><span className="text-red-500 font-semibold">매우 나쁨 (1점 ~ 49점):</span> 행동력 회복 속도 감소 (20분마다 1 회복)</li>
                                <li><span className="text-red-700 font-semibold">최악 (0점):</span> 최대 행동력 20 감소</li>
                            </ul>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <DraggableWindow title="도움말" onClose={onClose} windowId="info-modal" initialWidth={600} isTopmost={isTopmost}>
            <div className="h-[calc(var(--vh,1vh)*60)] flex flex-col">
                <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex-grow overflow-y-auto pr-2 bg-gray-900/30 p-4 rounded-md">
                    {renderContent()}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default InfoModal;