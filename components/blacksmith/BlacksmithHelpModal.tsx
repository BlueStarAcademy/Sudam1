
import React from 'react';
import DraggableWindow from '../DraggableWindow';
import { UserWithStatus, ItemGrade } from '../../types';
import { BLACKSMITH_MAX_LEVEL, BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL, BLACKSMITH_DISASSEMBLY_JACKPOT_RATES, BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES, BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP, BLACKSMITH_COMBINATION_XP_GAIN, BLACKSMITH_ENHANCEMENT_XP_GAIN, BLACKSMITH_DISASSEMBLY_XP_GAIN } from '../../constants/rules';

interface BlacksmithHelpModalProps {
    onClose: () => void;
    currentUser: UserWithStatus;
}

const GRADE_NAMES_KO: Record<ItemGrade, string> = {
    normal: '일반',
    uncommon: '고급',
    rare: '희귀',
    epic: '에픽',
    legendary: '전설',
    mythic: '신화',
};

const GRADE_ORDER: ItemGrade[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const BlacksmithHelpModal: React.FC<BlacksmithHelpModalProps> = ({ onClose, currentUser }) => {
    const { blacksmithLevel } = currentUser;
    const currentLevel = blacksmithLevel ?? 1;
    const isMaxLevel = currentLevel >= BLACKSMITH_MAX_LEVEL;
    const currentLevelIndex = currentLevel - 1;
    const nextLevelIndex = isMaxLevel ? currentLevelIndex : currentLevel;

    const renderEffects = () => (
        <div className="w-full text-left">
            <div className="flex justify-between text-xs font-bold text-gray-400 px-2 pb-1 border-b border-gray-600 mb-1">
                <span>효과</span>
                <span>
                    Lv.{currentLevel}
                    {!isMaxLevel && <span className="text-yellow-400"> → Lv.{currentLevel + 1}</span>}
                </span>
            </div>
            <div className="text-xs text-secondary space-y-2">
                <div className="bg-black/20 p-2 rounded-md">
                    <div className="flex justify-between">
                        <span>합성 가능 등급</span>
                        <span>
                            {GRADE_NAMES_KO[BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL[currentLevelIndex]]}
                            {!isMaxLevel && 
                                <span className="text-yellow-400"> → {GRADE_NAMES_KO[BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL[nextLevelIndex]]}</span>
                            }
                        </span>
                    </div>
                </div>
                <div className="bg-black/20 p-2 rounded-md">
                    <div className="flex justify-between">
                        <span>분해 대박 확률</span>
                        <span>
                            {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[currentLevelIndex]}%
                            {!isMaxLevel && 
                                <span className="text-yellow-400"> → {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[nextLevelIndex]}%</span>
                            }
                        </span>
                    </div>
                </div>
                <div className="bg-black/20 p-2 rounded-md">
                    <p className="font-semibold">합성 대성공 확률:</p>
                    {GRADE_ORDER.map(grade => {
                        const rate = BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES[currentLevelIndex]?.[grade] ?? 0;
                        const nextRate = BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES[nextLevelIndex]?.[grade];
                        return (
                            <div key={grade} className="flex justify-between pl-2">
                                <span>{GRADE_NAMES_KO[grade]}</span>
                                <span>
                                    {rate}%
                                    {!isMaxLevel && nextRate !== undefined &&
                                        <span className="text-yellow-400"> → {nextRate}%</span>
                                    }
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <DraggableWindow title="대장간 도움말" onClose={onClose} windowId="blacksmith-help" initialWidth={500} zIndex={60}>
            <div className="space-y-4 text-sm">
                <div>
                    <h3 className="text-lg font-bold text-accent mb-2">기능 설명</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        <li><strong>장비 강화:</strong> 재료를 사용하여 장비의 등급(★)을 올립니다. 등급이 오르면 주옵션이 성장하고, 특정 등급마다 부옵션이 추가되거나 강화됩니다.</li>
                        <li><strong>장비 합성:</strong> 동일한 등급의 장비 3개를 조합하여 새로운 장비를 획득합니다. 낮은 확률로 한 등급 높은 장비를 얻는 '대성공'이 발생할 수 있습니다.</li>
                        <li><strong>장비 분해:</strong> 불필요한 장비를 분해하여 강화 재료를 획득합니다.</li>
                        <li><strong>재료 변환:</strong> 강화 재료를 상위 혹은 하위 재료로 변환합니다.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-accent mb-2">경험치 획득</h3>
                    <p className="text-gray-300">대장간의 모든 기능(강화, 합성, 분해, 변환)을 사용하면 대장간 경험치를 얻을 수 있으며, 레벨을 올릴 수 있습니다.</p>
                    <div className="text-xs text-gray-400 mt-2 space-y-1 bg-black/20 p-2 rounded-md">
                        <p><strong>강화:</strong> 등급/강화 단계에 따라 차등 지급</p>
                        <p><strong>합성:</strong> 등급에 따라 차등 지급</p>
                        <p><strong>분해:</strong> 등급에 따라 차등 지급</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-accent mb-2">현재 대장간 효과</h3>
                    {renderEffects()}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default BlacksmithHelpModal;
