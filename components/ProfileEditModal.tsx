

import React, { useState, useMemo, useCallback } from 'react';
import { UserWithStatus, ServerAction, AvatarInfo, BorderInfo } from '../types.js';
import { AVATAR_POOL, BORDER_POOL, RANKING_TIERS, SHOP_BORDER_ITEMS } from '../constants';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import Avatar from './Avatar.js';
import { containsProfanity } from '../profanity.js';
import ToggleSwitch from './ui/ToggleSwitch.js';
import { useAppContext } from '../hooks/useAppContext.js';


interface ProfileEditModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    isTopmost?: boolean;
}


type EditTab = 'avatar' | 'border' | 'nickname' | 'mbti';
type BorderCategory = '기본' | '레벨제한' | '구매테두리' | '전시즌보상';

const MBTI_DETAILS = {
  'E': { name: '외향 (E)', general: '사교적이며 활동적입니다. 외부 세계에 에너지를 쏟으며 사람들과의 교류를 즐깁니다.', goStyle: '적극적으로 전투를 이끌고 중앙을 중시하는 기풍입니다. 상대방과의 수싸움을 즐기며 판을 복잡하게 만드는 경향이 있습니다.' },
  'I': { name: '내향 (I)', general: '신중하고 조용하며, 내면 세계에 더 집중합니다. 깊이 있는 관계를 선호하며 혼자만의 시간을 통해 에너지를 얻습니다.', goStyle: '실리를 중시하며 견실하게 집을 짓는 기풍입니다. 상대의 도발에 쉽게 응하지 않으며, 조용히 형세를 유리하게 만듭니다.' },
  'S': { name: '감각 (S)', general: '현실적이고 실용적이며, 오감을 통해 정보를 받아들입니다. 현재에 집중하고 구체적인 사실을 중시합니다.', goStyle: '눈앞의 집과 실리에 집중하는 현실적인 기풍입니다. 정석과 기본적인 행마에 충실하며, 확실한 승리를 추구합니다.' },
  'N': { name: '직관 (N)', general: '상상력이 풍부하고 미래지향적입니다. 가능성과 의미를 탐구하며, 전체적인 그림을 보는 것을 선호합니다.', goStyle: '창의적이고 변칙적인 수를 선호하는 기풍입니다. 대세관이 뛰어나며, 판 전체를 아우르는 큰 그림을 그리며 둡니다.' },
  'T': { name: '사고 (T)', general: '논리적이고 분석적이며, 객관적인 사실을 바탕으로 결정을 내립니다. 공정함과 원칙을 중요하게 생각합니다.', goStyle: '냉철한 수읽기를 바탕으로 최선의 수를 찾아내는 이성적인 기풍입니다. 감정에 휘둘리지 않고 형세판단에 근거하여 둡니다.' },
  'F': { name: '감정 (F)', general: '공감 능력이 뛰어나고 사람들과의 관계를 중시합니다. 조화와 협력을 바탕으로 결정을 내리며, 타인의 감정을 고려합니다.', goStyle: '상대의 기세나 심리에 영향을 받는 감성적인 기풍입니다. 때로는 무리수처럼 보이는 과감한 수를 두기도 합니다.' },
  'J': { name: '판단 (J)', general: '체계적이고 계획적이며, 목표를 설정하고 달성하는 것을 선호합니다. 결정을 빨리 내리고 질서 있는 환경을 좋아합니다.', goStyle: '한번 정한 작전을 밀고 나가는 계획적인 기풍입니다. 정해진 목표를 향해 흔들림 없이 나아가며, 끝내기에 강한 모습을 보입니다.' },
  'P': { name: '인식 (P)', general: '융통성 있고 적응력이 뛰어나며, 상황에 따라 유연하게 대처합니다. 자율성을 중시하고 새로운 경험에 개방적입니다.', goStyle: '형세에 따라 유연하게 작전을 바꾸는 임기응변에 능한 기풍입니다. 정해진 수순보다 즉흥적인 감각으로 두는 것을 즐깁니다.' },
};

