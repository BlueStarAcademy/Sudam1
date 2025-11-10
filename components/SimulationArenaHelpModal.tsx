import React from 'react';
import DraggableWindow from './DraggableWindow.js';

interface SimulationArenaHelpModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

const SimulationArenaHelpModal: React.FC<SimulationArenaHelpModalProps> = ({ onClose, isTopmost }) => {
    return (
        <DraggableWindow title="시뮬레이션 경기장 도움말" onClose={onClose} windowId="simulation-arena-help" initialWidth={700} isTopmost={isTopmost}>
            <div className="max-h-[70vh] overflow-y-auto pr-2 text-gray-300">
                <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <img src="/images/PlayingArena.png" alt="시뮬레이션 경기" className="w-32 h-32 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">시뮬레이션 경기 개요</h3>
                            <p className="text-sm mb-2">
                                플레이어의 능력치와 컨디션을 기반으로 자동 진행되는 경기입니다. 
                                경기는 50초 동안 진행되며, 초반/중반/종반으로 나뉩니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <img src="/images/icon/Gold.png" alt="골드" className="w-16 h-16 object-cover rounded-lg" />
                            <img src="/images/materials/materials1.png" alt="재료" className="w-16 h-16 object-cover rounded-lg" />
                            <img src="/images/Box/EquipmentBox1.png" alt="장비상자" className="w-16 h-16 object-cover rounded-lg" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">보상 안내</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong>동네바둑리그:</strong> 골드 획득</li>
                                <li><strong>전국바둑대회:</strong> 재료(강화석) 획득</li>
                                <li><strong>월드챔피언십:</strong> 장비 상자 획득</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <div className="w-32 h-32 bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-white">50초</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">경기 진행 방식</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>초반(1-15초): 초반 능력치 중요</li>
                                <li>중반(16-35초): 중반 능력치 중요</li>
                                <li>종반(36-50초): 종반 능력치 중요</li>
                                <li>각 단계마다 해당 능력치에 따라 점수 누적</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <div className="flex flex-col gap-1 flex-shrink-0 text-xs text-center">
                            <div className="bg-green-600/50 p-2 rounded">초반</div>
                            <div className="bg-yellow-600/50 p-2 rounded">중반</div>
                            <div className="bg-red-600/50 p-2 rounded">종반</div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">능력치 계산</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li><strong>초반 능력:</strong> 전투력, 사고속도, 집중력</li>
                                <li><strong>중반 능력:</strong> 전투력, 판단력, 집중력, 안정감</li>
                                <li><strong>종반 능력:</strong> 계산력, 안정감, 집중력</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl">🎲</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">랜덤 이벤트</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>5초마다 30% 확률로 발생</li>
                                <li>4가지 종류: 집중력 감소(부정), 사고속도 증가(긍정), 전투력 증가(긍정), 안정감 증가(긍정)</li>
                                <li>능력치가 높을수록 긍정 이벤트 확률 증가</li>
                                <li>현재 총 점수의 2~10%만큼 점수 변화</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-4xl">⚡</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">치명타</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>판단력이 치명타 발생 확률에 영향</li>
                                <li>치명타 발생 시 추가 점수 획득</li>
                                <li>전투력과 계산력이 추가 점수에 영향</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg">
                        <img src="/images/use/con1.png" alt="컨디션" className="w-32 h-32 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">컨디션</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>각 경기 전에 40~100 사이의 랜덤 컨디션 부여</li>
                                <li>컨디션이 낮을수록 능력치가 불안정하게 변동</li>
                                <li>컨디션 회복제로 회복 가능 (경기 시작 전에만 사용)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SimulationArenaHelpModal;
