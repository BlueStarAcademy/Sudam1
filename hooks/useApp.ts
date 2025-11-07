import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
// FIX: The main types barrel file now exports settings types. Use it for consistency.
import { User, LiveGameSession, UserWithStatus, ServerAction, GameMode, Negotiation, ChatMessage, UserStatus, AdminLog, Announcement, OverrideAnnouncement, InventoryItem, AppState, InventoryItemType, AppRoute, QuestReward, DailyQuestData, WeeklyQuestData, MonthlyQuestData, Theme, SoundSettings, FeatureSettings, AppSettings, CoreStat, SpecialStat, MythicStat, EquipmentSlot, EquipmentPreset } from '../types.js';
import { audioService } from '../services/audioService.js';
import { stableStringify, parseHash } from '../utils/appUtils.js';
import { 
    DAILY_MILESTONE_THRESHOLDS,
    WEEKLY_MILESTONE_THRESHOLDS,
    MONTHLY_MILESTONE_THRESHOLDS
} from '../constants.js';
import { defaultSettings, SETTINGS_STORAGE_KEY } from './useAppSettings.js';


export const useApp = () => {
    // --- State Management ---
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const stored = sessionStorage.getItem('currentUser');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) { console.error('Failed to parse user from sessionStorage', e); }
        return null;
    });

    const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => parseHash(window.location.hash));
    const currentRouteRef = useRef(currentRoute);
    const [error, setError] = useState<string | null>(null);
    const isLoggingOut = useRef(false);
    // 최근 액션 처리 시간을 추적하여 WebSocket 업데이트와의 충돌 방지
    const lastActionProcessedTime = useRef<number>(0);
    const lastActionType = useRef<string | null>(null);
    // 강제 리렌더링을 위한 카운터
    const [updateTrigger, setUpdateTrigger] = useState(0);


    
    // --- App Settings State ---
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                let parsed = JSON.parse(storedSettings);
                // Migration for old settings structure
                if (typeof parsed.theme === 'string') {
                    parsed = {
                        ...defaultSettings,
                        graphics: {
                            theme: parsed.theme,
                            panelColor: undefined,
                            textColor: undefined,
                        },
                        sound: parsed.sound || defaultSettings.sound,
                        features: parsed.features || defaultSettings.features,
                    };
                }
                // Deep merge to ensure new settings from code are not overwritten by old localStorage data
                return {
                    ...defaultSettings,
                    ...parsed,
                    graphics: { ...defaultSettings.graphics, ...(parsed.graphics || {}) },
                    sound: { ...defaultSettings.sound, ...(parsed.sound || {}) },
                    features: { ...defaultSettings.features, ...(parsed.features || {}) },
                };
            }
        } catch (error) { console.error('Error reading settings from localStorage', error); }
        return defaultSettings;
    });

    // --- Server State ---
    const [usersMap, setUsersMap] = useState<Record<string, User>>({});
    const [onlineUsers, setOnlineUsers] = useState<UserWithStatus[]>([]);
    const [liveGames, setLiveGames] = useState<Record<string, LiveGameSession>>({});  // 일반 게임만
    const [singlePlayerGames, setSinglePlayerGames] = useState<Record<string, LiveGameSession>>({});  // 싱글플레이 게임
    const [towerGames, setTowerGames] = useState<Record<string, LiveGameSession>>({});  // 도전의 탑 게임
    const [negotiations, setNegotiations] = useState<Record<string, Negotiation>>({});
    const [waitingRoomChats, setWaitingRoomChats] = useState<Record<string, ChatMessage[]>>({});
    const [gameChats, setGameChats] = useState<Record<string, ChatMessage[]>>({});
    const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
    const [gameModeAvailability, setGameModeAvailability] = useState<Partial<Record<GameMode, boolean>>>({});
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [globalOverrideAnnouncement, setGlobalOverrideAnnouncement] = useState<OverrideAnnouncement | null>(null);
    const [announcementInterval, setAnnouncementInterval] = useState(3);
    
    // --- UI Modals & Toasts ---
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMailboxOpen, setIsMailboxOpen] = useState(false);
    const [isQuestsOpen, setIsQuestsOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [shopInitialTab, setShopInitialTab] = useState<'equipment' | 'materials' | 'consumables' | 'misc' | undefined>(undefined);
    const [lastUsedItemResult, setLastUsedItemResult] = useState<InventoryItem[] | null>(null);
    const [tournamentScoreChange, setTournamentScoreChange] = useState<{ oldScore: number; newScore: number; scoreReward: number } | null>(null);
    const [disassemblyResult, setDisassemblyResult] = useState<{ gained: { name: string, amount: number }[], jackpot: boolean } | null>(null);
    const [craftResult, setCraftResult] = useState<{ gained: { name: string; amount: number }[]; used: { name: string; amount: number }[]; craftType: 'upgrade' | 'downgrade'; jackpot?: boolean } | null>(null);
    const [rewardSummary, setRewardSummary] = useState<{ reward: QuestReward; items: InventoryItem[]; title: string } | null>(null);
    const [isClaimAllSummaryOpen, setIsClaimAllSummaryOpen] = useState(false);
    const [claimAllSummary, setClaimAllSummary] = useState<{ gold: number; diamonds: number; actionPoints: number } | null>(null);
    const [viewingUser, setViewingUser] = useState<UserWithStatus | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
    const [isStatAllocationModalOpen, setIsStatAllocationModalOpen] = useState(false);
    const [enhancementResult, setEnhancementResult] = useState<{ message: string; success: boolean } | null>(null);
    const [enhancementOutcome, setEnhancementOutcome] = useState<{ message: string; success: boolean; itemBefore: InventoryItem; itemAfter: InventoryItem; } | null>(null);
    const [enhancementAnimationTarget, setEnhancementAnimationTarget] = useState<{ itemId: string; stars: number } | null>(null);
    const [pastRankingsInfo, setPastRankingsInfo] = useState<{ user: UserWithStatus; mode: GameMode | 'strategic' | 'playful'; } | null>(null);
    const [enhancingItem, setEnhancingItem] = useState<InventoryItem | null>(null);
    const [viewingItem, setViewingItem] = useState<{ item: InventoryItem; isOwnedByCurrentUser: boolean; } | null>(null);
    const [showExitToast, setShowExitToast] = useState(false);
    const exitToastTimer = useRef<number | null>(null);
    const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
    const [moderatingUser, setModeratingUser] = useState<UserWithStatus | null>(null);
    const [isMbtiInfoModalOpen, setIsMbtiInfoModalOpen] = useState(false);
    const [isEquipmentEffectsModalOpen, setIsEquipmentEffectsModalOpen] = useState(false);
    const [isBlacksmithModalOpen, setIsBlacksmithModalOpen] = useState(false);
    const [blacksmithSelectedItemForEnhancement, setBlacksmithSelectedItemForEnhancement] = useState<InventoryItem | null>(null);
    const [blacksmithActiveTab, setBlacksmithActiveTab] = useState<'enhance' | 'combine' | 'disassemble' | 'convert'>('enhance');
    const [combinationResult, setCombinationResult] = useState<{ item: InventoryItem; xpGained: number; isGreatSuccess: boolean; } | null>(null);
    const [isBlacksmithHelpOpen, setIsBlacksmithHelpOpen] = useState(false);
    const [isEnhancementResultModalOpen, setIsEnhancementResultModalOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (error) { console.error('Error saving settings to localStorage', error); }
        
        const root = document.documentElement;
        if (settings.graphics.panelColor) {
            root.style.setProperty('--custom-panel-bg', settings.graphics.panelColor);
        } else {
            root.style.removeProperty('--custom-panel-bg');
        }
        if (settings.graphics.textColor) {
            root.style.setProperty('--custom-text-color', settings.graphics.textColor);
        } else {
            root.style.removeProperty('--custom-text-color');
        }

    }, [settings]);



    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.graphics.theme);
    }, [settings.graphics.theme]);

    useEffect(() => {
        audioService.updateSettings(settings.sound);
    }, [settings.sound]);

    const updateTheme = useCallback((theme: Theme) => {
        setSettings(s => ({ 
            ...s, 
            graphics: { 
                ...s.graphics, 
                theme,
                panelColor: undefined, 
                textColor: undefined,
            } 
        }));
    }, []);

    const updatePanelColor = useCallback((color: string) => {
        setSettings(s => ({ ...s, graphics: { ...s.graphics, panelColor: color }}));
    }, []);

    const updateTextColor = useCallback((color: string) => {
        setSettings(s => ({ ...s, graphics: { ...s.graphics, textColor: color }}));
    }, []);
    
    const resetGraphicsToDefault = useCallback(() => {
        setSettings(s => ({ ...s, graphics: { ...s.graphics, panelColor: undefined, textColor: undefined } }));
    }, []);

    const updateSoundSetting = useCallback(<K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) => {
        setSettings(s => ({ ...s, sound: { ...s.sound, [key]: value } }));
    }, []);

    const updateFeatureSetting = useCallback(<K extends keyof FeatureSettings>(key: K, value: FeatureSettings[K]) => {
        setSettings(s => ({ ...s, features: { ...s.features, [key]: value } }));
    }, []);

    // --- Derived State ---
    const allUsers = useMemo(() => {
        if (!usersMap || typeof usersMap !== 'object') return [];
        return Object.values(usersMap);
    }, [usersMap]);

    const currentUserWithStatus: UserWithStatus | null = useMemo(() => {
        // updateTrigger를 dependency에 포함시켜 강제 리렌더링 보장
        if (!currentUser) return null;
        if (!Array.isArray(onlineUsers)) return { ...currentUser, status: 'online' as UserStatus };
        const statusInfo = onlineUsers.find(u => u && u.id === currentUser.id);
        return { ...currentUser, ...(statusInfo || { status: 'online' as UserStatus }) };
    }, [currentUser, onlineUsers, updateTrigger]);

    const activeGame = useMemo(() => {
        if (!currentUserWithStatus) return null;
        const gameId = currentUserWithStatus.gameId || currentUserWithStatus.spectatingGameId;
        if (gameId) {
            // status가 'in-game'이거나 'spectating'이면 게임으로 라우팅
            // 'negotiating' 상태는 제거 (대국 신청 중에는 게임이 아님)
            if (currentUserWithStatus.status === 'in-game' || currentUserWithStatus.status === 'spectating') {
                // 모든 게임 카테고리에서 찾기
                const game = liveGames[gameId] || singlePlayerGames[gameId] || towerGames[gameId];
                if (game) {
                    console.log('[useApp] activeGame calculated:', gameId, 'status:', currentUserWithStatus.status, 'category:', game.gameCategory);
                    return game;
                } else {
                    console.log('[useApp] activeGame: gameId exists but game not found in any category yet:', gameId);
                }
            }
        }
        return null;
    }, [currentUserWithStatus, liveGames, singlePlayerGames, towerGames]);

    const activeNegotiation = useMemo(() => {
        if (!currentUserWithStatus) return null;
        if (!negotiations || typeof negotiations !== 'object' || Array.isArray(negotiations)) {
            return null;
        }
        try {
            const negotiationsArray = Object.values(negotiations);
            // 현재 사용자와 관련된 모든 negotiation 필터링
            const relevantNegotiations = negotiationsArray.filter(neg => 
                neg && neg.challenger && neg.opponent &&
                ((neg.challenger.id === currentUserWithStatus.id && (neg.status === 'pending' || neg.status === 'draft')) ||
                (neg.opponent.id === currentUserWithStatus.id && neg.status === 'pending'))
            );
            
            if (relevantNegotiations.length === 0) return null;
            
            // 가장 먼저 온 신청서 선택 (deadline이 가장 이른 것, 또는 deadline이 같으면 생성 시간 기준)
            // deadline이 없으면 생성 시간(id에 포함된 timestamp 또는 생성 순서) 기준
            const sorted = relevantNegotiations.sort((a, b) => {
                // deadline이 있으면 deadline 기준으로 정렬 (더 이른 deadline이 우선)
                if (a.deadline && b.deadline) {
                    return a.deadline - b.deadline;
                }
                if (a.deadline) return -1; // a에만 deadline이 있으면 a가 우선
                if (b.deadline) return 1; // b에만 deadline이 있으면 b가 우선
                // deadline이 둘 다 없으면 id의 타임스탬프 비교 (나중에 생성된 것이 더 큰 id를 가짐)
                return a.id.localeCompare(b.id);
            });
            
            return sorted[0] || null;
        } catch (error) {
            console.error('[activeNegotiation] Error:', error);
            return null;
        }
    }, [currentUserWithStatus, negotiations]);

    const unreadMailCount = useMemo(() => {
        if (!currentUser || !currentUser.mail || !Array.isArray(currentUser.mail)) {
            return 0;
        }
        return currentUser.mail.filter(m => m && !m.isRead).length;
    }, [currentUser?.mail]);

    const hasClaimableQuest = useMemo(() => {
        if (!currentUser?.quests) return false;
        const { daily, weekly, monthly } = currentUser.quests;
    
        const checkQuestList = (questData?: DailyQuestData | WeeklyQuestData | MonthlyQuestData) => {
            if (!questData) return false;
            return questData.quests.some(q => q.progress >= q.target && !q.isClaimed);
        };
    
        const checkMilestones = (questData?: DailyQuestData | WeeklyQuestData | MonthlyQuestData, thresholds?: number[]) => {
            if (!questData || !thresholds) return false;
            return questData.claimedMilestones.some((claimed, index) => {
                return !claimed && questData.activityProgress >= thresholds[index];
            });
        };
    
        return checkQuestList(daily) ||
               checkQuestList(weekly) ||
               checkQuestList(monthly) ||
               checkMilestones(daily, DAILY_MILESTONE_THRESHOLDS) ||
               checkMilestones(weekly, WEEKLY_MILESTONE_THRESHOLDS) ||
               checkMilestones(monthly, MONTHLY_MILESTONE_THRESHOLDS);
    }, [currentUser?.quests]);
    
    const showError = (message: string) => {
        let displayMessage = message;
        if (message.includes('Invalid move: ko')) {
            displayMessage = "패 모양입니다. 다른 곳에 착수 후 다시 둘 수 있는 자리입니다.";
        } else if (message.includes('action point')) {
            displayMessage = "상대방의 행동력이 충분하지 않습니다.";
        }
        setError(displayMessage);
        setTimeout(() => setError(null), 5000);
    };
    
    useEffect(() => {
        if (currentUser) {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('[useApp] currentUser updated:', {
                id: currentUser.id,
                inventoryLength: currentUser.inventory?.length,
                gold: currentUser.gold,
                diamonds: currentUser.diamonds
            });
        } else {
            sessionStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    // --- Action Handler ---
    const handleAction = useCallback(async (action: ServerAction) => {
        if (action.type === 'CLEAR_TOURNAMENT_SESSION') {
            setCurrentUser(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    lastNeighborhoodTournament: null,
                    lastNationalTournament: null,
                    lastWorldTournament: null,
                };
            });
        }
        // Optimistic update는 제거 - 서버 응답에만 의존
        // TOGGLE_EQUIP_ITEM의 optimistic update는 서버 응답과 충돌할 수 있으므로 제거
        if (action.type === 'SAVE_PRESET') {
            setCurrentUser(prevUser => {
                if (!prevUser) return null;
                const { preset, index } = action.payload;
                const newPresets = [...(prevUser.equipmentPresets || [])];
                newPresets[index] = preset;
                return { ...prevUser, equipmentPresets: newPresets };
            });
        }

        try {
            audioService.initialize();
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...action, userId: currentUser?.id }),
            });

            if (!res.ok) {
                let errorMessage = 'An unknown error occurred.';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    console.error(`[handleAction] ${action.type} - HTTP ${res.status} error:`, errorData);
                } catch (parseError) {
                    console.error(`[handleAction] ${action.type} - Failed to parse error response:`, parseError);
                    errorMessage = `서버 오류 (${res.status})`;
                }
                showError(errorMessage);
                if (action.type === 'TOGGLE_EQUIP_ITEM' || action.type === 'USE_ITEM') {
                    setCurrentUser(prevUser => prevUser ? { ...prevUser } : null);
                }
            } else {
                const result = await res.json();
                if (result.error || result.message) {
                    const errorMessage = result.message || result.error || '서버 오류가 발생했습니다.';
                    console.error(`[handleAction] ${action.type} - Server returned error:`, errorMessage);
                    showError(errorMessage);
                    return;
                }
                console.log(`[handleAction] ${action.type} - Response received:`, {
                    hasUpdatedUser: !!result.updatedUser,
                    hasClientResponse: !!result.clientResponse,
                    hasClientResponseUpdatedUser: !!result.clientResponse?.updatedUser,
                    hasRedirectToTournament: !!result.clientResponse?.redirectToTournament,
                    redirectToTournament: result.clientResponse?.redirectToTournament || result.redirectToTournament,
                    hasObtainedItemsBulk: !!result.obtainedItemsBulk,
                    hasClientResponseObtainedItemsBulk: !!result.clientResponse?.obtainedItemsBulk,
                    hasRewardSummary: !!result.rewardSummary,
                    hasDisassemblyResult: !!result.disassemblyResult,
                    hasCombinationResult: !!result.combinationResult,
                    hasEnhancementOutcome: !!result.enhancementOutcome,
                    hasCraftResult: !!result.craftResult,
                    resultKeys: Object.keys(result),
                    clientResponseKeys: result.clientResponse ? Object.keys(result.clientResponse) : [],
                    fullResult: result
                });
                
                // 서버 응답 구조: { success: true, ...result.clientResponse }
                // 따라서 result.updatedUser 또는 result.clientResponse?.updatedUser 확인
                const updatedUserFromResponse = result.updatedUser || result.clientResponse?.updatedUser;
                
                if (updatedUserFromResponse) {
                    // 깊은 복사를 수행하여 React가 변경을 감지하도록 함
                    const partialUpdate = JSON.parse(JSON.stringify(updatedUserFromResponse));
                    
                    // 부분 업데이트인 경우 기존 currentUser와 병합
                    // 배열이나 객체 필드는 완전히 교체 (부분 병합하지 않음)
                    const updatedUser = currentUser ? {
                        ...currentUser,
                        ...partialUpdate,
                        // 배열 필드들은 완전히 교체
                        inventory: partialUpdate.inventory !== undefined ? partialUpdate.inventory : currentUser.inventory,
                        mail: partialUpdate.mail !== undefined ? partialUpdate.mail : currentUser.mail,
                        ownedBorders: partialUpdate.ownedBorders !== undefined ? partialUpdate.ownedBorders : currentUser.ownedBorders,
                        equipmentPresets: partialUpdate.equipmentPresets !== undefined ? partialUpdate.equipmentPresets : currentUser.equipmentPresets,
                        // 객체 필드들도 완전히 교체
                        equipment: partialUpdate.equipment !== undefined ? partialUpdate.equipment : currentUser.equipment,
                        quests: partialUpdate.quests !== undefined ? partialUpdate.quests : currentUser.quests,
                        inventorySlots: partialUpdate.inventorySlots !== undefined ? partialUpdate.inventorySlots : currentUser.inventorySlots,
                        actionPoints: partialUpdate.actionPoints !== undefined ? partialUpdate.actionPoints : currentUser.actionPoints,
                        spentStatPoints: partialUpdate.spentStatPoints !== undefined ? partialUpdate.spentStatPoints : currentUser.spentStatPoints,
                        baseStats: partialUpdate.baseStats !== undefined ? partialUpdate.baseStats : currentUser.baseStats,
                        stats: partialUpdate.stats !== undefined ? partialUpdate.stats : currentUser.stats,
                        dailyShopPurchases: partialUpdate.dailyShopPurchases !== undefined ? partialUpdate.dailyShopPurchases : currentUser.dailyShopPurchases,
                        lastNeighborhoodTournament: partialUpdate.lastNeighborhoodTournament !== undefined ? partialUpdate.lastNeighborhoodTournament : currentUser.lastNeighborhoodTournament,
                        lastNationalTournament: partialUpdate.lastNationalTournament !== undefined ? partialUpdate.lastNationalTournament : currentUser.lastNationalTournament,
                        lastWorldTournament: partialUpdate.lastWorldTournament !== undefined ? partialUpdate.lastWorldTournament : currentUser.lastWorldTournament,
                        singlePlayerProgress: partialUpdate.singlePlayerProgress !== undefined ? partialUpdate.singlePlayerProgress : currentUser.singlePlayerProgress,
                    } : partialUpdate;
                    
                    console.log(`[handleAction] ${action.type} - Setting updatedUser:`, {
                        inventoryLength: updatedUser.inventory?.length,
                        gold: updatedUser.gold,
                        diamonds: updatedUser.diamonds,
                        equipment: updatedUser.equipment,
                        avatarId: updatedUser.avatarId,
                        borderId: updatedUser.borderId,
                        nickname: updatedUser.nickname,
                        blacksmithLevel: updatedUser.blacksmithLevel,
                        blacksmithXp: updatedUser.blacksmithXp,
                        beforeInventoryLength: currentUser?.inventory?.length,
                        hasInventoryChanged: JSON.stringify(currentUser?.inventory) !== JSON.stringify(updatedUser.inventory),
                        hasEquipmentChanged: JSON.stringify(currentUser?.equipment) !== JSON.stringify(updatedUser.equipment),
                        hasProfileChanged: currentUser?.avatarId !== updatedUser.avatarId || currentUser?.borderId !== updatedUser.borderId || currentUser?.nickname !== updatedUser.nickname,
                        hasBlacksmithChanged: currentUser?.blacksmithLevel !== updatedUser.blacksmithLevel || currentUser?.blacksmithXp !== updatedUser.blacksmithXp
                    });
                    // 최근 액션 처리 시간 기록 (WebSocket 업데이트 무시를 위해)
                    // HTTP 응답의 updatedUser가 항상 최신이므로, 이를 기록하여 WebSocket이 오래된 데이터를 덮어쓰지 않도록 함
                    lastActionProcessedTime.current = Date.now();
                    lastActionType.current = action.type;
                    
                    // 즉시 상태 업데이트 (동기적으로 처리하여 확실히 반영)
                    // flushSync를 직접 사용하여 즉시 반영 (비동기 Promise 사용하지 않음)
                    const newUser = JSON.parse(JSON.stringify(updatedUser));
                    
                    // USE_ITEM 액션의 경우 인벤토리 변경이 확실히 반영되도록 추가 처리
                    if (action.type === 'USE_ITEM' || action.type === 'USE_ALL_ITEMS_OF_TYPE') {
                        console.log(`[handleAction] ${action.type} - Force updating inventory state`, {
                            oldInventoryLength: currentUser?.inventory?.length,
                            newInventoryLength: newUser.inventory?.length,
                            oldInventory: currentUser?.inventory?.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity })),
                            newInventory: newUser.inventory?.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity }))
                        });
                    }
                    
                    // 즉시 동기적으로 상태 업데이트
                    flushSync(() => {
                        setCurrentUser(newUser);
                        setUpdateTrigger(prev => prev + 1);
                    });
                    
                    // 추가 업데이트로 모든 컴포넌트가 변경을 감지하도록 함
                    requestAnimationFrame(() => {
                        flushSync(() => {
                            // 깊은 복사로 새로운 객체 생성하여 React가 변경을 확실히 감지
                            const freshUser = JSON.parse(JSON.stringify(updatedUser));
                            setCurrentUser(freshUser);
                            setUpdateTrigger(prev => prev + 1);
                        });
                    });
                    
                    // setTimeout으로 추가 보장 (인벤토리 모달 등이 열려있을 경우 대비)
                    setTimeout(() => {
                        const freshUser = JSON.parse(JSON.stringify(updatedUser));
                        setCurrentUser(freshUser);
                        setUpdateTrigger(prev => prev + 1);
                    }, 0);
                    
                    // 추가 리렌더링 트리거 (특히 인벤토리 모달)
                    setTimeout(() => {
                        setUpdateTrigger(prev => prev + 1);
                    }, 10);
                    
                    // 인벤토리 관련 액션의 경우 추가로 한 번 더 업데이트하여 확실히 반영
                    if (action.type === 'USE_ITEM' || action.type === 'USE_ALL_ITEMS_OF_TYPE' || action.type === 'TOGGLE_EQUIP_ITEM' || action.type === 'SELL_ITEM' || action.type === 'USE_CONDITION_POTION' || action.type === 'BUY_CONDITION_POTION') {
                        setTimeout(() => {
                            const freshUser = JSON.parse(JSON.stringify(updatedUser));
                            setCurrentUser(freshUser);
                            setUpdateTrigger(prev => prev + 1);
                        }, 50);
                    }
                    
                    // HTTP 응답에서 받은 updatedUser가 최신이므로, WebSocket 업데이트가 이를 덮어쓰지 않도록 보장
                    // (이미 위의 shouldIgnoreWebSocketUpdate 로직과 추가 체크로 처리됨)
                } else {
                    // updatedUser가 없는 것은 정상입니다 (일부 액션만 updatedUser를 반환)
                    // 경고는 updatedUser를 반환해야 하는 액션에서만 표시
                    const actionsThatShouldHaveUpdatedUser = [
                        'TOGGLE_EQUIP_ITEM', 'USE_ITEM', 'USE_ALL_ITEMS_OF_TYPE', 'ENHANCE_ITEM', 
                        'COMBINE_ITEMS', 'DISASSEMBLE_ITEM', 'CRAFT_MATERIAL', 'BUY_SHOP_ITEM', 
                        'BUY_CONDITION_POTION', 'USE_CONDITION_POTION', 'UPDATE_AVATAR', 
                        'UPDATE_BORDER', 'CHANGE_NICKNAME', 'UPDATE_MBTI', 'ALLOCATE_STAT_POINT',
                        'SELL_ITEM', 'EXPAND_INVENTORY', 'BUY_BORDER', 'APPLY_PRESET', 'SAVE_PRESET',
                        'DELETE_MAIL', 'DELETE_ALL_CLAIMED_MAIL', 'CLAIM_MAIL_ATTACHMENTS', 
                        'CLAIM_ALL_MAIL_ATTACHMENTS', 'MARK_MAIL_AS_READ',
                        'CLAIM_QUEST_REWARD', 'CLAIM_ACTIVITY_MILESTONE',
                        'CLAIM_SINGLE_PLAYER_MISSION_REWARD', 'LEVEL_UP_TRAINING_QUEST'
                    ];
                    if (actionsThatShouldHaveUpdatedUser.includes(action.type)) {
                        console.warn(`[handleAction] ${action.type} - No updatedUser in response!`, {
                            hasClientResponse: !!result.clientResponse,
                            clientResponseKeys: result.clientResponse ? Object.keys(result.clientResponse) : [],
                            resultKeys: Object.keys(result)
                        });
                    }
                }
                 // 사용자 데이터가 변경될 수 있는 모든 액션 목록
                const userDataChangingActions = [
                    'TOGGLE_EQUIP_ITEM', 'USE_ITEM', 'USE_ALL_ITEMS_OF_TYPE', 'ENHANCE_ITEM', 'COMBINE_ITEMS', 'DISASSEMBLE_ITEM', 
                    'CRAFT_MATERIAL', 'BUY_SHOP_ITEM', 'BUY_CONDITION_POTION', 'USE_CONDITION_POTION', 'UPDATE_AVATAR', 
                    'UPDATE_BORDER', 'CHANGE_NICKNAME', 'UPDATE_MBTI', 'ALLOCATE_STAT_POINT',
                    'SELL_ITEM', 'EXPAND_INVENTORY', 'BUY_BORDER', 'APPLY_PRESET', 'SAVE_PRESET',
                    'DELETE_MAIL', 'DELETE_ALL_CLAIMED_MAIL', 'CLAIM_MAIL_ATTACHMENTS', 'CLAIM_ALL_MAIL_ATTACHMENTS', 'MARK_MAIL_AS_READ',
                    'CLAIM_QUEST_REWARD', 'CLAIM_ACTIVITY_MILESTONE',
                    'CLAIM_SINGLE_PLAYER_MISSION_REWARD', 'LEVEL_UP_TRAINING_QUEST',
                    'ADMIN_RESET_TOURNAMENT_SESSION'
                ];
                 
                // 업데이트된 사용자 데이터 처리 - 모든 사용자 데이터 변경 액션에 대해 즉시 동기 처리
                 const updatedUser = result.clientResponse?.updatedUser;
                 if (updatedUser) {
                     // HTTP 응답의 updatedUser를 항상 최우선으로 처리 (userDataChangingActions 체크 제거)
                     // flushSync를 사용하여 React가 즉시 상태를 업데이트하도록 보장
                     console.log(`[handleAction] ${action.type} - Immediately updating currentUser from HTTP response:`, {
                         inventoryLength: updatedUser.inventory?.length,
                         gold: updatedUser.gold,
                         diamonds: updatedUser.diamonds,
                         equipment: updatedUser.equipment,
                         actionType: action.type,
                         hasUpdatedUser: !!updatedUser
                     });
                     
                     // 즉시 동기 업데이트 (여러 번 수행하여 확실히 반영)
                     const deepCopiedUser = JSON.parse(JSON.stringify(updatedUser));
                     
                     // 첫 번째: flushSync로 즉시 반영
                     flushSync(() => {
                         setCurrentUser(deepCopiedUser);
                         setUpdateTrigger(prev => prev + 1);
                     });
                     
                     // 두 번째: requestAnimationFrame으로 다음 프레임에 재확인
                     requestAnimationFrame(() => {
                         flushSync(() => {
                             setCurrentUser(JSON.parse(JSON.stringify(updatedUser)));
                         setUpdateTrigger(prev => prev + 1);
                         });
                     });
                     
                     // 세 번째: 추가 보장을 위한 업데이트
                     setTimeout(() => {
                         setCurrentUser(JSON.parse(JSON.stringify(updatedUser)));
                             setUpdateTrigger(prev => prev + 1);
                     }, 0);
                     
                     // WebSocket 업데이트와의 충돌을 방지하기 위해 액션 타입과 시간 기록
                     lastActionProcessedTime.current = Date.now();
                     lastActionType.current = action.type;
                     
                     // sessionStorage에도 저장하여 페이지 새로고침 시에도 상태 유지
                     try {
                         sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
                     } catch (e) {
                         console.error('Failed to save user to sessionStorage', e);
                     }
                 }
                 
                 const obtainedItemsBulk = result.clientResponse?.obtainedItemsBulk || result.obtainedItemsBulk;
                 if (obtainedItemsBulk) setLastUsedItemResult(obtainedItemsBulk);
                 const scoreChange = result.clientResponse?.tournamentScoreChange;
                 if (scoreChange) setTournamentScoreChange(scoreChange);
                
                 if (result.rewardSummary) setRewardSummary(result.rewardSummary);
                
                // 싱글플레이 수련과제 보상 수령 모달
                if (action.type === 'CLAIM_SINGLE_PLAYER_MISSION_REWARD' && result.clientResponse?.reward) {
                    const reward = result.clientResponse.reward;
                    setRewardSummary({
                        reward: reward,
                        items: [],
                        title: '수련과제 보상 수령'
                    });
                }
                
                if (result.claimAllSummary) {
                    setClaimAllSummary(result.claimAllSummary);
                    setIsClaimAllSummaryOpen(true);
                }
                const disassemblyResult = result.clientResponse?.disassemblyResult || result.disassemblyResult;
                if (disassemblyResult) { 
                    setDisassemblyResult(disassemblyResult);
                    if (disassemblyResult.jackpot) audioService.disassemblyJackpot();
                }
                const craftResult = result.clientResponse?.craftResult || result.craftResult;
                if (craftResult) {
                    console.log(`[handleAction] ${action.type} - Setting craftResult:`, {
                        craftResult,
                        hasCraftResult: !!craftResult,
                        gained: craftResult.gained,
                        used: craftResult.used,
                        craftType: craftResult.craftType,
                        jackpot: craftResult.jackpot
                    });
                    // 상태 업데이트를 즉시 동기적으로 처리하여 결과 모달이 확실히 표시되도록 함
                    flushSync(() => {
                        setCraftResult(craftResult);
                    });
                    // 대박 발생 시 사운드 재생
                    if (craftResult.jackpot) {
                        audioService.disassemblyJackpot();
                    }
                    // 추가 디버깅: 상태가 설정되었는지 확인
                    console.log(`[handleAction] ${action.type} - craftResult state set, should trigger modal`);
                } else {
                    // craftResult가 없는 것은 정상입니다 (일부 액션만 craftResult를 반환)
                    // 경고는 craftResult를 반환해야 하는 액션에서만 표시
                    const actionsThatShouldHaveCraftResult = ['CRAFT_MATERIAL', 'CONVERT_MATERIAL'];
                    if (actionsThatShouldHaveCraftResult.includes(action.type)) {
                        console.warn(`[handleAction] ${action.type} - No craftResult in response!`, {
                            hasClientResponse: !!result.clientResponse,
                            hasCraftResult: !!result.craftResult,
                            clientResponseKeys: result.clientResponse ? Object.keys(result.clientResponse) : [],
                            resultKeys: Object.keys(result)
                        });
                    }
                }
                const combinationResult = result.clientResponse?.combinationResult || result.combinationResult;
                if (combinationResult) {
                    setCombinationResult(combinationResult);
                    if (combinationResult.isGreatSuccess) {
                        audioService.combinationGreatSuccess(); // Assuming this sound exists
                    } else {
                        audioService.combinationSuccess(); // Assuming this sound exists
                    }
                }
                const enhancementOutcome = result.clientResponse?.enhancementOutcome || result.enhancementOutcome;
                if (enhancementOutcome) {
                    const { message, success, itemBefore, itemAfter } = enhancementOutcome;
                    setEnhancementResult({ message, success });
                    setEnhancementOutcome({ message, success, itemBefore, itemAfter });
                    setIsEnhancementResultModalOpen(true);
                    const enhancementAnimationTarget = result.clientResponse?.enhancementAnimationTarget || result.enhancementAnimationTarget;
                    if (enhancementAnimationTarget) {
                        setEnhancementAnimationTarget(enhancementAnimationTarget);
                    }
                    if (success) {
                        audioService.enhancementSuccess();
                    } else {
                        audioService.enhancementFail();
                    }
                }
                if (result.enhancementAnimationTarget) setEnhancementAnimationTarget(result.enhancementAnimationTarget);
                const redirectToTournament = result.clientResponse?.redirectToTournament || result.redirectToTournament;
                if (redirectToTournament) {
                    // USE_CONDITION_POTION과 BUY_CONDITION_POTION의 경우 같은 토너먼트에서 사용하므로 리다이렉트하지 않음
                    if (action.type !== 'USE_CONDITION_POTION' && action.type !== 'BUY_CONDITION_POTION') {
                        // START_TOURNAMENT_SESSION의 경우, 이미 같은 토너먼트에 있으면 리다이렉트하지 않음 (무한 루프 방지)
                        const shouldSkipRedirect = action.type === 'START_TOURNAMENT_SESSION' && window.location.hash === `#/tournament/${redirectToTournament}`;
                        
                        if (shouldSkipRedirect) {
                            console.log(`[handleAction] ${action.type} - Skipping redirect (already at #/tournament/${redirectToTournament})`);
                        } else {
                            console.log(`[handleAction] ${action.type} - Redirecting to tournament:`, redirectToTournament);
                            // 상태 업데이트가 완료된 후 리다이렉트
                            // 같은 해시일 경우에도 강제로 리렌더링되도록 해시를 임시로 변경한 후 다시 설정
                            setTimeout(() => {
                                const newHash = `#/tournament/${redirectToTournament}`;
                                const currentHash = window.location.hash;
                                if (currentHash === newHash) {
                                    // 같은 해시인 경우 임시로 다른 해시로 변경한 후 다시 설정하여 강제 리렌더링
                                    window.location.hash = '#/tournament';
                                    setTimeout(() => {
                                        window.location.hash = newHash;
                                    }, 50);
                                } else {
                                    window.location.hash = newHash;
                                }
                            }, 200);
                        }
                    } else {
                        console.log(`[handleAction] ${action.type} - Skipping redirect (already in tournament)`);
                    }
                }
                // 거절 메시지 표시
                if (result.declinedMessage) {
                    showError(result.declinedMessage.message);
                }
                
                // ACCEPT_NEGOTIATION, START_AI_GAME, 또는 START_SINGLE_PLAYER_GAME 후 게임이 생성되었을 때 라우팅 처리
                if (result.clientResponse?.gameId && (action.type === 'ACCEPT_NEGOTIATION' || action.type === 'START_AI_GAME' || action.type === 'START_SINGLE_PLAYER_GAME')) {
                    const gameId = result.clientResponse.gameId;
                    console.log(`[handleAction] ${action.type} - gameId received:`, gameId);
                    
                    // WebSocket 업데이트를 기다리면서 여러 번 시도
                    let attempts = 0;
                    const maxAttempts = 30;
                    const tryRoute = () => {
                        attempts++;
                        console.log(`[handleAction] Attempt ${attempts}/${maxAttempts} to route to game ${gameId}`);
                        
                        // liveGames, singlePlayerGames, towerGames와 onlineUsers 상태를 직접 확인
                        setLiveGames(currentGames => {
                            const hasGame = currentGames[gameId] !== undefined;
                            
                            setSinglePlayerGames(currentSPGames => {
                                const hasSPGame = currentSPGames[gameId] !== undefined;
                                
                                setTowerGames(currentTowerGames => {
                                    const hasTowerGame = currentTowerGames[gameId] !== undefined;
                            
                            setOnlineUsers(prevOnlineUsers => {
                                const currentUserStatus = prevOnlineUsers.find(u => u.id === currentUser?.id);
                                const hasStatus = currentUserStatus?.gameId === gameId;
                                const isInGame = currentUserStatus?.status === 'in-game';
                                
                                console.log('[handleAction] Route check:', {
                                    hasGame,
                                            hasSPGame,
                                            hasTowerGame,
                                    hasStatus,
                                    isInGame,
                                    gameId,
                                    userGameId: currentUserStatus?.gameId,
                                    userStatus: currentUserStatus?.status
                                });
                                
                                        // 게임이 발견되면 라우팅 (singlePlayerGames 또는 towerGames에서도 확인)
                                        if (hasGame || hasSPGame || hasTowerGame) {
                                            if (isInGame || hasStatus) {
                                                console.log('[handleAction] Game found and user status confirmed, routing:', gameId);
                                    setTimeout(() => {
                                        window.location.hash = `#/game/${gameId}`;
                                    }, 100);
                                            }
                                        } else {
                                            // 게임이 아직 없으면 재시도
                                            console.log('[handleAction] Game not found yet, will retry:', gameId);
                                        }
                                        
                                    return prevOnlineUsers;
                                    });
                                    
                                    return currentTowerGames;
                                });
                                
                                return currentSPGames;
                            });
                            
                            return currentGames;
                        });
                                
                        // 게임이 아직 없으면 재시도
                        if (attempts < maxAttempts) {
                                    setTimeout(tryRoute, 150);
                                } else {
                                    // 최대 시도 횟수에 도달했어도 라우팅 시도 (게임이 생성되었으므로)
                                    console.warn('[handleAction] Max attempts reached, routing anyway:', gameId);
                                    setTimeout(() => {
                                        window.location.hash = `#/game/${gameId}`;
                                    }, 100);
                                }
                    };
                    
                    // 첫 시도는 200ms 후에 (WebSocket 메시지를 받을 시간을 줌)
                    setTimeout(tryRoute, 200);
                }
            }
        } catch (err: any) {
            console.error(`[handleAction] ${action.type} - Exception:`, err);
            console.error(`[handleAction] Error stack:`, err.stack);
            showError(err.message || '요청 처리 중 오류가 발생했습니다.');
        }
    }, [currentUser?.id]);

    const handleLogout = useCallback(async () => {
        if (!currentUser) return;
        isLoggingOut.current = true;
        
        const userId = currentUser.id; // 현재 사용자 ID 저장
        
        // 로그아웃 액션을 먼저 전송 (비동기 처리)
        try {
            // currentUser가 null이 되기 전에 userId를 직접 사용
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'LOGOUT', userId }),
            });
            
            if (res.ok) {
                const result = await res.json();
                if (result.error) {
                    console.error('[handleLogout] Server error:', result.error);
                }
            } else {
                console.error('[handleLogout] HTTP error:', res.status);
            }
        } catch (error) {
            console.error('[handleLogout] Error during logout action:', error);
        }
        
        // 상태 초기화 (WebSocket은 useEffect cleanup에서 자동으로 닫힘)
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
        
        // 모든 상태 초기화
        setOnlineUsers([]);
        setLiveGames({});
        setSinglePlayerGames({});
        setTowerGames({});
        setNegotiations({});
        setWaitingRoomChats({});
        setGameChats({});
        
        // 라우팅 초기화 (로그인 페이지로 이동)
        window.location.hash = '';
    }, [currentUser]);
    


    useEffect(() => {
        if (!currentUser) {
            // Clean up if user logs out
            setUsersMap({});
            setOnlineUsers([]);
            setLiveGames({});
            setNegotiations({});
            return;
        }

        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let isIntentionalClose = false;
        let shouldReconnect = true;
        let isConnecting = false; // 중복 연결 방지 플래그

        const getCloseCodeMeaning = (code: number): string => {
            switch (code) {
                case 1000: return 'Normal Closure';
                case 1001: return 'Going Away';
                case 1002: return 'Protocol Error';
                case 1003: return 'Unsupported Data';
                case 1006: return 'Abnormal Closure (no close frame)';
                case 1007: return 'Invalid Data';
                case 1008: return 'Policy Violation';
                case 1009: return 'Message Too Big';
                case 1010: return 'Missing Extension';
                case 1011: return 'Internal Error';
                case 1012: return 'Service Restart';
                case 1013: return 'Try Again Later';
                case 1014: return 'Bad Gateway';
                case 1015: return 'TLS Handshake';
                default: return `Unknown (${code})`;
            }
        };

        // 초기 상태 처리 헬퍼 함수
        const processInitialState = (users: Record<string, any>, otherData: {
            onlineUsers?: any[];
            liveGames?: Record<string, any>;
            singlePlayerGames?: Record<string, any>;
            towerGames?: Record<string, any>;
            negotiations?: Record<string, any>;
            waitingRoomChats?: Record<string, any>;
            gameChats?: Record<string, any>;
            adminLogs?: any[];
            announcements?: any[];
            globalOverrideAnnouncement?: any;
            gameModeAvailability?: Record<string, boolean>;
            announcementInterval?: number;
        }) => {
            console.log('[WebSocket] Processing initial state - users:', users ? Object.keys(users).length : 0, 'users');
            if (users && typeof users === 'object' && !Array.isArray(users)) {
                setUsersMap(users);
                console.log('[WebSocket] usersMap updated with', Object.keys(users).length, 'users');
                
                // 현재 사용자의 데이터가 초기 상태에 포함되어 있으면 업데이트
                if (currentUser && users[currentUser.id]) {
                    const initialUserData = users[currentUser.id];
                    if (initialUserData) {
                        setCurrentUser(prev => prev ? {
                            ...prev,
                            ...initialUserData,
                            // inventory와 equipment는 서버에서 받은 최신 값으로 업데이트 (전투력 계산 및 장비 표시를 위해)
                            inventory: initialUserData.inventory || prev.inventory,
                            equipment: initialUserData.equipment || prev.equipment,
                            // mail과 quests는 개인 정보이므로 이전 값 유지 (서버에서 전송하지 않음)
                            mail: prev.mail,
                            quests: prev.quests
                        } : null);
                    }
                }
            } else {
                console.warn('[WebSocket] Invalid users data:', users);
                setUsersMap({});
            }
            if (otherData) {
                if (otherData.onlineUsers !== undefined) setOnlineUsers(otherData.onlineUsers || []);
                if (otherData.liveGames !== undefined) setLiveGames(otherData.liveGames || {});
                if (otherData.singlePlayerGames !== undefined) setSinglePlayerGames(otherData.singlePlayerGames || {});
                if (otherData.towerGames !== undefined) setTowerGames(otherData.towerGames || {});
                if (otherData.negotiations !== undefined) setNegotiations(otherData.negotiations || {});
                if (otherData.waitingRoomChats !== undefined) setWaitingRoomChats(otherData.waitingRoomChats || {});
                if (otherData.gameChats !== undefined) setGameChats(otherData.gameChats || {});
                if (otherData.adminLogs !== undefined) setAdminLogs(otherData.adminLogs || []);
                if (otherData.announcements !== undefined) setAnnouncements(otherData.announcements || []);
                if (otherData.globalOverrideAnnouncement !== undefined) setGlobalOverrideAnnouncement(otherData.globalOverrideAnnouncement || null);
                if (otherData.gameModeAvailability !== undefined) setGameModeAvailability(otherData.gameModeAvailability || {});
                if (otherData.announcementInterval !== undefined) setAnnouncementInterval(otherData.announcementInterval || 3);
            }
        };

        const connectWebSocket = () => {
            if (!shouldReconnect || !currentUser) return;
            
            // 이미 연결 중이면 중복 연결 방지
            if (isConnecting) {
                console.log('[WebSocket] Connection already in progress, skipping...');
                return;
            }
            
            // 이미 열려있는 연결이 있으면 재연결하지 않음
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('[WebSocket] Connection already open, skipping...');
                return;
            }
            
            // 기존 타임아웃 정리
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            
            isConnecting = true;
            
            try {
                // Close existing connection if any
                if (ws && ws.readyState !== WebSocket.CLOSED) {
                    console.log('[WebSocket] Closing existing connection before reconnecting');
                    isIntentionalClose = true;
                    ws.close();
                    ws = null;
                }
                
                // WebSocket 연결 URL 결정
                // Vite 개발 서버를 사용하는 경우 프록시를 통해 연결
                let wsUrl: string;
                
                // Vite 개발 서버를 사용하는 경우 (포트가 5173이거나 hostname이 localhost/127.0.0.1인 경우)
                const isViteDevServer = window.location.port === '5173' || 
                                       window.location.hostname === 'localhost' || 
                                       window.location.hostname === '127.0.0.1' ||
                                       window.location.hostname.includes('192.168.');
                
                if (isViteDevServer) {
                    // 개발 환경: Vite 프록시를 통해 연결 (/ws로 프록시됨)
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${wsProtocol}//${window.location.host}/ws`;
                } else {
                    // 프로덕션 환경: 직접 포트 4000으로 연결
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${wsProtocol}//${window.location.hostname}:4000`;
                }
                
                console.log('[WebSocket] Connecting to:', wsUrl);
                console.log('[WebSocket] Current location:', {
                    protocol: window.location.protocol,
                    hostname: window.location.hostname,
                    port: window.location.port,
                    href: window.location.href
                });
                
                try {
                    ws = new WebSocket(wsUrl);
                } catch (error) {
                    console.error('[WebSocket] Failed to create WebSocket:', error);
                    isConnecting = false;
                    // 재연결 시도
                    if (!isIntentionalClose && shouldReconnect && currentUser) {
                        reconnectTimeout = setTimeout(() => {
                            if (shouldReconnect && currentUser && !isConnecting) {
                                console.log('[WebSocket] Retrying connection after creation error...');
                                isIntentionalClose = false;
                                connectWebSocket();
                            }
                        }, 3000);
                    }
                    return;
                }
                
                // 연결 타임아웃 설정 (30초)
                let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
                    if (ws && ws.readyState === WebSocket.CONNECTING) {
                        console.warn('[WebSocket] Connection timeout, closing...');
                        ws.close();
                    }
                    connectionTimeout = null;
                }, 30000);

                ws.onopen = () => {
                    console.log('[WebSocket] Connected successfully');
                    isIntentionalClose = false;
                    isConnecting = false; // 연결 완료
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        
                        // 연결 확인 메시지 처리
                        if (message.type === 'CONNECTION_ESTABLISHED') {
                            console.log('[WebSocket] Connection established, waiting for initial state...');
                            return;
                        }

                        switch (message.type) {
                            case 'INITIAL_STATE_START':
                                // 청크 전송 시작 - 첫 번째 청크
                                console.log('[WebSocket] Receiving chunked initial state (start):', {
                                    chunkIndex: message.payload.chunkIndex,
                                    totalChunks: message.payload.totalChunks
                                });
                                // 버퍼 초기화 및 첫 청크 데이터 병합
                                if (!(window as any).__chunkedStateBuffer) {
                                    (window as any).__chunkedStateBuffer = {
                                        users: {},
                                        receivedChunks: 0,
                                        totalChunks: message.payload.totalChunks,
                                        otherData: null
                                    };
                                }
                                const startBuffer = (window as any).__chunkedStateBuffer;
                                // 첫 번째 청크의 사용자 데이터 병합
                                Object.assign(startBuffer.users, message.payload.users);
                                // 다른 데이터는 첫 번째 청크에서 가져옴
                                startBuffer.otherData = {
                                    onlineUsers: message.payload.onlineUsers,
                                    liveGames: message.payload.liveGames,
                                    negotiations: message.payload.negotiations,
                                    waitingRoomChats: message.payload.waitingRoomChats,
                                    gameChats: message.payload.gameChats,
                                    adminLogs: message.payload.adminLogs,
                                    announcements: message.payload.announcements,
                                    globalOverrideAnnouncement: message.payload.globalOverrideAnnouncement,
                                    gameModeAvailability: message.payload.gameModeAvailability,
                                    announcementInterval: message.payload.announcementInterval
                                };
                                startBuffer.receivedChunks++;
                                
                                // 마지막 청크인 경우 (청크가 1개뿐)
                                if (message.payload.isLast) {
                                    processInitialState(startBuffer.users, startBuffer.otherData);
                                    (window as any).__chunkedStateBuffer = null;
                                }
                                break;
                            case 'INITIAL_STATE_CHUNK':
                                // 추가 청크 수집
                                if (!(window as any).__chunkedStateBuffer) {
                                    console.warn('[WebSocket] Received chunk without INITIAL_STATE_START, initializing buffer...');
                                    (window as any).__chunkedStateBuffer = {
                                        users: {},
                                        receivedChunks: 0,
                                        totalChunks: message.payload.totalChunks || 0,
                                        otherData: null
                                    };
                                }
                                const chunkBuffer = (window as any).__chunkedStateBuffer;
                                // 사용자 데이터 병합
                                Object.assign(chunkBuffer.users, message.payload.users);
                                chunkBuffer.receivedChunks++;
                                console.log(`[WebSocket] Received chunk ${chunkBuffer.receivedChunks}/${chunkBuffer.totalChunks || '?'} (index ${message.payload.chunkIndex})`);
                                
                                if (message.payload.isLast) {
                                    // 모든 청크를 받았으므로 처리
                                    console.log('[WebSocket] All chunks received, processing...');
                                    if (!chunkBuffer.otherData) {
                                        // otherData가 없으면 현재 청크에서 가져옴
                                        chunkBuffer.otherData = {
                                            onlineUsers: message.payload.onlineUsers,
                                            liveGames: message.payload.liveGames,
                                            negotiations: message.payload.negotiations,
                                            waitingRoomChats: message.payload.waitingRoomChats,
                                            gameChats: message.payload.gameChats,
                                            adminLogs: message.payload.adminLogs,
                                            announcements: message.payload.announcements,
                                            globalOverrideAnnouncement: message.payload.globalOverrideAnnouncement,
                                            gameModeAvailability: message.payload.gameModeAvailability,
                                            announcementInterval: message.payload.announcementInterval
                                        };
                                    }
                                    processInitialState(chunkBuffer.users, chunkBuffer.otherData);
                                    (window as any).__chunkedStateBuffer = null;
                                    console.log('[WebSocket] Chunked initial state processed successfully');
                                }
                                break;
                            case 'INITIAL_STATE':
                                console.log('INITIAL_STATE payload:', message.payload);
                                const { users, onlineUsers, liveGames, negotiations, waitingRoomChats, gameChats, adminLogs, announcements, globalOverrideAnnouncement, gameModeAvailability, announcementInterval } = message.payload;
                                processInitialState(users, {
                                    onlineUsers,
                                    liveGames,
                                    negotiations,
                                    waitingRoomChats,
                                    gameChats,
                                    adminLogs,
                                    announcements,
                                    globalOverrideAnnouncement,
                                    gameModeAvailability,
                                    announcementInterval
                                });
                                break;
                            case 'USER_UPDATE':
                                // 사용자 데이터 업데이트 (인벤토리, 장비, 프로필 등)
                                // HTTP 응답이 최근 5초 이내에 처리되었다면 WebSocket 업데이트를 무시 (HTTP 응답이 더 최신)
                                // 그 외의 경우에는 WebSocket 업데이트를 처리 (다른 사용자의 액션이거나, HTTP 응답이 없는 경우)
                                const now = Date.now();
                                const timeSinceLastAction = now - lastActionProcessedTime.current;
                                // 사용자 데이터 변경 액션의 경우 더 긴 시간 동안 무시 (상태 동기화 시간 확보)
                                // 사용자 데이터 변경 액션 목록 (HTTP 응답 우선 처리)
                                const userDataChangingActions = [
                                    'TOGGLE_EQUIP_ITEM', 'USE_ITEM', 'USE_ALL_ITEMS_OF_TYPE', 'ENHANCE_ITEM', 'COMBINE_ITEMS', 'DISASSEMBLE_ITEM', 
                                    'CRAFT_MATERIAL', 'BUY_SHOP_ITEM', 'BUY_CONDITION_POTION', 'USE_CONDITION_POTION', 'UPDATE_AVATAR', 
                                    'UPDATE_BORDER', 'CHANGE_NICKNAME', 'UPDATE_MBTI', 'ALLOCATE_STAT_POINT',
                                    'SELL_ITEM', 'EXPAND_INVENTORY', 'BUY_BORDER', 'APPLY_PRESET', 'SAVE_PRESET',
                                    'DELETE_MAIL', 'DELETE_ALL_CLAIMED_MAIL', 'CLAIM_MAIL_ATTACHMENTS', 'CLAIM_ALL_MAIL_ATTACHMENTS', 'MARK_MAIL_AS_READ',
                                    'CLAIM_QUEST_REWARD', 'CLAIM_ACTIVITY_MILESTONE',
                                    'CLAIM_SINGLE_PLAYER_MISSION_REWARD', 'LEVEL_UP_TRAINING_QUEST',
                                    'ADMIN_RESET_TOURNAMENT_SESSION'
                                ];
                                // HTTP 응답이 최근에 처리된 경우 WebSocket 업데이트 무시 (사용자 데이터 변경 액션은 더 길게)
                                // 상태 동기화 시간을 충분히 확보하기 위해 15초로 증가
                                const ignoreDuration = userDataChangingActions.includes(lastActionType.current || '') ? 15000 : 3000;
                                const shouldIgnoreForCurrentUser = timeSinceLastAction < ignoreDuration && lastActionType.current !== null;
                                
                                setUsersMap(currentUsersMap => {
                                    const updatedUsersMap = { ...currentUsersMap };
                                    Object.entries(message.payload || {}).forEach(([userId, updatedUserData]: [string, any]) => {
                                        updatedUsersMap[userId] = updatedUserData;
                                    });
                                    
                                    // 현재 사용자의 데이터가 업데이트되었으면 currentUser도 업데이트
                                    // 단, HTTP 응답이 최근 3초 이내에 처리되었다면 무시 (HTTP 응답이 더 최신)
                                    if (currentUser && message.payload[currentUser.id]) {
                                        if (!shouldIgnoreForCurrentUser) {
                                            // HTTP 응답이 없거나 충분한 시간이 지난 경우, WebSocket 업데이트 처리
                                            const updatedCurrentUser = message.payload[currentUser.id];
                                            // 현재 사용자와 ID가 일치하는지 확인
                                            if (updatedCurrentUser.id === currentUser.id) {
                                                // 상태 업데이트를 즉시 동기적으로 처리 (HTTP 응답이 없는 경우에만)
                                                const newUser = JSON.parse(JSON.stringify(updatedCurrentUser));
                                                console.log(`[WebSocket] Updating currentUser from WebSocket (HTTP response not available):`, {
                                                    inventoryLength: newUser.inventory?.length,
                                                    gold: newUser.gold,
                                                    diamonds: newUser.diamonds,
                                                    equipment: newUser.equipment,
                                                    timeSinceLastAction,
                                                    lastActionType: lastActionType.current
                                                });
                                                
                                                // 단일 동기 업데이트 (불필요한 중복 제거)
                                                flushSync(() => {
                                                    setCurrentUser(newUser);
                                                    setUpdateTrigger(prev => prev + 1);
                                                });
                                                
                                                // sessionStorage에도 저장
                                                try {
                                                    sessionStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
                                                } catch (e) {
                                                    console.error('Failed to save user to sessionStorage', e);
                                                }
                                            }
                                        } else {
                                            console.log(`[WebSocket] Ignoring USER_UPDATE for ${currentUser.id} - HTTP response was processed ${timeSinceLastAction}ms ago (more recent)`);
                                        }
                                    }
                                    
                                    return updatedUsersMap;
                                });
                                break;
                            case 'USER_STATUS_UPDATE':
                                setUsersMap(currentUsersMap => {
                                    // message.payload는 모든 온라인 유저의 상태 정보를 포함합니다
                                    // usersMap에 있는 유저를 찾고, 없으면 allUsers에서 찾아서 추가
                                    const updatedUsersMap = { ...currentUsersMap };
                                    const onlineStatuses = Object.entries(message.payload).map(([id, statusInfo]: [string, any]) => {
                                        let user: User | undefined = currentUsersMap[id];
                                        // usersMap에 없으면 allUsers에서 찾기
                                        if (!user) {
                                            const allUsersArray = Object.values(currentUsersMap);
                                            user = allUsersArray.find((u: any) => u?.id === id) as User | undefined;
                                            // allUsers에서도 찾지 못했으면 undefined 반환 (나중에 INITIAL_STATE에서 받을 것)
                                            if (!user) {
                                                console.warn(`[WebSocket] User ${id} not found in usersMap or allUsers`);
                                                return undefined;
                                            }
                                            // usersMap에 추가
                                            updatedUsersMap[id] = user;
                                        }
                                        // statusInfo와 user를 병합하여 UserWithStatus 생성
                                        return { ...user, ...statusInfo };
                                    }).filter(Boolean) as UserWithStatus[];
                                    // 온라인 유저 목록을 즉시 업데이트
                                    setOnlineUsers(onlineStatuses);
                                    
                                    // 현재 사용자의 상태가 업데이트되었는지 확인하고 라우팅
                                    if (currentUser) {
                                        const currentUserStatus = onlineStatuses.find(u => u.id === currentUser.id);
                                        if (currentUserStatus) {
                                            // 게임으로 이동해야 하는 경우
                                            if (currentUserStatus.gameId && currentUserStatus.status === 'in-game') {
                                                const gameId = currentUserStatus.gameId;
                                                console.log('[WebSocket] Current user status updated to in-game:', gameId);
                                                
                                                // liveGames 상태를 확인하고 라우팅
                                                setLiveGames(currentGames => {
                                                    if (currentGames[gameId]) {
                                                        console.log('[WebSocket] Game found in liveGames, routing immediately');
                                                        setTimeout(() => {
                                                            window.location.hash = `#/game/${gameId}`;
                                                        }, 100);
                                                    } else {
                                                        console.log('[WebSocket] Game not in liveGames yet, will wait for GAME_UPDATE');
                                                        // GAME_UPDATE를 기다리기 위해 짧은 지연 후 재시도
                                                        let attempts = 0;
                                                        const maxAttempts = 20;
                                                        const checkGame = () => {
                                                            attempts++;
                                                            setLiveGames(games => {
                                                                if (games[gameId]) {
                                                                    console.log('[WebSocket] Game received in delayed check, routing');
                                                                    setTimeout(() => {
                                                                        window.location.hash = `#/game/${gameId}`;
                                                                    }, 100);
                                                                } else if (attempts < maxAttempts) {
                                                                    setTimeout(checkGame, 200);
                                                                }
                                                                return games;
                                                            });
                                                        };
                                                        setTimeout(checkGame, 200);
                                                    }
                                                    return currentGames;
                                                });
                                            }
                                            // 대기실로 이동해야 하는 경우 (상태가 waiting이고 게임 페이지에 있는 경우)
                                            else if (currentUserStatus.status === 'waiting' && currentUserStatus.mode && !currentUserStatus.gameId) {
                                                const currentHash = window.location.hash;
                                                const isGamePage = currentHash.startsWith('#/game/');
                                                if (isGamePage) {
                                                    // postGameRedirect가 설정되어 있으면 (싱글플레이 등) 그것을 사용
                                                    const postGameRedirect = sessionStorage.getItem('postGameRedirect');
                                                    if (postGameRedirect) {
                                                        console.log('[WebSocket] Current user status updated to waiting, routing to postGameRedirect:', postGameRedirect);
                                                        sessionStorage.removeItem('postGameRedirect');
                                                    setTimeout(() => {
                                                            window.location.hash = postGameRedirect;
                                                        }, 100);
                                                    } else {
                                                        // 개별 게임 모드가 아닌 strategic/playful만 허용
                                                        // strategic/playful 대기실에서는 mode가 undefined일 수 있음
                                                        const mode = currentUserStatus.mode;
                                                        if (!mode && (currentUserStatus.status === UserStatus.Waiting || currentUserStatus.status === UserStatus.Resting)) {
                                                            // mode가 undefined이고 waiting/resting 상태인 경우, strategic/playful 대기실에 있을 가능성이 높음
                                                            // 라우팅은 하지 않음 (이미 대기실에 있을 가능성이 높음)
                                                            console.log('[WebSocket] Current user status updated to waiting without mode (likely in strategic/playful lobby)');
                                                        } else if (mode) {
                                                            // 개별 게임 모드인 경우 프로필로 이동 (통합 대기실 외에는 접근 불가)
                                                            console.warn('[WebSocket] Individual game mode detected, redirecting to profile:', mode);
                                                            setTimeout(() => {
                                                                window.location.hash = '#/profile';
                                                            }, 100);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    return updatedUsersMap;
                                });
                                break;
                            case 'WAITING_ROOM_CHAT_UPDATE':
                                setWaitingRoomChats(currentChats => {
                                    const updatedChats = { ...currentChats };
                                    // payload에 있는 각 채널의 메시지 목록을 업데이트
                                    Object.entries(message.payload || {}).forEach(([channel, messages]: [string, any]) => {
                                        updatedChats[channel] = messages;
                                    });
                                    return updatedChats;
                                });
                                break;
                            case 'GAME_CHAT_UPDATE':
                                setGameChats(currentChats => {
                                    const updatedChats = { ...currentChats };
                                    // payload에 있는 각 게임 채널의 메시지 목록을 업데이트
                                    Object.entries(message.payload || {}).forEach(([gameId, messages]: [string, any]) => {
                                        updatedChats[gameId] = messages;
                                    });
                                    return updatedChats;
                                });
                                break;
                            case 'GAME_UPDATE':
                                // 게임 업데이트 처리 (게임 카테고리별로 분리)
                                Object.entries(message.payload || {}).forEach(([gameId, game]: [string, any]) => {
                                    const gameCategory = game.gameCategory || (game.isSinglePlayer ? 'singleplayer' : 'normal');
                                    
                                    if (gameCategory === 'singleplayer') {
                                        setSinglePlayerGames(currentGames => {
                                            const updatedGames = { ...currentGames };
                                            updatedGames[gameId] = game;
                                            console.log('[WebSocket] Single player game updated:', gameId, game.mode);
                                            
                                            // 현재 사용자가 이 게임의 플레이어인지 확인하고 라우팅
                                            if (currentUser && game.player1 && game.player2) {
                                                const isPlayer1 = game.player1.id === currentUser.id;
                                                const isPlayer2 = game.player2.id === currentUser.id;
                                                
                                                if (isPlayer1 || isPlayer2) {
                                                    console.log('[WebSocket] Current user is a player in single player game, routing:', gameId);
                                                    setTimeout(() => {
                                                        window.location.hash = `#/game/${gameId}`;
                                                    }, 100);
                                                }
                                            }
                                            return updatedGames;
                                        });
                                    } else if (gameCategory === 'tower') {
                                        setTowerGames(currentGames => {
                                            const updatedGames = { ...currentGames };
                                            updatedGames[gameId] = game;
                                            console.log('[WebSocket] Tower game updated:', gameId, game.mode);
                                            
                                            // 현재 사용자가 이 게임의 플레이어인지 확인하고 라우팅
                                            if (currentUser && game.player1 && game.player2) {
                                                const isPlayer1 = game.player1.id === currentUser.id;
                                                const isPlayer2 = game.player2.id === currentUser.id;
                                                
                                                if (isPlayer1 || isPlayer2) {
                                                    console.log('[WebSocket] Current user is a player in tower game, routing:', gameId);
                                                    setTimeout(() => {
                                                        window.location.hash = `#/game/${gameId}`;
                                                    }, 100);
                                                }
                                            }
                                            return updatedGames;
                                        });
                                    } else {
                                        // normal 게임
                                setLiveGames(currentGames => {
                                    const updatedGames = { ...currentGames };
                                        updatedGames[gameId] = game;
                                            console.log('[WebSocket] Normal game updated:', gameId, game.mode);
                                        
                                        // 현재 사용자가 이 게임의 플레이어인지 확인하고 라우팅
                                        if (currentUser && game.player1 && game.player2) {
                                            const isPlayer1 = game.player1.id === currentUser.id;
                                            const isPlayer2 = game.player2.id === currentUser.id;
                                            
                                            if (isPlayer1 || isPlayer2) {
                                                console.log('[WebSocket] Current user is a player in this game, routing:', gameId);
                                                // 즉시 라우팅 (USER_STATUS_UPDATE와 관계없이)
                                                setTimeout(() => {
                                                    window.location.hash = `#/game/${gameId}`;
                                                }, 100);
                                            }
                                        }
                                    return updatedGames;
                                        });
                                    }
                                });
                                break;
                            case 'GAME_DELETED':
                                // 게임 삭제 처리 (게임 카테고리별로 분리)
                                const deletedGameId = message.payload?.gameId;
                                const serverGameCategory = message.payload?.gameCategory;
                                if (deletedGameId) {
                                    // 서버에서 제공한 gameCategory를 우선 사용
                                    if (serverGameCategory === 'singleplayer') {
                                        setSinglePlayerGames(currentGames => {
                                            if (currentGames[deletedGameId]) {
                                                const updatedGames = { ...currentGames };
                                                delete updatedGames[deletedGameId];
                                                console.log('[WebSocket] Single player game deleted:', deletedGameId);
                                                return updatedGames;
                                            }
                                            return currentGames;
                                        });
                                    } else if (serverGameCategory === 'tower') {
                                        setTowerGames(currentGames => {
                                            if (currentGames[deletedGameId]) {
                                                const updatedGames = { ...currentGames };
                                                delete updatedGames[deletedGameId];
                                                console.log('[WebSocket] Tower game deleted:', deletedGameId);
                                                return updatedGames;
                                            }
                                            return currentGames;
                                        });
                                    } else {
                                        // normal 게임 또는 gameCategory가 없는 경우 (하위 호환성)
                                    setLiveGames(currentGames => {
                                            if (currentGames[deletedGameId]) {
                                        const updatedGames = { ...currentGames };
                                        delete updatedGames[deletedGameId];
                                                console.log('[WebSocket] Normal game deleted:', deletedGameId);
                                        return updatedGames;
                                            }
                                            return currentGames;
                                        });
                                        
                                        // 모든 카테고리에서 찾기 (하위 호환성)
                                        setSinglePlayerGames(currentGames => {
                                            if (currentGames[deletedGameId]) {
                                                const updatedGames = { ...currentGames };
                                                delete updatedGames[deletedGameId];
                                                console.log('[WebSocket] Single player game deleted (fallback):', deletedGameId);
                                                return updatedGames;
                                            }
                                            return currentGames;
                                        });
                                        
                                        setTowerGames(currentGames => {
                                            if (currentGames[deletedGameId]) {
                                                const updatedGames = { ...currentGames };
                                                delete updatedGames[deletedGameId];
                                                console.log('[WebSocket] Tower game deleted (fallback):', deletedGameId);
                                                return updatedGames;
                                            }
                                            return currentGames;
                                        });
                                    }
                                    
                                    // 싱글플레이 게임이 삭제되었고, 현재 게임 페이지에 있으면 postGameRedirect 확인
                                    if (serverGameCategory === 'singleplayer') {
                                        const currentHash = window.location.hash;
                                        const isGamePage = currentHash.startsWith('#/game/') && currentHash.includes(deletedGameId);
                                        if (isGamePage) {
                                            const postGameRedirect = sessionStorage.getItem('postGameRedirect');
                                            if (postGameRedirect) {
                                                console.log('[WebSocket] Single player game deleted, routing to postGameRedirect:', postGameRedirect);
                                                sessionStorage.removeItem('postGameRedirect');
                                                setTimeout(() => {
                                                    window.location.hash = postGameRedirect;
                                                }, 100);
                                            } else {
                                                console.log('[WebSocket] Single player game deleted, routing to singleplayer lobby');
                                                setTimeout(() => {
                                                    window.location.hash = '#/singleplayer';
                                                }, 100);
                                            }
                                        }
                                    }
                                }
                                break;
                            case 'CHALLENGE_DECLINED':
                                // 대국 신청 거절 메시지 처리 (발신자에게만 표시)
                                if (message.payload?.challengerId === currentUser?.id && message.payload?.declinedMessage) {
                                    showError(message.payload.declinedMessage.message);
                                }
                                break;
                            case 'NEGOTIATION_UPDATE':
                                // 대국 신청서 업데이트 처리
                                if (message.payload?.negotiations) {
                                    // Deep copy를 수행하여 React가 변경을 감지하도록 함
                                    const updatedNegotiations = JSON.parse(JSON.stringify(message.payload.negotiations));
                                    setNegotiations(updatedNegotiations);
                                }
                                // 사용자 상태도 업데이트
                                if (message.payload?.userStatuses) {
                                    setOnlineUsers(prevOnlineUsers => {
                                        const updatedStatuses = message.payload.userStatuses;
                                        return prevOnlineUsers.map(user => {
                                            const statusInfo = updatedStatuses[user.id];
                                            if (statusInfo) {
                                                return { ...user, ...statusInfo };
                                            }
                                            return user;
                                        });
                                    });
                                }
                                break;
                        }
                    } catch (error) {
                        console.error('[WebSocket] Error parsing message:', error);
                    }
                };

                ws.onerror = (error: Event) => {
                    // WebSocket 에러는 일반적으로 연결 문제를 나타내지만,
                    // 자동 재연결 로직이 처리하므로 사용자에게 보여줄 필요는 없음
                    // 개발 환경에서만 디버그 로그 출력
                    const isDevelopment = window.location.hostname === 'localhost' || 
                                         window.location.hostname === '127.0.0.1' ||
                                         window.location.hostname.includes('192.168');
                    
                    // WebSocket 상태 확인
                    const wsState = ws ? ws.readyState : -1;
                    const isConnectingError = wsState === WebSocket.CONNECTING || wsState === WebSocket.CLOSING;
                    
                    // 연결 중이거나 종료 중인 경우의 에러는 정상적인 흐름일 수 있음
                    if (isConnectingError) {
                        // 개발 환경에서만 조용히 로그 (console.debug는 개발자 도구에서 필터링 가능)
                        if (isDevelopment) {
                            console.debug('[WebSocket] Connection error during state transition (will reconnect automatically)');
                        }
                    } else {
                        // 개발 환경에서만 경고 로그
                        if (isDevelopment) {
                            console.debug('[WebSocket] Connection error detected (will attempt to reconnect)');
                        }
                    }
                    
                    // 에러 발생 시 연결 종료 처리
                    isConnecting = false;
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                    }
                    
                    // 연결이 CONNECTING 상태에서 실패한 경우
                    if (ws && ws.readyState === WebSocket.CONNECTING) {
                        // 연결을 명시적으로 닫음
                        try {
                            ws.close();
                        } catch (closeError) {
                            // 연결 종료 중 에러는 무시
                            if (isDevelopment) {
                                console.debug('[WebSocket] Error closing failed connection');
                            }
                        }
                    }
                    
                    // 에러 발생 시 재연결 시도 (의도적 종료가 아닌 경우)
                    if (!isIntentionalClose && shouldReconnect && currentUser) {
                        if (isDevelopment) {
                            console.debug('[WebSocket] Will attempt to reconnect in 3 seconds...');
                        }
                        if (reconnectTimeout) {
                            clearTimeout(reconnectTimeout);
                        }
                        reconnectTimeout = setTimeout(() => {
                            if (shouldReconnect && currentUser && !isConnecting) {
                                if (isDevelopment) {
                                    console.debug('[WebSocket] Attempting to reconnect after error...');
                                }
                                isIntentionalClose = false;
                                connectWebSocket();
                            }
                        }, 3000);
                    }
                };

                ws.onclose = (event) => {
                    isConnecting = false; // 연결 종료됨
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                    }
                    console.log('[WebSocket] Disconnected', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean,
                        codeMeaning: getCloseCodeMeaning(event.code),
                        wasIntentional: isIntentionalClose
                    });
                    
                    // 1001 (Going Away)는 브라우저가 페이지를 떠날 때 발생할 수 있으므로
                    // 의도적인 종료가 아닌 경우에만 재연결
                    if (!isIntentionalClose && shouldReconnect && currentUser) {
                        // Reconnect after 3 seconds if not intentional close
                        console.log('[WebSocket] Will attempt to reconnect in 3 seconds...');
                        reconnectTimeout = setTimeout(() => {
                            if (shouldReconnect && currentUser && !isConnecting) {
                                console.log('[WebSocket] Attempting to reconnect...');
                                isIntentionalClose = false; // 재연결 시도는 의도적이지 않음
                                connectWebSocket();
                            }
                        }, 3000);
                    } else {
                        console.log('[WebSocket] Not reconnecting:', {
                            isIntentionalClose,
                            shouldReconnect,
                            hasCurrentUser: !!currentUser,
                            isConnecting
                        });
                    }
                };
            } catch (error) {
                isConnecting = false; // 연결 실패
                console.error('[WebSocket] Failed to create connection:', error);
                if (shouldReconnect && currentUser) {
                    reconnectTimeout = setTimeout(() => {
                        if (shouldReconnect && currentUser && !isConnecting) {
                            connectWebSocket();
                        }
                    }, 3000);
                }
            }
        };

        connectWebSocket();

        return () => {
            shouldReconnect = false;
            isIntentionalClose = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (ws) {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
                ws = null;
            }
        };
    }, [currentUser?.id]); // Only depend on currentUser.id to avoid unnecessary reconnections

    // --- Navigation Logic ---
    const initialRedirectHandled = useRef(false);
    useEffect(() => { currentRouteRef.current = currentRoute; }, [currentRoute]);
    
    useEffect(() => {
        const handleHashChange = () => {
            const prevRoute = currentRouteRef.current;
            const newRoute = parseHash(window.location.hash);
            const isExiting = (prevRoute.view === 'profile' && newRoute.view === 'login' && window.location.hash === '');
            
            if (isExiting && currentUser) {
                if (showExitToast) { handleLogout(); } 
                else {
                    setShowExitToast(true);
                    exitToastTimer.current = window.setTimeout(() => setShowExitToast(false), 2000);
                    window.history.pushState(null, '', '#/profile');
                    return;
                }
            } else {
                if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
                if (showExitToast) setShowExitToast(false);
            }
            setCurrentRoute(newRoute);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [currentUser, handleLogout, showExitToast]);

    useEffect(() => {
        if (!currentUser) {
            initialRedirectHandled.current = false;
            if (window.location.hash && window.location.hash !== '#/register') window.location.hash = '';
            return;
        }
        const currentHash = window.location.hash;
        
        if (!initialRedirectHandled.current) {
            initialRedirectHandled.current = true;
    
            if (currentHash === '' || currentHash === '#/') {
                if (activeGame) {
                    window.location.hash = `#/game/${activeGame.id}`;
                    return;
                }
                window.location.hash = '#/profile';
                return;
            }
        }
        
        const isGamePage = currentHash.startsWith('#/game/');

        if (activeGame && !isGamePage) {
            console.log('[useApp] Routing to game:', activeGame.id);
            window.location.hash = `#/game/${activeGame.id}`;
        } else if (!activeGame && isGamePage) {
            // AI 게임의 경우, 게임이 종료되어도 결과창을 확인할 수 있도록 게임 페이지에 머물 수 있음
            // 나가기 버튼을 통해 대기실로 이동할 수 있음
            const isAiGame = currentHash.startsWith('#/game/') && liveGames[currentHash.replace('#/game/', '')]?.isAiGame;
            if (!isAiGame) {
                let targetHash = '#/profile';
                if (currentUserWithStatus?.status === 'waiting' && currentUserWithStatus?.mode) {
                    targetHash = `#/waiting/${encodeURIComponent(currentUserWithStatus.mode)}`;
                }
                if (currentHash !== targetHash) {
                    window.location.hash = targetHash;
                }
            }
        }
    }, [currentUser, activeGame, currentUserWithStatus, liveGames]);
    
    // --- Misc UseEffects ---
    useEffect(() => {
        const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        return () => { window.removeEventListener('resize', setVh); window.removeEventListener('orientationchange', setVh); };
    }, []);

    useEffect(() => {
        if (enhancementResult) {
            const timer = setTimeout(() => {
                setEnhancementResult(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [enhancementResult]);

    const handleEnterWaitingRoom = (mode: GameMode) => {
        handleAction({ type: 'ENTER_WAITING_ROOM', payload: { mode } });
        window.location.hash = `#/waiting/${encodeURIComponent(mode)}`;
    };
    
    const handleViewUser = useCallback((userId: string) => {
        if (!Array.isArray(onlineUsers) || !Array.isArray(allUsers)) return;
        const userToView = onlineUsers.find(u => u && u.id === userId) || allUsers.find(u => u && u.id === userId);
        if (userToView) {
            const statusInfo = onlineUsers.find(u => u && u.id === userId);
            setViewingUser({ ...userToView, ...(statusInfo || { status: UserStatus.Online }) });
        }
    }, [onlineUsers, allUsers]);

    const openModerationModal = useCallback((userId: string) => {
        if (!Array.isArray(onlineUsers) || !Array.isArray(allUsers)) return;
        const userToView = onlineUsers.find(u => u && u.id === userId) || allUsers.find(u => u && u.id === userId);
        if (userToView) {
            const statusInfo = onlineUsers.find(u => u && u.id === userId);
            setModeratingUser({ ...userToView, ...(statusInfo || { status: UserStatus.Online }) });
        }
    }, [onlineUsers, allUsers]);

    const closeModerationModal = useCallback(() => setModeratingUser(null), []);

    const setCurrentUserAndRoute = useCallback((user: User) => {
        // 깊은 복사를 수행하여 React가 변경을 감지하도록 함
        const userCopy = JSON.parse(JSON.stringify(user));
        setCurrentUser(userCopy);
        // usersMap에 현재 유저 추가 (실시간 업데이트를 위해)
        setUsersMap(prev => ({ ...prev, [user.id]: userCopy }));
        console.log('[setCurrentUserAndRoute] User set:', {
            id: userCopy.id,
            inventoryLength: userCopy.inventory?.length,
            equipmentSlots: Object.keys(userCopy.equipment || {}).length,
            hasInventory: !!userCopy.inventory,
            hasEquipment: !!userCopy.equipment
        });
        window.location.hash = '#/profile';
    }, []);
    
    const openEnhancingItem = useCallback((item: InventoryItem) => {
        setBlacksmithSelectedItemForEnhancement(item);
        setBlacksmithActiveTab('enhance');
        setIsBlacksmithModalOpen(true);
    }, []);

    const openEnhancementFromDetail = useCallback((item: InventoryItem) => {
        setBlacksmithSelectedItemForEnhancement(item);
        setBlacksmithActiveTab('enhance');
        setIsBlacksmithModalOpen(true);
    }, []);

    const openViewingItem = useCallback((item: InventoryItem, isOwnedByCurrentUser: boolean) => {
        setViewingItem({ item, isOwnedByCurrentUser });
    }, []);

    const clearEnhancementOutcome = useCallback(() => {
        if (enhancementOutcome?.success) {
            const enhancedItem = enhancementOutcome.itemAfter;
            setViewingItem(currentItem => {
                if (currentItem && enhancedItem && currentItem.item.id === enhancedItem.id) {
                    return { ...currentItem, item: enhancedItem };
                }
                return currentItem;
            });
            setCurrentUser(prevUser => {
                if (!prevUser) return null;
                return {
                    ...prevUser,
                    inventory: prevUser.inventory.map(invItem => 
                        invItem.id === enhancedItem.id ? enhancedItem : invItem
                    ),
                };
            });
        }
        setEnhancementOutcome(null);
    }, [enhancementOutcome]);
    
    const closeEnhancementModal = useCallback(() => {
        setIsEnhancementResultModalOpen(false);
        setEnhancementOutcome(null);
    }, []);

        const closeClaimAllSummary = useCallback(() => {
        setIsClaimAllSummaryOpen(false);
        setClaimAllSummary(null);
    }, []);

    const applyPreset = useCallback((preset: EquipmentPreset) => {
        handleAction({ type: 'APPLY_PRESET', payload: { presetName: preset.name, equipment: preset.equipment } });
    }, [handleAction]);

    const presets = useMemo(() => currentUser?.equipmentPresets || [], [currentUser?.equipmentPresets]);

    const {
        mainOptionBonuses,
        combatSubOptionBonuses,
        specialStatBonuses,
        aggregatedMythicStats,
    } = useMemo(() => {
        const initialBonuses = {
            mainOptionBonuses: {} as Record<CoreStat, { value: number; isPercentage: boolean }>,
            combatSubOptionBonuses: {} as Record<CoreStat, { value: number; isPercentage: boolean }>,
            specialStatBonuses: {} as Record<SpecialStat, { flat: number; percent: number }>,
            aggregatedMythicStats: {} as Record<MythicStat, { count: number, totalValue: number }>,
        };

        if (!currentUserWithStatus || !currentUserWithStatus.equipment || !currentUserWithStatus.inventory || !Array.isArray(currentUserWithStatus.inventory)) {
            return initialBonuses;
        }

        const equippedItems = currentUserWithStatus.inventory.filter(item =>
            item && currentUserWithStatus.equipment && Object.values(currentUserWithStatus.equipment).includes(item.id)
        );

        const aggregated = equippedItems.reduce((acc, item) => {
            if (!item.options) return acc;

            // Main Option
            if (item.options.main) {
                const type = item.options.main.type as CoreStat;
                if (!acc.mainOptionBonuses[type]) {
                    acc.mainOptionBonuses[type] = { value: 0, isPercentage: item.options.main.isPercentage };
                }
                acc.mainOptionBonuses[type].value += item.options.main.value;
            }

            // Combat Sub Options
            item.options.combatSubs.forEach(sub => {
                const type = sub.type as CoreStat;
                if (!acc.combatSubOptionBonuses[type]) {
                    acc.combatSubOptionBonuses[type] = { value: 0, isPercentage: sub.isPercentage };
                }
                acc.combatSubOptionBonuses[type].value += sub.value;
            });

            // Special Sub Options
            item.options.specialSubs.forEach(sub => {
                const type = sub.type as SpecialStat;
                if (!acc.specialStatBonuses[type]) {
                    acc.specialStatBonuses[type] = { flat: 0, percent: 0 };
                }
                if (sub.isPercentage) {
                    acc.specialStatBonuses[type].percent += sub.value;
                } else {
                    acc.specialStatBonuses[type].flat += sub.value;
                }
            });

            // Mythic Sub Options
            item.options.mythicSubs.forEach(sub => {
                const type = sub.type as MythicStat; // Cast to MythicStat
                if (!acc.aggregatedMythicStats[type]) {
                    acc.aggregatedMythicStats[type] = { count: 0, totalValue: 0 };
                }
                acc.aggregatedMythicStats[type].count++;
                acc.aggregatedMythicStats[type].totalValue += sub.value;
            });

            return acc;
        }, initialBonuses);

        return aggregated;
    }, [currentUserWithStatus]);

    return {
        currentUser,
        presets,
        setCurrentUserAndRoute,
        currentUserWithStatus,
        updateTrigger,
        currentRoute,
        error,
        allUsers,
        onlineUsers,
        liveGames,
        negotiations,
        waitingRoomChats,
        gameChats,
        adminLogs,
        gameModeAvailability,
        announcements,
        globalOverrideAnnouncement,
        announcementInterval,
        activeGame,
        activeNegotiation,
        showExitToast,
        enhancementResult,
        enhancementOutcome,
        unreadMailCount,
        hasClaimableQuest,
        settings,
        updateTheme,
        updateSoundSetting,
        updateFeatureSetting,
        updatePanelColor,
        updateTextColor,
        resetGraphicsToDefault,
        mainOptionBonuses,
        combatSubOptionBonuses,
        specialStatBonuses,
        aggregatedMythicStats,
        modals: {
            isSettingsModalOpen, isInventoryOpen, isMailboxOpen, isQuestsOpen, isShopOpen, shopInitialTab, lastUsedItemResult,
            disassemblyResult, craftResult, rewardSummary, viewingUser, isInfoModalOpen, isEncyclopediaOpen, isStatAllocationModalOpen, enhancementAnimationTarget,
            pastRankingsInfo, viewingItem, isProfileEditModalOpen, moderatingUser,
            isClaimAllSummaryOpen,
            claimAllSummary,
            isMbtiInfoModalOpen,
            isEquipmentEffectsModalOpen,
            isBlacksmithModalOpen,
            blacksmithSelectedItemForEnhancement,
            blacksmithActiveTab,
            combinationResult,
            isBlacksmithHelpOpen,
            enhancingItem,
            isEnhancementResultModalOpen,
            tournamentScoreChange,
        },
        handlers: {
            handleAction,
            handleLogout,
            handleEnterWaitingRoom,
            applyPreset,
            openSettingsModal: () => setIsSettingsModalOpen(true),
            closeSettingsModal: () => setIsSettingsModalOpen(false),
            openInventory: () => setIsInventoryOpen(true),
            closeInventory: () => setIsInventoryOpen(false),
            openMailbox: () => setIsMailboxOpen(true),
            closeMailbox: () => setIsMailboxOpen(false),
            openQuests: () => setIsQuestsOpen(true),
            closeQuests: () => setIsQuestsOpen(false),
            openShop: (tab?: 'equipment' | 'materials' | 'consumables' | 'misc') => {
                setShopInitialTab(tab);
                setIsShopOpen(true);
            },
            closeShop: () => {
                setIsShopOpen(false);
                setShopInitialTab(undefined);
            },
            closeItemObtained: () => {
                setLastUsedItemResult(null);
                setTournamentScoreChange(null);
            },
            closeDisassemblyResult: () => setDisassemblyResult(null),
            closeCraftResult: () => setCraftResult(null),
            closeCombinationResult: () => setCombinationResult(null),
            closeRewardSummary: () => setRewardSummary(null),
            closeClaimAllSummary,
            openViewingUser: handleViewUser,
            closeViewingUser: () => setViewingUser(null),
            openInfoModal: () => setIsInfoModalOpen(true),
            closeInfoModal: () => setIsInfoModalOpen(false),
            openEncyclopedia: () => setIsEncyclopediaOpen(true),
            closeEncyclopedia: () => setIsEncyclopediaOpen(false),
            openStatAllocationModal: () => setIsStatAllocationModalOpen(true),
            closeStatAllocationModal: () => setIsStatAllocationModalOpen(false),
            openProfileEditModal: () => setIsProfileEditModalOpen(true),
            closeProfileEditModal: () => setIsProfileEditModalOpen(false),
            openPastRankings: (info: { user: UserWithStatus; mode: GameMode | 'strategic' | 'playful'; }) => setPastRankingsInfo(info),
            closePastRankings: () => setPastRankingsInfo(null),
            openViewingItem,
            closeViewingItem: () => setViewingItem(null),
            openEnhancingItem,
            openEnhancementFromDetail,
            clearEnhancementOutcome,
            clearEnhancementAnimation: () => setEnhancementAnimationTarget(null),
            openModerationModal,
            closeModerationModal,
            openMbtiInfoModal: () => setIsMbtiInfoModalOpen(true),
            closeMbtiInfoModal: () => setIsMbtiInfoModalOpen(false),
            openEquipmentEffectsModal: () => setIsEquipmentEffectsModalOpen(true),
            closeEquipmentEffectsModal: () => setIsEquipmentEffectsModalOpen(false),
            openBlacksmithModal: () => setIsBlacksmithModalOpen(true),
            closeBlacksmithModal: () => {
                setIsBlacksmithModalOpen(false);
                setBlacksmithSelectedItemForEnhancement(null);
                setBlacksmithActiveTab('enhance'); // Reset to default tab
            },
            openBlacksmithHelp: () => setIsBlacksmithHelpOpen(true),
            closeBlacksmithHelp: () => setIsBlacksmithHelpOpen(false),
            setBlacksmithActiveTab,
            closeEnhancementModal,
        },
    };
};