type MbtiState = {
    ei: 'E' | 'I';
    sn: 'S' | 'N';
    tf: 'T' | 'F';
    jp: 'J' | 'P';
};

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ currentUser, onClose, onAction, isTopmost }) => {
    const { handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<EditTab>('border');
    const [selectedAvatarId, setSelectedAvatarId] = useState(currentUser.avatarId);
    const [selectedBorderId, setSelectedBorderId] = useState(currentUser.borderId);
    const [newNickname, setNewNickname] = useState(currentUser.nickname);
    const [isMbtiPublic, setIsMbtiPublic] = useState(currentUser.isMbtiPublic || false);
    
    const parseMbti = (mbtiString: string | null | undefined): MbtiState => {
        if (mbtiString && mbtiString.length === 4) {
            return {
                ei: mbtiString[0] as 'E' | 'I',
                sn: mbtiString[1] as 'S' | 'N',
                tf: mbtiString[2] as 'T' | 'F',
                jp: mbtiString[3] as 'J' | 'P',
            };
        }
        return { ei: 'E', sn: 'S', tf: 'T', jp: 'J' };
    };

    const [mbti, setMbti] = useState<MbtiState>(parseMbti(currentUser.mbti));
    
    const nicknameChangeCost = 150;
    const canAffordNicknameChange = currentUser.diamonds >= nicknameChangeCost;

    const currentUserAvatarUrl = useMemo(() => AVATAR_POOL.find((a: AvatarInfo) => a.id === currentUser.avatarId)?.url, [currentUser.avatarId]);

    const handleSave = () => {
        switch (activeTab) {
            case 'avatar':
                if (selectedAvatarId !== currentUser.avatarId) {
                    onAction({ type: 'UPDATE_AVATAR', payload: { avatarId: selectedAvatarId } });
                }
                break;
            case 'border':
                 if (selectedBorderId !== currentUser.borderId) {
                    onAction({ type: 'UPDATE_BORDER', payload: { borderId: selectedBorderId } });
                }
                break;
            case 'nickname':
                if (newNickname !== currentUser.nickname) {
                    if (containsProfanity(newNickname)) {
                        alert("닉네임에 부적절한 단어가 포함되어 있습니다.");
                        return;
                    }
                    if (window.confirm(`다이아 ${nicknameChangeCost}개를 사용하여 닉네임을 '${newNickname}'(으)로 변경하시겠습니까?`)) {
                        onAction({ type: 'CHANGE_NICKNAME', payload: { newNickname } });
                    }
                }
                break;
            case 'mbti':
                const newMbtiString = `${mbti.ei}${mbti.sn}${mbti.tf}${mbti.jp}`;
                onAction({
                    type: 'UPDATE_MBTI',
                    payload: { mbti: newMbtiString, isMbtiPublic: true }
                });
                break;
        }
    };

    const isSaveDisabled = useMemo(() => {
        switch (activeTab) {
            case 'avatar': return selectedAvatarId === currentUser.avatarId;
            case 'border': return selectedBorderId === currentUser.borderId;
            case 'nickname': return newNickname === currentUser.nickname || !canAffordNicknameChange || newNickname.trim().length < 2 || newNickname.trim().length > 12;
            case 'mbti': {
                const newMbtiString = `${mbti.ei}${mbti.sn}${mbti.tf}${mbti.jp}`;
                return newMbtiString === (currentUser.mbti || '');
            }
            default: return true;
        }
    }, [activeTab, selectedAvatarId, selectedBorderId, newNickname, currentUser, canAffordNicknameChange, mbti]);

    const categorizedBorders = useMemo(() => {
        const isShopItem = (b: BorderInfo) => SHOP_BORDER_ITEMS.some(sb => sb.id === b.id);
        
        const categories: Record<BorderCategory, BorderInfo[]> = {
            '기본': [],
            '레벨제한': [],
            '구매테두리': [],
            '전시즌보상': [],
        };

        BORDER_POOL.forEach(border => {
            if (border.unlockTier) {
                categories['전시즌보상'].push(border);
            } else if (border.requiredLevelSum) {
                categories['레벨제한'].push(border);
            } else if (isShopItem(border)) {
                 categories['구매테두리'].push(border);
            } else {
                 categories['기본'].push(border);
            }
        });
        
        return categories;
    }, []);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'avatar':
                return (
                    <div className="flex flex-wrap justify-center gap-4">
                        {AVATAR_POOL.map((avatar: AvatarInfo) => {
                            const isUnlocked = avatar.type === 'any' || 
                                (avatar.type === 'strategy' && currentUser.strategyLevel >= avatar.requiredLevel) ||
                                (avatar.type === 'playful' && currentUser.playfulLevel >= avatar.requiredLevel);
                            
                            return (
                                <div key={avatar.id} onClick={() => isUnlocked && setSelectedAvatarId(avatar.id)} className={`relative p-2 rounded-lg border-2 ${selectedAvatarId === avatar.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700'} ${isUnlocked ? 'cursor-pointer hover:bg-gray-700/50' : 'opacity-50 cursor-not-allowed'}`}>
                                    <Avatar userId="preview" userName={avatar.name} avatarUrl={avatar.url} size={80} />
                                    <p className="text-xs text-center mt-1">{avatar.name}</p>
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center text-xs p-1 rounded-full">
                                            <span className="font-bold">잠김</span>
                                            <span>{avatar.type === 'strategy' ? '전략' : '놀이'} Lv.{avatar.requiredLevel}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            case 'border': {
                 const { ownedBorders, strategyLevel, playfulLevel, previousSeasonTier } = currentUser;
                 const userLevelSum = strategyLevel + playfulLevel;
                 const tierOrder = RANKING_TIERS.map((t) => t.name);

                return (
                    <div className="space-y-6">
                        {(Object.keys(categorizedBorders) as BorderCategory[]).map(category => {
                            const borders = categorizedBorders[category];
                            if (borders.length === 0) return null;
                            
                            return (
                                <div key={category} className="bg-gray-900/50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-yellow-300 mb-3 border-b border-gray-700 pb-2">{category}</h3>
                                    <div className="flex flex-wrap justify-start gap-4">
                                        {borders.map(border => {
                                            const isOwned = ownedBorders?.includes(border.id) || border.id === 'default' || border.id === 'simple_black';
                                            let isUnlockedByAchievement = false;
                                            let unlockText = border.description;
                                            
                                            if (border.unlockTier) {
                                                unlockText = `이전 시즌 ${border.unlockTier} 티어 필요`;
                                                if (previousSeasonTier) {
                                                    const requiredTierIndex = tierOrder.indexOf(border.unlockTier);
                                                    const userTierIndex = tierOrder.indexOf(previousSeasonTier);
                                                    if (requiredTierIndex !== -1 && userTierIndex !== -1 && userTierIndex <= requiredTierIndex) {
                                                        isUnlockedByAchievement = true;
                                                    }
                                                }
                                            } else if (border.requiredLevelSum) {
                                                unlockText = `레벨 합 ${border.requiredLevelSum} 필요`;
                                                if (userLevelSum >= border.requiredLevelSum) {
                                                    isUnlockedByAchievement = true;
                                                }
                                            }
                                            
                                            const isUnlocked = isOwned || isUnlockedByAchievement;
                                            const shopItem = SHOP_BORDER_ITEMS.find(b => b.id === border.id);
                                            const isPurchasable = shopItem && !isOwned;

                                            const handleClick = () => {
                                                if (isUnlocked) {
                                                    setSelectedBorderId(border.id);
                                                } else if (isPurchasable) {
                                                    const priceText = shopItem.price.gold ? `${shopItem.price.gold.toLocaleString()} 골드` : `${shopItem.price.diamonds?.toLocaleString()} 다이아`;
                                                    if (window.confirm(`'${border.name}' 테두리를 ${priceText}로 구매하시겠습니까?`)) {
                                                        onAction({ type: 'BUY_BORDER', payload: { borderId: border.id } });
                                                    }
                                                }
                                            };
                                            
                                            const isClickable = isUnlocked || isPurchasable;
                                            const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-not-allowed';
                                            const opacityClass = !isUnlocked && !isPurchasable ? 'opacity-50' : '';
                                            const title = isUnlocked ? border.description : (isPurchasable ? `클릭하여 구매: ${border.description}` : unlockText);

                                            return (
                                                <div key={border.id} onClick={handleClick} className={`relative flex flex-col items-center gap-1 p-1 rounded-lg ${cursorClass}`} title={title}>
                                                    <div className={`p-1 rounded-full relative ${selectedBorderId === border.id ? 'border-2 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-transparent'}`}>
                                                        <div className={opacityClass}>
                                                            <Avatar userId="preview" userName={border.name} avatarUrl={currentUserAvatarUrl} borderUrl={border.url} size={80} />
                                                        </div>
                                                        {!isUnlocked && !isPurchasable && (
                                                            <div className="absolute top-1 right-1 bg-gray-900/80 rounded-full p-1">
                                                                <span className="text-base" role="img" aria-label="Locked">🔒</span>
                                                            </div>
                                                        )}
                                                         {isPurchasable && (
                                                            <div className="absolute bottom-0 inset-x-0 bg-black/70 rounded-b-md text-xs py-0.5 text-center flex items-center justify-center gap-1">
                                                                {shopItem.price.gold ? <img src="/images/icon/Gold.png" alt="골드" className="w-3 h-3" /> : <img src="/images/icon/Zem.png" alt="다이아" className="w-3 h-3" />}
                                                                <span>{shopItem.price.gold?.toLocaleString() || shopItem.price.diamonds?.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-center truncate w-24">{border.name}</p>
                                                    {!isUnlocked && !isPurchasable && (
                                                        <p className="text-[10px] text-center text-red-400">
                                                            {border.requiredLevelSum ? `레벨합 ${border.requiredLevelSum}` : border.unlockTier ? `${border.unlockTier} 티어` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            case 'nickname':
                return (
                    <div className="space-y-4 max-w-sm mx-auto p-4">
                        <div>
                            <label htmlFor="nickname-input" className="block text-sm font-medium text-gray-300 mb-1">
                                새 닉네임 (2-12자)
                            </label>
                            <input
                                id="nickname-input"
                                type="text"
                                value={newNickname}
                                onChange={(e) => setNewNickname(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                                maxLength={12}
                                minLength={2}
                            />
                        </div>
                        <div className="text-sm p-3 rounded-md bg-gray-900/50">
                            <div className="flex justify-between">
                                <span>비용:</span>
                                <span className={`font-bold flex items-center gap-1 ${canAffordNicknameChange ? 'text-cyan-300' : 'text-red-400'}`}><img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" /> {nicknameChangeCost}</span>
                            </div>
                             <div className="flex justify-between mt-1">
                                <span>보유 다이아:</span>
                                <span className="font-bold flex items-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" /> {currentUser.diamonds.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'mbti': {
                const DichotomySelector: React.FC<{
                    title: string;
                    options: ('E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P')[];
                    selected: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
                    onSelect: (value: any) => void;
                }> = ({ title, options, selected, onSelect }) => (
                    <div className="bg-gray-900/50 p-3 rounded-lg flex-1">
                        <h4 className="font-semibold text-lg text-center mb-2">{title}</h4>
                        <div className="flex justify-center gap-2 mb-3">
                            {options.map(opt => (
                                <Button key={opt} onClick={() => onSelect(opt)} colorScheme={selected === opt ? 'blue' : 'gray'} className="w-24">
                                    {MBTI_DETAILS[opt].name}
                                </Button>
                            ))}
                        </div>
                        <div className="bg-gray-800/60 p-2 rounded-md text-xs min-h-[120px]">
                            <h5 className="font-bold text-yellow-300">일반적 성향</h5>
                            <p className="text-gray-300">{MBTI_DETAILS[selected].general}</p>
                            <h5 className="font-bold text-cyan-300 mt-2">바둑 성향</h5>
                            <p className="text-gray-300">{MBTI_DETAILS[selected].goStyle}</p>
                        </div>
                    </div>
                );

                const finalMbti = `${mbti.ei}${mbti.sn}${mbti.tf}${mbti.jp}`;

                return (
                     <div className="space-y-4">
                        <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                            <h3 className="text-lg font-bold text-yellow-300">MBTI란?</h3>
                            <p className="text-sm text-gray-300 mt-1">MBTI는 4가지 선호 지표를 조합하여 16가지 성격 유형으로 분류하는 자기보고식 성격 유형 검사입니다. 자신의 성향을 선택하고 다른 사람들과 공유해보세요!</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DichotomySelector title="에너지 방향" options={['E', 'I']} selected={mbti.ei} onSelect={v => setMbti(p => ({ ...p, ei: v as 'E' | 'I' }))} />
                            <DichotomySelector title="인식 기능" options={['S', 'N']} selected={mbti.sn} onSelect={v => setMbti(p => ({ ...p, sn: v as 'S' | 'N' }))} />
                            <DichotomySelector title="판단 기능" options={['T', 'F']} selected={mbti.tf} onSelect={v => setMbti(p => ({ ...p, tf: v as 'T' | 'F' }))} />
                            <DichotomySelector title="생활 양식" options={['J', 'P']} selected={mbti.jp} onSelect={v => setMbti(p => ({ ...p, jp: v as 'J' | 'P' }))} />
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                             <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">나의 MBTI:</span>
                                <span className="font-bold text-2xl text-green-400">{finalMbti}</span>
                            </div>
                            <ToggleSwitch
                                label="내 MBTI 프로필에 공개하기"
                                checked={isMbtiPublic}
                                onChange={setIsMbtiPublic}
                            />
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };
    
    const tabs: { id: EditTab; label: string }[] = [
        { id: 'avatar', label: '아바타' },
        { id: 'border', label: '테두리' },
        { id: 'nickname', label: '닉네임' },
        { id: 'mbti', label: 'MBTI' },
    ];

    return (
        <DraggableWindow title="프로필" onClose={onClose} windowId="profile-edit" initialWidth={750} isTopmost={isTopmost}>
            <div className="flex flex-col h-[70vh]">
                <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                            {tab.label}
                            {tab.id === 'mbti' && !currentUser.mbti && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {renderTabContent()}
                </div>
                <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleSave} colorScheme="green" disabled={isSaveDisabled}>
                        {activeTab === 'nickname' && !canAffordNicknameChange ? '다이아 부족' : '저장'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ProfileEditModal;
