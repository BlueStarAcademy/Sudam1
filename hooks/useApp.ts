import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// FIX: The main types barrel file now exports settings types. Use it for consistency.
import { User, LiveGameSession, UserWithStatus, ServerAction, GameMode, Negotiation, ChatMessage, UserStatus, AdminLog, Announcement, OverrideAnnouncement, InventoryItem, AppState, InventoryItemType, AppRoute, QuestReward, DailyQuestData, WeeklyQuestData, MonthlyQuestData, Theme, SoundSettings, FeatureSettings, AppSettings } from '../types.js';
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

    const [presets, setPresets] = useState<Array<{name: string, equipment: Partial<Record<import('../types.js').EquipmentSlot, string>>}>>(() => {
        try {
            const stored = localStorage.getItem('presets');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) { console.error('Failed to parse presets from localStorage', e); }
        return Array(5).fill(null).map((_, i) => ({ name: `프리셋 ${i + 1}`, equipment: {} }));
    });
    
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
    const [liveGames, setLiveGames] = useState<Record<string, LiveGameSession>>({});
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
    const [lastUsedItemResult, setLastUsedItemResult] = useState<InventoryItem[] | null>(null);
    const [disassemblyResult, setDisassemblyResult] = useState<{ gained: { name: string, amount: number }[], jackpot: boolean } | null>(null);
    const [craftResult, setCraftResult] = useState<{ gained: { name: string; amount: number }[]; used: { name: string; amount: number }[]; craftType: 'upgrade' | 'downgrade'; } | null>(null);
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
    const [pastRankingsInfo, setPastRankingsInfo] = useState<{ user: UserWithStatus; mode: GameMode; } | null>(null);
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
        if (enhancementOutcome) {
            setIsEnhancementResultModalOpen(true);
        } else {
            setIsEnhancementResultModalOpen(false);
        }
    }, [enhancementOutcome]);

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
        try {
            localStorage.setItem('presets', JSON.stringify(presets));
        } catch (e) { console.error('Failed to save presets to localStorage', e); }
    }, [presets]);

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
    const allUsers = useMemo(() => Object.values(usersMap), [usersMap]);

    const currentUserWithStatus: UserWithStatus | null = useMemo(() => {
        if (!currentUser) return null;
        const statusInfo = onlineUsers.find(u => u.id === currentUser.id);
        return { ...currentUser, ...(statusInfo || { status: 'online' as UserStatus }) };
    }, [currentUser, onlineUsers]);

    const activeGame = useMemo(() => {
        if (!currentUserWithStatus) return null;
        const gameId = currentUserWithStatus.gameId || currentUserWithStatus.spectatingGameId;
        if (gameId && (currentUserWithStatus.status === 'in-game' || currentUserWithStatus.status === 'spectating' || currentUserWithStatus.status === 'negotiating')) {
             const game = liveGames[gameId];
             if (game) return game;
        }
        return null;
    }, [currentUserWithStatus, liveGames]);

    const activeNegotiation = useMemo(() => {
        if (!currentUserWithStatus) return null;
        return Object.values(negotiations).find(neg => (
            (neg.challenger.id === currentUserWithStatus.id) ||
            (neg.opponent.id === currentUserWithStatus.id && neg.status === 'pending')
        )) || null;
    }, [currentUserWithStatus, negotiations]);

    const unreadMailCount = useMemo(() => currentUser?.mail.filter(m => !m.isRead).length || 0, [currentUser?.mail]);

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
        if (action.type === 'TOGGLE_EQUIP_ITEM') {
            setCurrentUser(prevUser => {
                if (!prevUser) return null;
                const { itemId } = action.payload;
                const itemToToggle = prevUser.inventory.find(i => i.id === itemId);
    
                if (!itemToToggle || itemToToggle.type !== 'equipment' || !itemToToggle.slot) {
                    return prevUser;
                }
    
                const slotToUpdate = itemToToggle.slot;
                const isEquipping = !itemToToggle.isEquipped;
                
                const newEquipment = { ...prevUser.equipment };
                if (isEquipping) {
                    newEquipment[slotToUpdate] = itemToToggle.id;
                } else {
                    delete newEquipment[slotToUpdate];
                }
    
                const newInventory = prevUser.inventory.map(item => {
                    if (item.id === itemId) return { ...item, isEquipped: isEquipping };
                    if (isEquipping && item.slot === slotToUpdate && item.id !== itemId) return { ...item, isEquipped: false };
                    return item;
                });
                
                return { ...prevUser, inventory: newInventory, equipment: newEquipment };
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
                const errorData = await res.json();
                showError(errorData.message || 'An unknown error occurred.');
                 if (action.type === 'TOGGLE_EQUIP_ITEM' || action.type === 'USE_ITEM') {
                    setCurrentUser(prevUser => prevUser ? { ...prevUser } : null);
                 }
            } else {
                const result = await res.json();
                if (result.updatedUser) {
                    setCurrentUser(result.updatedUser);
                }
                 if (result.obtainedItemsBulk) setLastUsedItemResult(result.obtainedItemsBulk);
                 if (result.rewardSummary) setRewardSummary(result.rewardSummary);
                if (result.claimAllSummary) {
                    setClaimAllSummary(result.claimAllSummary);
                    setIsClaimAllSummaryOpen(true);
                }
                if (result.disassemblyResult) { 
                    setDisassemblyResult(result.disassemblyResult);
                    if (result.disassemblyResult.jackpot) audioService.disassemblyJackpot();
                }
                if (result.craftResult) {
                    setCraftResult(result.craftResult);
                }
                if (result.combinationResult) {
                    setCombinationResult(result.combinationResult);
                    if (result.combinationResult.isGreatSuccess) {
                        audioService.combinationGreatSuccess(); // Assuming this sound exists
                    } else {
                        audioService.combinationSuccess(); // Assuming this sound exists
                    }
                }
                if (result.enhancementOutcome) {
                    const { message, success, itemBefore, itemAfter } = result.enhancementOutcome;
                    setEnhancementResult({ message, success });
                    setEnhancementOutcome({ message, success, itemBefore, itemAfter });
                    if (success) {
                        audioService.enhancementSuccess();
                    } else {
                        audioService.enhancementFail();
                    }
                }
                if (result.enhancementAnimationTarget) setEnhancementAnimationTarget(result.enhancementAnimationTarget);
            }
        } catch (err: any) {
            showError(err.message);
        }
    }, [currentUser?.id]);

    const handleLogout = useCallback(() => {
        if (!currentUser) return;
        isLoggingOut.current = true;
        handleAction({ type: 'LOGOUT' });
        setCurrentUser(null);
        window.location.hash = '';
    }, [currentUser, handleAction]);
    
    // --- State Polling ---
    useEffect(() => {
        if (!currentUser?.id) return;
        const poll = async () => {
            if (isLoggingOut.current) return;
            try {
                const response = await fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id }),
                });
                if (isLoggingOut.current) return;
                if (!response.ok) {
                    if (response.status === 401) { setCurrentUser(null); window.location.hash = ''; }
                    throw new Error('Failed to fetch state');
                }
                const data: AppState = await response.json();
                if (isLoggingOut.current) return;
                
                const updateStateIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, newData: T) => {
                    setter(newData);
                };
    
                const updatedUser = (() => {
                    const user = data.users[currentUser.id];
                    if (user && typeof user.inventorySlots === 'string') {
                        try {
                            return { ...user, inventorySlots: JSON.parse(user.inventorySlots) };
                        } catch (e) {
                            console.error("Failed to parse inventorySlots string:", e);
                            return user; // Return original user if parsing fails
                        }
                    }
                    return user;
                })();
                setCurrentUser(updatedUser || null);

                updateStateIfChanged(setUsersMap, data.users);
                updateStateIfChanged(setLiveGames, data.liveGames);
                updateStateIfChanged(setNegotiations, data.negotiations);
                updateStateIfChanged(setWaitingRoomChats, data.waitingRoomChats);
                updateStateIfChanged(setGameChats, data.gameChats);
                updateStateIfChanged(setAdminLogs, data.adminLogs);
                updateStateIfChanged(setGameModeAvailability, data.gameModeAvailability);
                updateStateIfChanged(setAnnouncements, data.announcements);
                updateStateIfChanged(setGlobalOverrideAnnouncement, data.globalOverrideAnnouncement);
                updateStateIfChanged(setAnnouncementInterval, data.announcementInterval);
    
                const onlineStatuses = Object.entries(data.userStatuses).map(([id, statusInfo]) => ({ ...data.users[id], ...statusInfo }));
                updateStateIfChanged(setOnlineUsers, onlineStatuses as UserWithStatus[]);
            } catch (err) { console.error("Polling error:", err); }
        };
    
        poll();
        const interval = setInterval(poll, 1000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

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
            window.location.hash = `#/game/${activeGame.id}`;
        } else if (!activeGame && isGamePage) {
            let targetHash = '#/profile';
            if (currentUserWithStatus?.status === 'waiting' && currentUserWithStatus?.mode) {
                targetHash = `#/waiting/${encodeURIComponent(currentUserWithStatus.mode)}`;
            }
            if (currentHash !== targetHash) {
                window.location.hash = targetHash;
            }
        }
    }, [currentUser, activeGame, currentUserWithStatus]);
    
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
        const userToView = onlineUsers.find(u => u.id === userId) || allUsers.find(u => u.id === userId);
        if (userToView) {
            const statusInfo = onlineUsers.find(u => u.id === userId);
            setViewingUser({ ...userToView, ...(statusInfo || { status: 'online'}) });
        }
    }, [onlineUsers, allUsers]);

    const openModerationModal = useCallback((userId: string) => {
        const userToView = onlineUsers.find(u => u.id === userId) || allUsers.find(u => u.id === userId);
        if (userToView) {
            const statusInfo = onlineUsers.find(u => u.id === userId);
            setModeratingUser({ ...userToView, ...(statusInfo || { status: 'online'}) });
        }
    }, [onlineUsers, allUsers]);

    const closeModerationModal = useCallback(() => setModeratingUser(null), []);

    const setCurrentUserAndRoute = useCallback((user: User) => {
        setCurrentUser(user);
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
        setEnhancementOutcome(null);
    }, []);

    const closeClaimAllSummary = useCallback(() => {
        setIsClaimAllSummaryOpen(false);
        setClaimAllSummary(null);
    }, []);

    const applyPreset = useCallback((preset: { equipment: Partial<Record<import('../types.js').EquipmentSlot, string>> }) => {
        if (!preset || !currentUserWithStatus) return;
    
        const currentEquipment = currentUserWithStatus.equipment;
        const presetEquipment = preset.equipment;
    
        const allSlots = new Set([...Object.keys(currentEquipment), ...Object.keys(presetEquipment)]) as Set<import('../types.js').EquipmentSlot>;
    
        for (const slot of allSlots) {
            const currentItemId = currentEquipment[slot];
            const presetItemId = presetEquipment[slot];
    
            if (currentItemId !== presetItemId) {
                if (presetItemId) {
                    handleAction({ type: 'TOGGLE_EQUIP_ITEM', payload: { itemId: presetItemId } });
                }
                else if (currentItemId) {
                    handleAction({ type: 'TOGGLE_EQUIP_ITEM', payload: { itemId: currentItemId } });
                }
            }
        }
    }, [currentUserWithStatus, handleAction]);

    return {
        currentUser,
        setCurrentUserAndRoute,
        currentUserWithStatus,
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
        presets,
        setPresets,
        modals: {
            isSettingsModalOpen, isInventoryOpen, isMailboxOpen, isQuestsOpen, isShopOpen, lastUsedItemResult,
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
            isEnhancementResultModalOpen,
        },
        handlers: {
            handleAction,
            handleLogout,
            handleEnterWaitingRoom,
            openSettingsModal: () => setIsSettingsModalOpen(true),
            closeSettingsModal: () => setIsSettingsModalOpen(false),
            openInventory: () => setIsInventoryOpen(true),
            closeInventory: () => setIsInventoryOpen(false),
            openMailbox: () => setIsMailboxOpen(true),
            closeMailbox: () => setIsMailboxOpen(false),
            openQuests: () => setIsQuestsOpen(true),
            closeQuests: () => setIsQuestsOpen(false),
            openShop: () => setIsShopOpen(true),
            closeShop: () => setIsShopOpen(false),
            closeItemObtained: () => setLastUsedItemResult(null),
            closeDisassemblyResult: () => setDisassemblyResult(null),
            closeCraftResult: () => setCraftResult(null),
            closeCombinationResult: () => setCombinationResult(null),
            applyPreset,
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
            openPastRankings: (info: { user: UserWithStatus; mode: GameMode; }) => setPastRankingsInfo(info),
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
        },
    };
};