import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryItemType, EquipmentSlot, ItemGrade, MythicStat } from '../../types.js';
import { EQUIPMENT_POOL, MATERIAL_ITEMS, CONSUMABLE_ITEMS, GRADE_SUB_OPTION_RULES, MAIN_STAT_DEFINITIONS, SUB_OPTION_POOLS, SPECIAL_STATS_DATA, MYTHIC_STATS_DATA, GRADE_LEVEL_REQUIREMENTS } from '../../constants.js';
import DraggableWindow from '../DraggableWindow.js';

interface EncyclopediaModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

type EncyclopediaItem = {
    name: string;
    description: string;
    type: InventoryItemType;
    slot: EquipmentSlot | null;
    image: string | null;
    grade: ItemGrade;
    quantity?: number;
};

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: 'images/equipments/normalbgi.png',
    uncommon: 'images/equipments/uncommonbgi.png',
    rare: 'images/equipments/rarebgi.png',
    epic: 'images/equipments/epicbgi.png',
    legendary: 'images/equipments/legendarybgi.png',
    mythic: 'images/equipments/mythicbgi.png',
};

const gradeOrder: Record<ItemGrade, number> = {
    normal: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
};

const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ onClose, isTopmost }) => {
    type MainTab = 'equipment' | 'material' | 'consumable' | 'help';
    type ConsumableCategory = '골드꾸러미' | '다이아꾸러미' | '장비상자' | '재료상자';

    const [mainTab, setMainTab] = useState<MainTab>('equipment');
    
    const equipmentSlots: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];
    const slotNames: Record<EquipmentSlot, string> = { fan: '부채', board: '바둑판', top: '상의', bottom: '하의', bowl: '바둑통', stones: '바둑돌' };
    const consumableCategories: { id: ConsumableCategory; name: string }[] = [
        { id: '장비상자', name: '장비상자' },
        { id: '재료상자', name: '재료상자' },
        { id: '골드꾸러미', name: '골드꾸러미' },
        { id: '다이아꾸러미', name: '다이아꾸러미' },
    ];
    const gradeStyles: Record<ItemGrade, { name: string; color: string }> = {
        normal: { name: '일반', color: 'text-gray-300' },
        uncommon: { name: '고급', color: 'text-green-400' },
        rare: { name: '희귀', color: 'text-blue-400' },
        epic: { name: '에픽', color: 'text-purple-400' },
        legendary: { name: '전설', color: 'text-red-500' },
        mythic: { name: '신화', color: 'text-orange-400' },
    };

    const [activeEquipmentSlot, setActiveEquipmentSlot] = useState<EquipmentSlot>('fan');
    const [selectedItem, setSelectedItem] = useState<EncyclopediaItem | null>(null);
    const [activeConsumableCategory, setActiveConsumableCategory] = useState<ConsumableCategory>('장비상자');

    const itemsForTab = useMemo<EncyclopediaItem[]>(() => {
        if (mainTab === 'equipment') {
            return EQUIPMENT_POOL.filter(item => item.slot === activeEquipmentSlot).sort((a, b) => gradeOrder[a.grade] - gradeOrder[b.grade]);
        }
        if (mainTab === 'material') {
            return (Object.values(MATERIAL_ITEMS) as InventoryItem[]).sort((a,b) => gradeOrder[a.grade] - gradeOrder[b.grade]);
        }
        if (mainTab === 'consumable') {
            const keywordMap: Record<ConsumableCategory, string> = {
                '골드꾸러미': '골드 꾸러미',
                '다이아꾸러미': '다이아 꾸러미',
                '장비상자': '장비 상자',
                '재료상자': '재료 상자',
            };
            const keyword = keywordMap[activeConsumableCategory];
            const sorted = [...CONSUMABLE_ITEMS].filter(item => item.name.includes(keyword)).sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            return sorted;
        }
        return [];
    }, [mainTab, activeEquipmentSlot, activeConsumableCategory]);
    
    useEffect(() => {
        if (itemsForTab.length > 0) {
            if (!selectedItem || !itemsForTab.some(item => item.name === selectedItem.name)) {
                setSelectedItem(itemsForTab[0]);
            }
        } else {
            if (selectedItem) {
                setSelectedItem(null);
            }
        }
    }, [itemsForTab, selectedItem]);

    const renderEquipmentSubOptions = () => {
        if (!selectedItem || selectedItem.type !== 'equipment' || !selectedItem.slot) return null;
        const rules = GRADE_SUB_OPTION_RULES[selectedItem.grade];
        const formatCount = (count: [number, number]) => count[0] === count[1] ? `${count[0]}` : `${count[0]}~${count[1]}`;
        const hasMythic = rules.mythicCount[0] > 0;
        const combatPool = SUB_OPTION_POOLS[selectedItem.slot]?.[rules.combatTier] || [];

        const mainStatDef = MAIN_STAT_DEFINITIONS[selectedItem.slot];
        const mainStatGradeDef = mainStatDef.options[selectedItem.grade];
        const mainStatValue = mainStatGradeDef.value;
        const mainIsPercentage = mainStatDef.isPercentage;
        const mainStatNames = mainStatGradeDef.stats.join(' 또는 ');

        return (
            <>
                <h5 className="text-sm md:text-base font-semibold text-yellow-300 mt-3 border-b border-gray-600 pb-1">주옵션</h5>
                <p className="text-xs md:text-sm text-gray-300 py-1"><strong className="text-yellow-400">{mainStatNames}</strong>: +{mainStatValue}{mainIsPercentage ? '%' : ''}</p>

                <h5 className="text-sm md:text-base font-semibold text-blue-300 mt-3 border-b border-gray-600 pb-1">부옵션 (랜덤 {formatCount(rules.combatCount)}개)</h5>
                <ul className="space-y-1 text-[10px] md:text-xs text-gray-300 pt-1">
                    {combatPool.map((opt, index) => {
                        return <li key={`${opt.type}-${index}`}><strong className="text-blue-400">{opt.type}</strong>: +{opt.range[0]}~{opt.range[1]}{opt.isPercentage ? '%' : ''}</li>
                    })}
                </ul>

                <h5 className="text-sm md:text-base font-semibold text-green-300 mt-3 border-b border-gray-600 pb-1">특수 옵션 (랜덤 {formatCount(rules.specialCount)}개)</h5>
                <ul className="space-y-1 text-[10px] md:text-xs text-gray-300 pt-1">
                    {Object.entries(SPECIAL_STATS_DATA).map(([key, def]) => {
                        return (
                            <li key={key}>
                                <strong className="text-green-400">{def.name}</strong>: +{def.range[0]}~{def.range[1]}{def.isPercentage ? '%' : ''}
                            </li>
                        )
                    })}
                </ul>
                {hasMythic && (
                    <>
                        <h5 className="text-sm md:text-base font-semibold text-red-400 mt-3 border-b border-gray-600 pb-1">신화 옵션 (랜덤 {formatCount(rules.mythicCount)}개)</h5>
                         <ul className="space-y-1 text-[10px] md:text-xs text-gray-300 pt-1">
                            {Object.values(MythicStat).map(stat => {
                                const data = MYTHIC_STATS_DATA[stat];
                                return (
                                    <li key={stat}>
                                        <strong className="text-red-400">{data.name}</strong>: {data.description}
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                )}
            </>
        )
    }
    
    const renderHelpContent = () => (
        <div className="text-left text-gray-300 space-y-6 overflow-y-auto pr-2 h-full">
            <h3 className="text-2xl font-bold text-center text-yellow-300">도감 도움말 및 업데이트 내역</h3>
            <div>
                <h4 className="text-lg font-semibold text-green-400 border-b-2 border-green-400/50 pb-1 mb-2">최근 업데이트</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                    <li>장비 주옵션 강화 보너스 규칙이 변경되었습니다. (+4, +7, +10 강화 시 2배 보너스)</li>
                    <li>소모품 탭의 아이템 정렬 방식이 종류별로 개선되었습니다.</li>
                </ul>
            </div>
             <div>
                <h4 className="text-lg font-semibold text-blue-400 border-b-2 border-blue-400/50 pb-1 mb-2">도감 사용법</h4>
                <ul className="list-disc list-inside text-sm space-y-2">
                    <li>이 도감에서는 게임 내 모든 장비, 재료, 소모품의 상세 정보를 확인할 수 있습니다.</li>
                    <li><strong className="text-yellow-400">장비 탭:</strong> 각 부위별 장비의 등급에 따른 획득 가능 옵션과 능력치 범위를 볼 수 있습니다. 강화 규칙과 부옵션 획득 규칙도 확인 가능합니다.</li>
                    <li><strong className="text-yellow-400">재료/소모품 탭:</strong> 각 아이템의 설명과 등급을 확인할 수 있습니다.</li>
                    <li><strong className="text-yellow-400">도움말 탭:</strong> 새로운 업데이트나 주요 변경사항이 있을 때마다 이곳에서 안내해 드립니다.</li>
                </ul>
            </div>
            <div>
                <h4 className="text-lg font-semibold text-purple-400 border-b-2 border-purple-400/50 pb-1 mb-2">장비 옵션 상세</h4>
                <div className="space-y-3 text-sm">
                    <div>
                        <h5 className="font-semibold text-yellow-300">주옵션</h5>
                        <p className="text-xs text-gray-400 pl-4">1강화마다 획득 시 부여되는 수치만큼 추가됩니다. 별 색상이 은색에서 금색(+4), 금색에서 푸른색(+7), 푸른색에서 프리즘색(+10)이 될 때 각각 2배로 강화됩니다.</p>
                    </div>
                    <div>
                        <h5 className="font-semibold text-blue-300">부옵션</h5>
                        <p className="text-xs text-gray-400 pl-4">최대 4개까지 부여됩니다. 1강화마다 부옵션이 4개가 될 때까지 우선적으로 추가된 후, 4개가 모두 채워지면 기존 부옵션 중 하나가 랜덤하게 강화됩니다.</p>
                    </div>
                    <div>
                        <h5 className="font-semibold text-green-300">특수 옵션 & 신화 옵션</h5>
                        <p className="text-xs text-gray-400 pl-4">강화되지 않는 고유한 고정 옵션입니다. 신화 등급 장비에서만 신화 옵션이 등장합니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const layoutClasses = 'flex-row';

    return (
        <DraggableWindow title="도감" onClose={onClose} windowId="encyclopedia" initialWidth={900} isTopmost={isTopmost}>
             <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                <button onClick={() => setMainTab('equipment')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mainTab === 'equipment' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>장비</button>
                <button onClick={() => setMainTab('material')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mainTab === 'material' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>재료</button>
                <button onClick={() => setMainTab('consumable')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mainTab === 'consumable' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>소모품</button>
                <button onClick={() => setMainTab('help')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mainTab === 'help' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>도움말</button>
            </div>
            
            {mainTab === 'help' ? (
                <div className="h-[calc(var(--vh,1vh)*65)] bg-gray-900/50 rounded-lg p-4">
                    {renderHelpContent()}
                </div>
            ) : (
                <div className={`flex gap-4 h-[calc(var(--vh,1vh)*65)] ${layoutClasses}`}>
                    {/* Left Panel: Item Lists */}
                    <div className="flex flex-col gap-4 w-1/2 h-full">
                        {mainTab === 'consumable' && (
                            <div className="w-full bg-gray-900/50 rounded-lg p-2 flex-shrink-0">
                                <h3 className="text-lg font-bold mb-2 hidden md:block">종류</h3>
                                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden pb-1 md:pb-0 scrollbar-thin">
                                    {consumableCategories.map(cat => (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setActiveConsumableCategory(cat.id)} 
                                            className={`flex-shrink-0 whitespace-nowrap text-center rounded-md transition-colors px-3 py-1.5 text-xs md:text-left md:w-full md:px-4 md:py-2 md:text-sm ${activeConsumableCategory === cat.id ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {mainTab === 'equipment' && (
                            <div className="w-full bg-gray-900/50 rounded-lg p-2 flex-shrink-0">
                                <h3 className="text-lg font-bold mb-2 hidden md:block">부위</h3>
                                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden pb-1 md:pb-0 scrollbar-thin">
                                    {equipmentSlots.map(slot => (
                                        <button 
                                            key={slot} 
                                            onClick={() => setActiveEquipmentSlot(slot)} 
                                            className={`flex-shrink-0 whitespace-nowrap text-center rounded-md transition-colors px-3 py-1.5 text-xs md:text-left md:w-full md:px-4 md:py-2 md:text-sm ${activeEquipmentSlot === slot ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                        >
                                            {slotNames[slot]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="w-full bg-gray-900/50 rounded-lg p-2 flex flex-col min-h-0 flex-grow">
                            <h3 className="text-lg font-bold mb-2 flex-shrink-0">아이템 목록</h3>
                            <div className="flex flex-col space-y-1 overflow-y-auto pr-2 flex-grow">
                                {itemsForTab.map(item => (
                                    <button
                                        key={item.name}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 ${selectedItem?.name === item.name ? 'bg-blue-800/80' : 'hover:bg-gray-700/50'}`}
                                    >
                                        <div className="relative w-8 h-8 flex-shrink-0">
                                            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-sm" />
                                            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-0.5" />}
                                        </div>
                                        <span className={`${gradeStyles[item.grade].color} truncate`}>{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Panel: Item Viewer */}
                    <div className="bg-gray-900/50 rounded-lg flex flex-col items-center min-h-0 w-1/2 h-full p-2">
                        {selectedItem ? (
                             <>
                                <div className={`relative flex-shrink-0 ${mainTab === 'equipment' ? 'w-20 h-20 md:w-40 md:h-40' : 'w-24 h-24 md:w-40 md:h-40'}`}>
                                    <img src={gradeBackgrounds[selectedItem.grade]} alt={selectedItem.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
                                    {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="relative w-full h-full object-contain p-[15%]"/>}
                                </div>
                                <h3 className={`font-bold mt-2 md:mt-4 ${gradeStyles[selectedItem.grade].color} text-center ${mainTab === 'equipment' ? 'text-lg md:text-2xl' : 'text-xl md:text-2xl'}`}>{selectedItem.name}</h3>
                                <p className="text-xs md:text-sm text-gray-400 text-center">
                                    {selectedItem.type === 'equipment' ? (
                                        `[${gradeStyles[selectedItem.grade].name}] ${selectedItem.slot ? slotNames[selectedItem.slot] : ''}`
                                    ) : (
                                        mainTab === 'material' ? '재료' : '소모품'
                                    )}
                                </p>
                                {selectedItem.type === 'equipment' && 
                                    <p className="text-[10px] md:text-xs text-gray-400 mt-1">{`착용 레벨 합: ${GRADE_LEVEL_REQUIREMENTS[selectedItem.grade]}`}</p>
                                }
                                <div className="w-full flex-grow overflow-y-auto mt-2 pt-2 border-t border-gray-700 min-h-0 pr-2">
                                    {selectedItem.type === 'equipment' && renderEquipmentSubOptions()}
                                    {selectedItem.type !== 'equipment' && <p className="text-xs md:text-sm text-gray-300 py-1 text-center">{selectedItem.description}</p>}
                                </div>
                             </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p>아이템을 선택하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DraggableWindow>
    );
};

export default EncyclopediaModal;