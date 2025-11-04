import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
        if (!negotiations || typeof negotiations !== 'object' || Array.isArray(negotiations)) {
            return null;
        }
        try {
            const negotiationsArray = Object.values(negotiations);
            return negotiationsArray.find(neg => 
                neg && neg.challenger && neg.opponent &&
                ((neg.challenger.id === currentUserWithStatus.id && (neg.status === 'pending' || neg.status === 'draft')) ||
                (neg.opponent.id === currentUserWithStatus.id && neg.status === 'pending'))
            ) || null;
        } catch (error) {
            console.error('[activeNegotiation] Error:', error);
            return null;
        }
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
        } else if (action.type === 'SAVE_PRESET') {
            setCurrentUser(prevUser => {
                if (!prevUser) return null;
                const { preset, index } = action.payload;
                const newPresets = [...prevUser.equipmentPresets];
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
                if (result.redirectToTournament) {
                    window.location.hash = `#/tournament/${result.redirectToTournament}`;
                }
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

        const connectWebSocket = () => {
            if (!shouldReconnect || !currentUser) return;
            
            try {
                // Close existing connection if any
                if (ws && ws.readyState !== WebSocket.CLOSED) {
                    ws.close();
                }
                
                ws = new WebSocket(`ws://${window.location.hostname}:4000`);

                ws.onopen = () => {
                    console.log('[WebSocket] Connected');
                    isIntentionalClose = false;
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        switch (message.type) {
                            case 'INITIAL_STATE':
                                console.log('INITIAL_STATE payload:', message.payload);
                                const { users, onlineUsers, liveGames, negotiations, waitingRoomChats, gameChats, adminLogs, announcements, globalOverrideAnnouncement, gameModeAvailability, announcementInterval } = message.payload;
                                console.log('[WebSocket] Received users:', users ? Object.keys(users).length : 0, 'users');
                                if (users && typeof users === 'object' && !Array.isArray(users)) {
                                    setUsersMap(users);
                                    console.log('[WebSocket] usersMap updated with', Object.keys(users).length, 'users');
                                } else {
                                    console.warn('[WebSocket] Invalid users data:', users);
                                    setUsersMap({});
                                }
                                setOnlineUsers(onlineUsers || []);
                                setLiveGames(liveGames || {});
                                setNegotiations(negotiations || {});
                                setWaitingRoomChats(waitingRoomChats || {});
                                setGameChats(gameChats || {});
                                setAdminLogs(adminLogs || []);
                                setAnnouncements(announcements || []);
                                setGlobalOverrideAnnouncement(globalOverrideAnnouncement || null);
                                setGameModeAvailability(gameModeAvailability || {});
                                setAnnouncementInterval(announcementInterval || 3);
                                break;
                            case 'USER_STATUS_UPDATE':
                                setUsersMap(currentUsersMap => {
                                    // message.payload는 모든 온라인 유저의 상태 정보를 포함합니다
                                    // usersMap에 있는 유저를 찾고, 없으면 allUsers에서 찾아서 추가
                                    const updatedUsersMap = { ...currentUsersMap };
                                    const onlineStatuses = Object.entries(message.payload).map(([id, statusInfo]: [string, any]) => {
                                        let user = currentUsersMap[id];
                                        // usersMap에 없으면 allUsers에서 찾기
                                        if (!user) {
                                            const allUsersArray = Object.values(currentUsersMap);
                                            user = allUsersArray.find(u => u?.id === id);
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
                                    return updatedUsersMap;
                                });
                                break;
                        }
                    } catch (error) {
                        console.error('[WebSocket] Error parsing message:', error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('[WebSocket] Error:', error);
                };

                ws.onclose = (event) => {
                    console.log('[WebSocket] Disconnected', event.code, event.reason);
                    if (!isIntentionalClose && shouldReconnect && currentUser) {
                        // Reconnect after 3 seconds if not intentional close
                        reconnectTimeout = setTimeout(() => {
                            if (shouldReconnect && currentUser) {
                                console.log('[WebSocket] Attempting to reconnect...');
                                connectWebSocket();
                            }
                        }, 3000);
                    }
                };
            } catch (error) {
                console.error('[WebSocket] Failed to create connection:', error);
                if (shouldReconnect && currentUser) {
                    reconnectTimeout = setTimeout(() => {
                        if (shouldReconnect && currentUser) {
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
        // usersMap에 현재 유저 추가 (실시간 업데이트를 위해)
        setUsersMap(prev => ({ ...prev, [user.id]: user }));
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

    const applyPreset = useCallback((preset: EquipmentPreset) => {
        handleAction({ type: 'APPLY_PRESET', payload: { presetName: preset.name } });
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

        if (!currentUserWithStatus || !currentUserWithStatus.equipment || !currentUserWithStatus.inventory) {
            return initialBonuses;
        }

        const equippedItems = currentUserWithStatus.inventory.filter(item =>
            currentUserWithStatus.equipment && Object.values(currentUserWithStatus.equipment).includes(item.id)
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
            enhancingItem,
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
            openShop: () => setIsShopOpen(true),
            closeShop: () => setIsShopOpen(false),
            closeItemObtained: () => setLastUsedItemResult(null),
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