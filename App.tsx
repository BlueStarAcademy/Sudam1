import React, { useMemo, useState, useEffect, useRef, Suspense, lazy } from 'react';
import Header from './components/Header.js';
import { AppProvider } from './contexts/AppContext.js';
import { useAppContext } from './hooks/useAppContext.js';
import Router from './components/Router.js';
import NegotiationModal from './components/NegotiationModal.js';
import ChallengeReceivedModal from './components/ChallengeReceivedModal.js';
// 큰 모달들은 lazy loading으로 로드
const InventoryModal = lazy(() => import('./components/InventoryModal.js'));
const MailboxModal = lazy(() => import('./components/MailboxModal.js'));
const QuestsModal = lazy(() => import('./components/QuestsModal.js'));
const ShopModal = lazy(() => import('./components/ShopModal.js'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal.js'));
const EncyclopediaModal = lazy(() => import('./components/modals/EncyclopediaModal.js'));
const PastRankingsModal = lazy(() => import('./components/modals/PastRankingsModal.js'));
const AdminModerationModal = lazy(() => import('./components/AdminModerationModal.js'));
const BlacksmithModal = lazy(() => import('./components/BlacksmithModal.js'));
const BlacksmithHelpModal = lazy(() => import('./components/blacksmith/BlacksmithHelpModal.js'));
const GameRecordListModal = lazy(() => import('./components/GameRecordListModal.js'));
const GameRecordViewerModal = lazy(() => import('./components/GameRecordViewerModal.js'));
// 작은 모달들은 즉시 로드
import InfoModal from './components/InfoModal.js';
import DisassemblyResultModal from './components/DisassemblyResultModal.js';
import StatAllocationModal from './components/StatAllocationModal.js';
import ItemDetailModal from './components/ItemDetailModal.js';
import ProfileEditModal from './components/ProfileEditModal.js';
import ItemObtainedModal from './components/ItemObtainedModal.js';
import BulkItemObtainedModal from './components/BulkItemObtainedModal.js';
import RewardSummaryModal from './components/RewardSummaryModal.js';
import { preloadImages, ALL_IMAGE_URLS } from './services/assetService.js';
import CraftingResultModal from './components/CraftingResultModal.js';
import { audioService } from './services/audioService.js';
import SettingsModal from './components/SettingsModal.js';
import ClaimAllSummaryModal from './components/ClaimAllSummaryModal.js';
import MbtiInfoModal from './components/MbtiInfoModal.js';
import CombinationResultModal from './components/blacksmith/CombinationResultModal.js';
import EnhancementModal from './components/EnhancementModal';
import EquipmentEffectsModal from './components/EquipmentEffectsModal';
import EnhancementResultModal from './components/modals/EnhancementResultModal.js';
import InstallPrompt from './components/InstallPrompt.js';

// Lazy 로드된 모달을 위한 로딩 컴포넌트
const ModalLoadingFallback = () => null;

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

// AppContent is the part of the app that can access the context
const AppContent: React.FC = () => {
    const {
        currentUser,
        currentUserWithStatus,
        currentRoute,
        error,
        activeNegotiation,
        modals,
        showExitToast,
        enhancementResult,
        enhancementOutcome,
        handlers,
        onlineUsers,
        hasClaimableQuest,
        settings,
        mainOptionBonuses,
        combatSubOptionBonuses,
        specialStatBonuses,
        aggregatedMythicStats,
    } = useAppContext();
    
    const [isPreloading, setIsPreloading] = useState(true);
    const [showQuestToast, setShowQuestToast] = useState(false);
    
    const prevHasClaimableQuest = usePrevious(hasClaimableQuest);

    useEffect(() => {
        if (settings.features.questNotifications && hasClaimableQuest && !prevHasClaimableQuest) {
            setShowQuestToast(true);
            const timer = setTimeout(() => setShowQuestToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [hasClaimableQuest, prevHasClaimableQuest, settings.features.questNotifications]);

    useEffect(() => {
        if (showQuestToast) {
            const timer = setTimeout(() => setShowQuestToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showQuestToast]);


    useEffect(() => {
        const initAudio = () => {
            audioService.initialize();
            // 모든 이벤트 리스너 제거
            document.removeEventListener('pointerdown', initAudio);
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchend', initAudio);
        };
        
        // 모바일 환경을 위한 여러 이벤트 타입 지원
        document.addEventListener('pointerdown', initAudio);
        document.addEventListener('touchstart', initAudio);
        document.addEventListener('click', initAudio);
        document.addEventListener('touchend', initAudio);

        return () => {
            document.removeEventListener('pointerdown', initAudio);
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchend', initAudio);
        };
    }, []);

    useEffect(() => {
        if (currentUser) {
            // 우선순위가 높은 이미지들만 먼저 로드 (UI에 즉시 필요한 것들)
            // 나머지는 백그라운드에서 점진적으로 로드
            preloadImages(ALL_IMAGE_URLS, { priority: 'low', batchSize: 15 }).then(() => {
                setIsPreloading(false);
            });
        } else {
            setIsPreloading(false);
        }
    }, [currentUser]);

    const activeModalIds = useMemo(() => {
        const ids: string[] = [];
        if (activeNegotiation) ids.push('negotiation');
        if (modals.isSettingsModalOpen) ids.push('settings');
        if (modals.isInventoryOpen) ids.push('inventory');
        if (modals.isMailboxOpen) ids.push('mailbox');
        if (modals.isQuestsOpen) ids.push('quests');
        if (modals.rewardSummary) ids.push('rewardSummary');
        if (modals.isClaimAllSummaryOpen) ids.push('claimAllSummary');
        if (modals.isShopOpen) ids.push('shop');
        if (modals.viewingUser) ids.push('viewingUser');
        if (modals.isInfoModalOpen) ids.push('infoModal');
        if (modals.isEncyclopediaOpen) ids.push('encyclopedia');
        if (modals.isStatAllocationModalOpen) ids.push('statAllocation');
        if (modals.isProfileEditModalOpen) ids.push('profileEdit');
        if (modals.pastRankingsInfo) ids.push('pastRankings');
        if (modals.moderatingUser) ids.push('moderatingUser');
        if (modals.viewingItem) ids.push('viewingItem');
        if (modals.enhancingItem) ids.push('enhancingItem');
        if (modals.isBlacksmithModalOpen) ids.push('blacksmith');
        if (modals.isBlacksmithHelpOpen) ids.push('blacksmithHelp');
        if (modals.isGameRecordListOpen) ids.push('gameRecordList');
        if (modals.viewingGameRecord) ids.push('gameRecordViewer');
        // 결과 모달들은 대장간보다 뒤에 추가하여 항상 위에 표시
        if (modals.combinationResult) ids.push('combinationResult');
        if (modals.disassemblyResult) ids.push('disassemblyResult');
        if (modals.craftResult) ids.push('craftResult');
        if (modals.isEnhancementResultModalOpen) ids.push('enhancementResult');
        if (modals.isMbtiInfoModalOpen) ids.push('mbtiInfo');
        // itemObtained은 항상 마지막에 추가하여 최상단에 표시
        if (modals.lastUsedItemResult) ids.push('itemObtained');
        return ids;
    }, [modals, activeNegotiation]);

    const topmostModalId = activeModalIds.length > 0 ? activeModalIds[activeModalIds.length - 1] : null;
    
    const isGameView = currentRoute.view === 'game';
    const backgroundClass = currentUser ? 'bg-primary' : 'bg-login-background';

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    return (
        <div className={`font-sans ${backgroundClass} text-primary h-full flex flex-col`} style={{ 
            height: isMobile ? '100dvh' : '100vh',
            maxHeight: isMobile ? '100dvh' : '100vh'
        }}>
            {isPreloading && (
                <div className="fixed inset-0 bg-tertiary z-[100] flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                    <p className="mt-4 text-primary">에셋 로딩 중...</p>
                </div>
            )}
            {showExitToast && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-slide-down-fast">
                    <div className="bg-primary border-2 border-color rounded-lg shadow-2xl p-3 text-primary font-semibold text-center">한번 더 뒤로가기를 하면 로그아웃 됩니다.</div>
                </div>
            )}
            
            {currentUser && !isGameView && <Header />}
            
            {currentUser ? (
                <main className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ 
                    paddingBottom: typeof window !== 'undefined' && window.innerWidth < 768 ? 'max(env(safe-area-inset-bottom, 0px), 20px)' : '0px',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    <Router />
                </main>
            ) : (
                <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-tertiary bg-[url('/images/bg/loginbg.png')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/60"></div>
                    <header className="relative text-center z-10 pt-8 md:pt-16 mb-8">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-widest uppercase title-glow-secondary" style={{ fontFamily: 'serif' }}>
                            SUDAM
                        </h1>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-wider mt-2 title-glow-secondary" style={{ fontFamily: 'serif' }}>
                            The Ascending Masters
                        </h2>
                        <p className="mt-4 text-xs sm:text-sm text-gray-300">
                            Supreme Universe of Dueling Ascending Masters (S.U.D.A.M)
                            <br/>
                            (격돌하는 초인들이 승천하는 최고의 세계)
                        </p>
                    </header>
                    <main className="relative flex-1 flex flex-col min-h-0 z-10">
                        <Router />
                    </main>
                </div>
            )}
            
            {/* Render modals only when a user is logged in */}
            {currentUserWithStatus && (
                <>
                    {modals.isSettingsModalOpen && <SettingsModal onClose={handlers.closeSettingsModal} isTopmost={topmostModalId === 'settings'} />}
                    {modals.isInventoryOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <InventoryModal currentUser={currentUserWithStatus} onClose={handlers.closeInventory} onAction={handlers.handleAction} onStartEnhance={handlers.openEnhancingItem} enhancementAnimationTarget={modals.enhancementAnimationTarget} onAnimationComplete={handlers.clearEnhancementAnimation} isTopmost={topmostModalId === 'inventory'} />
                        </Suspense>
                    )}
                    {modals.isMailboxOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <MailboxModal currentUser={currentUserWithStatus} onClose={handlers.closeMailbox} onAction={handlers.handleAction} isTopmost={topmostModalId === 'mailbox'} />
                        </Suspense>
                    )}
                    {modals.isQuestsOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <QuestsModal currentUser={currentUserWithStatus} onClose={handlers.closeQuests} onAction={handlers.handleAction} isTopmost={topmostModalId === 'quests'} />
                        </Suspense>
                    )}
                    {modals.rewardSummary && <RewardSummaryModal summary={modals.rewardSummary} onClose={handlers.closeRewardSummary} isTopmost={topmostModalId === 'rewardSummary'} />}
                    {modals.isClaimAllSummaryOpen && modals.claimAllSummary && <ClaimAllSummaryModal summary={modals.claimAllSummary} onClose={handlers.closeClaimAllSummary} isTopmost={topmostModalId === 'claimAllSummary'} />}
                    {modals.isShopOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <ShopModal currentUser={currentUserWithStatus} onClose={handlers.closeShop} onAction={handlers.handleAction} isTopmost={topmostModalId === 'shop'} initialTab={modals.shopInitialTab} />
                        </Suspense>
                    )}
                    
                    {modals.lastUsedItemResult && modals.lastUsedItemResult.length === 1 && <ItemObtainedModal item={modals.lastUsedItemResult[0]} onClose={handlers.closeItemObtained} isTopmost={topmostModalId === 'itemObtained'} />}
                    {modals.lastUsedItemResult && modals.lastUsedItemResult.length > 1 && <BulkItemObtainedModal items={modals.lastUsedItemResult} onClose={handlers.closeItemObtained} isTopmost={topmostModalId === 'itemObtained'} tournamentScoreChange={modals.tournamentScoreChange} />}

                    {modals.disassemblyResult && <DisassemblyResultModal result={modals.disassemblyResult} onClose={handlers.closeDisassemblyResult} isTopmost={topmostModalId === 'disassemblyResult'} isOpen={true} />}
                    {modals.craftResult && (() => {
                        console.log('[App] Rendering CraftingResultModal:', {
                            craftResult: modals.craftResult,
                            topmostModalId,
                            isTopmost: topmostModalId === 'craftResult'
                        });
                        return <CraftingResultModal result={modals.craftResult} onClose={handlers.closeCraftResult} isTopmost={topmostModalId === 'craftResult'} />;
                    })()}
                    {modals.viewingUser && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <UserProfileModal user={modals.viewingUser} onClose={handlers.closeViewingUser} onViewItem={handlers.openViewingItem} isTopmost={topmostModalId === 'viewingUser'} />
                        </Suspense>
                    )}
                    {modals.isInfoModalOpen && <InfoModal onClose={handlers.closeInfoModal} isTopmost={topmostModalId === 'infoModal'} />}
                    {modals.isEncyclopediaOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <EncyclopediaModal onClose={handlers.closeEncyclopedia} isTopmost={topmostModalId === 'encyclopedia'} />
                        </Suspense>
                    )}
                    {modals.isStatAllocationModalOpen && <StatAllocationModal currentUser={currentUserWithStatus} onClose={handlers.closeStatAllocationModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'statAllocation'} />}
                    {modals.isProfileEditModalOpen && <ProfileEditModal currentUser={currentUserWithStatus} onClose={handlers.closeProfileEditModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'profileEdit'} />}
                    {modals.pastRankingsInfo && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <PastRankingsModal info={modals.pastRankingsInfo} onClose={handlers.closePastRankings} isTopmost={topmostModalId === 'pastRankings'} />
                        </Suspense>
                    )}
                    {modals.moderatingUser && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <AdminModerationModal user={modals.moderatingUser} currentUser={currentUserWithStatus} onClose={handlers.closeModerationModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'moderatingUser'} />
                        </Suspense>
                    )}
                    {modals.viewingItem && <ItemDetailModal item={modals.viewingItem.item} isOwnedByCurrentUser={modals.viewingItem.isOwnedByCurrentUser} onClose={handlers.closeViewingItem} onStartEnhance={handlers.openEnhancementFromDetail} isTopmost={topmostModalId === 'viewingItem'} />}
                    {activeNegotiation && (() => {
                        // Check if this is a received challenge (current user is opponent, and it's the initial turn)
                        // 단, 이미 수정 제안이 시작된 경우(turnCount > 0)는 NegotiationModal 사용
                        // 수신자가 받은 초기 신청서 또는 수정 제안 후 발신자가 받은 신청서
                        const isReceivedChallenge = activeNegotiation.status === 'pending' && 
                                                     ((activeNegotiation.opponent.id === currentUserWithStatus.id && 
                                                       activeNegotiation.proposerId === activeNegotiation.opponent.id) ||
                                                      (activeNegotiation.challenger.id === currentUserWithStatus.id && 
                                                       activeNegotiation.proposerId === activeNegotiation.challenger.id &&
                                                       (activeNegotiation.turnCount ?? 0) > 0));
                        
                        // 발신자가 보는 초기 negotiation은 ChallengeSelectionModal에서 처리하므로 제외
                        const isChallengerWaiting = activeNegotiation.challenger.id === currentUserWithStatus.id && 
                                                    activeNegotiation.status === 'pending' && 
                                                    activeNegotiation.proposerId === activeNegotiation.opponent.id &&
                                                    activeNegotiation.turnCount === 0;
                        
                        if (isChallengerWaiting) {
                            // 발신자는 ChallengeSelectionModal에서 응답을 기다리므로 NegotiationModal 표시하지 않음
                            return null;
                        }
                        
                        if (isReceivedChallenge) {
                            return (
                                <ChallengeReceivedModal
                                    negotiation={activeNegotiation}
                                    currentUser={currentUserWithStatus}
                                    onAccept={(settings) => {
                                        handlers.handleAction({ 
                                            type: 'ACCEPT_NEGOTIATION', 
                                            payload: { negotiationId: activeNegotiation.id, settings } 
                                        });
                                    }}
                                    onDecline={() => {
                                        handlers.handleAction({ 
                                            type: 'DECLINE_NEGOTIATION', 
                                            payload: { negotiationId: activeNegotiation.id } 
                                        });
                                    }}
                                    onProposeModification={(settings) => {
                                        // To switch to NegotiationModal for modification, call UPDATE_NEGOTIATION
                                        handlers.handleAction({ 
                                            type: 'UPDATE_NEGOTIATION', 
                                            payload: { negotiationId: activeNegotiation.id, settings } 
                                        });
                                    }}
                                    onClose={() => {
                                        handlers.handleAction({ 
                                            type: 'DECLINE_NEGOTIATION', 
                                            payload: { negotiationId: activeNegotiation.id } 
                                        });
                                    }}
                                    onAction={handlers.handleAction}
                                />
                            );
                        }
                        // 수정 제안이 시작된 경우(turnCount > 0)만 NegotiationModal 사용
                        return (
                            <NegotiationModal 
                                negotiation={activeNegotiation} 
                                currentUser={currentUserWithStatus} 
                                onAction={handlers.handleAction} 
                                onlineUsers={onlineUsers} 
                                isTopmost={topmostModalId === 'negotiation'} 
                            />
                        );
                    })()}
                    {modals.isMbtiInfoModalOpen && <MbtiInfoModal onClose={handlers.closeMbtiInfoModal} isTopmost={topmostModalId === 'mbtiInfo'} />}
                    {modals.isBlacksmithModalOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <BlacksmithModal 
                                onClose={handlers.closeBlacksmithModal} 
                                isTopmost={topmostModalId === 'blacksmith'} 
                                selectedItemForEnhancement={modals.blacksmithSelectedItemForEnhancement} 
                                activeTab={modals.blacksmithActiveTab} 
                                onSetActiveTab={handlers.setBlacksmithActiveTab} 
                                enhancementOutcome={enhancementOutcome} 
                            />
                        </Suspense>
                    )}
                    {modals.combinationResult && <CombinationResultModal result={modals.combinationResult} onClose={handlers.closeCombinationResult} isTopmost={topmostModalId === 'combinationResult'} />}
                    {modals.isBlacksmithHelpOpen && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <BlacksmithHelpModal onClose={handlers.closeBlacksmithHelp} isTopmost={topmostModalId === 'blacksmithHelp'} currentUser={currentUserWithStatus} />
                        </Suspense>
                    )}
                    {modals.isEnhancementResultModalOpen && enhancementOutcome && <EnhancementResultModal result={enhancementOutcome} onClose={handlers.closeEnhancementModal} isTopmost={topmostModalId === 'enhancementResult'} />}
                    {modals.isClaimAllSummaryOpen && modals.claimAllSummary && <ClaimAllSummaryModal summary={modals.claimAllSummary} onClose={handlers.closeClaimAllSummary} isTopmost={topmostModalId === 'claimAllSummary'} />}
                    {modals.isMbtiInfoModalOpen && <MbtiInfoModal onClose={handlers.closeMbtiInfoModal} isTopmost={topmostModalId === 'mbtiInfo'} />}
                    {modals.isEquipmentEffectsModalOpen && <EquipmentEffectsModal onClose={handlers.closeEquipmentEffectsModal} isTopmost={topmostModalId === 'equipmentEffects'} mainOptionBonuses={mainOptionBonuses} combatSubOptionBonuses={combatSubOptionBonuses} specialStatBonuses={specialStatBonuses} aggregatedMythicStats={aggregatedMythicStats} />}
                    {modals.isGameRecordListOpen && currentUserWithStatus && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <GameRecordListModal 
                                currentUser={currentUserWithStatus} 
                                onClose={handlers.closeGameRecordList} 
                                onAction={handlers.handleAction}
                                onViewRecord={handlers.openGameRecordViewer}
                                isTopmost={topmostModalId === 'gameRecordList'}
                            />
                        </Suspense>
                    )}
                    {modals.viewingGameRecord && (
                        <Suspense fallback={ModalLoadingFallback()}>
                            <GameRecordViewerModal 
                                record={modals.viewingGameRecord} 
                                onClose={handlers.closeGameRecordViewer}
                                isTopmost={topmostModalId === 'gameRecordViewer'}
                            />
                        </Suspense>
                    )}
                </>
            )}
            <InstallPrompt />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <div className="app-container">
            <AppProvider>
                <AppContent />
            </AppProvider>
        </div>
    );
};

export default App;