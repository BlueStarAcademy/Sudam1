
import React from 'react';
import DraggableWindow from '../DraggableWindow';
import { UserWithStatus } from '../../types';

interface BlacksmithHelpModalProps {
    onClose: () => void;
    currentUser: UserWithStatus;
    isTopmost?: boolean;
}

const BlacksmithHelpModal: React.FC<BlacksmithHelpModalProps> = ({ onClose }) => {
    return (
        <DraggableWindow title="대장간 도움말" onClose={onClose} windowId="blacksmith-help" initialWidth={700} zIndex={60} variant="store">
            <div className="space-y-6 text-sm overflow-y-auto max-h-[600px] pr-2">
                <div className="flex items-start gap-4">
                    <img src="/images/equipments/moru.png" alt="장비 강화" className="w-32 h-32 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-yellow-400 mb-2 border-b border-yellow-400/30 pb-2">장비 강화</h3>
                        <div className="space-y-2 text-gray-300">
                            <p className="font-semibold">재료와 골드로 장비 강화 등급(★)을 올립니다.</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                                <li>강화 성공 시 주옵션 능력치 증가 (+3, +6, +9 시 2배)</li>
                                <li>부옵션 생성 또는 강화</li>
                                <li>실패 시 다음 강화 성공 확률 증가</li>
                                <li>최대 +10강화까지 가능</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-blue-400 mb-2 border-b border-blue-400/30 pb-2">장비 합성</h3>
                        <div className="space-y-2 text-gray-300">
                            <p className="font-semibold">동일 등급 장비 3개를 조합하여 새 장비를 획득합니다.</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                                <li>같은 등급의 새로운 장비 획득</li>
                                <li>대성공 시 한 등급 높은 장비 획득 (확률: 대장간 레벨에 따라 증가)</li>
                                <li>대장간 레벨에 따라 합성 가능 등급 제한</li>
                                <li>장착 중인 장비는 사용 불가</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-400 mb-2 border-b border-red-400/30 pb-2">장비 분해</h3>
                        <div className="space-y-2 text-gray-300">
                            <p className="font-semibold">불필요한 장비를 분해하여 강화 재료를 획득합니다.</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                                <li>사용된 재료의 30% 획득</li>
                                <li>대박 발생 시 획득량 2배 (확률: 대장간 레벨에 따라 증가)</li>
                                <li>장착 중/프리셋 등록 장비 분해 불가</li>
                                <li>전설 등급 이상 또는 7강화 이상은 확인 필요</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-400 mb-2 border-b border-green-400/30 pb-2">재료 변환</h3>
                        <div className="space-y-2 text-gray-300">
                            <p className="font-semibold">강화 재료를 상위/하위 등급으로 변환합니다.</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                                <li><strong className="text-green-300">합성:</strong> 하위 10개 → 상위 1~2개 (대박 시 2개)</li>
                                <li><strong className="text-green-300">분해:</strong> 상위 1개 → 하위 3~14개 (대박 시 2배)</li>
                                <li>대박 확률: 대장간 레벨에 따라 증가</li>
                                <li>등급: 하급 → 중급 → 상급 → 최상급 → 신비의 강화석</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-purple-400 mb-2 border-b border-purple-400/30 pb-2">대장간 경험치</h3>
                        <div className="space-y-2 text-gray-300">
                            <p className="font-semibold">모든 기능 사용 시 경험치 획득, 레벨업 시 효과 증가</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                                <li>강화/합성/분해/재료 변환 시 경험치 획득</li>
                                <li>레벨업 시 합성 가능 등급, 대박 확률, 대성공 확률 증가</li>
                                <li>높은 등급 장비일수록 더 많은 경험치 획득</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default BlacksmithHelpModal;
