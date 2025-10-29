import React, { useMemo, useState, useEffect, useRef } from 'react';
import Header from './components/Header.js';
import { AppProvider } from './contexts/AppContext.js';
import { useAppContext } from './hooks/useAppContext.js';
import Router from './components/Router.js';
import NegotiationModal from './components/NegotiationModal.js';
import InventoryModal from './components/InventoryModal.js';
import MailboxModal from './components/MailboxModal.js';
import QuestsModal from './components/QuestsModal.js';
import ShopModal from './components/ShopModal.js';
import UserProfileModal from './components/UserProfileModal.js';
import InfoModal from './components/InfoModal.js';
import DisassemblyResultModal from './components/DisassemblyResultModal.js';
import StatAllocationModal from './components/StatAllocationModal.js';
import EnhancementModal from './components/EnhancementModal.js';
import ItemDetailModal from './components/ItemDetailModal.js';
import ProfileEditModal from './components/ProfileEditModal.js';
import ItemObtainedModal from './components/ItemObtainedModal.js';
import BulkItemObtainedModal from './components/BulkItemObtainedModal.js';
import EncyclopediaModal from './components/modals/EncyclopediaModal.js';
import PastRankingsModal from './components/modals/PastRankingsModal.js';
import AdminModerationModal from './components/AdminModerationModal.js';
import RewardSummaryModal from './components/RewardSummaryModal.js';
import { preloadImages, ALL_IMAGE_URLS } from './services/assetService.js';
import CraftingResultModal from './components/CraftingResultModal.js';
import { audioService } from './services/audioService.js';
import SettingsModal from './components/SettingsModal.js';
import ClaimAllSummaryModal from './components/ClaimAllSummaryModal.js';
import MbtiInfoModal from './components/MbtiInfoModal.js';
import BlacksmithModal from './components/BlacksmithModal.js';

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
            document.removeEventListener('pointerdown', initAudio);
        };
        document.addEventListener('pointerdown', initAudio);

        return () => {
            document.removeEventListener('pointerdown', initAudio);
        };
    }, []);

    useEffect(() => {
        if (currentUser) {
            preloadImages(ALL_IMAGE_URLS).then(() => {
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
        if (modals.lastUsedItemResult) ids.push('itemObtained');
        if (modals.disassemblyResult) ids.push('disassemblyResult');
        if (modals.craftResult) ids.push('craftResult');
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
        return ids;
    }, [modals, activeNegotiation]);

    const topmostModalId = activeModalIds.length > 0 ? activeModalIds[activeModalIds.length - 1] : null;
    
    const isGameView = currentRoute.view === 'game';
    const backgroundClass = currentUser ? 'bg-primary' : 'bg-login-background';

    return (
        <div className={`font-sans ${backgroundClass} text-primary h-dvh flex flex-col`}>
            {isPreloading && (
                <div className="fixed inset-0 bg-tertiary z-[100] flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                    <p className="mt-4 text-primary">에셋 로딩 중...</p>
                </div>
            )}
            {error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-slide-down">
                    <div className="bg-danger border-2 border-red-500 rounded-lg shadow-2xl p-4 text-white font-bold text-center">{error}</div>
                </div>
            )}
             {showQuestToast && (
                <div 
                    onClick={() => { handlers.openQuests(); setShowQuestToast(false); }}
                    className="fixed top-20 right-4 w-full max-w-xs z-50 animate-slide-in-right cursor-pointer"
                >
                    <div className="bg-success border-2 border-green-400 rounded-lg shadow-2xl p-4 text-white font-bold text-center">
                        📜 완료된 퀘스트가 있습니다!
                    </div>
                </div>
            )}
            {enhancementResult && !modals.enhancingItem && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-slide-down">
                    <div className={`${enhancementResult.success ? 'bg-accent border-accent' : 'bg-danger border-red-500'} border-2 rounded-lg shadow-2xl p-4 text-white font-bold text-center`}>{enhancementResult.message}</div>
                </div>
            )}
            {showExitToast && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-slide-down-fast">
                    <div className="bg-primary border-2 border-color rounded-lg shadow-2xl p-3 text-primary font-semibold text-center">한번 더 뒤로가기를 하면 로그아웃 됩니다.</div>
                </div>
            )}
            
            {currentUser && !isGameView && <Header />}
            
            <main className="flex-1 flex flex-col min-h-0">
                <Router />
            </main>
            
            {/* Render modals only when a user is logged in */}
            {currentUserWithStatus && (
                <>
                    {modals.isSettingsModalOpen && <SettingsModal onClose={handlers.closeSettingsModal} isTopmost={topmostModalId === 'settings'} />}
                    {modals.isInventoryOpen && <InventoryModal currentUser={currentUserWithStatus} onClose={handlers.closeInventory} onAction={handlers.handleAction} onStartEnhance={handlers.openEnhancingItem} enhancementAnimationTarget={modals.enhancementAnimationTarget} onAnimationComplete={handlers.clearEnhancementAnimation} isTopmost={topmostModalId === 'inventory'} />}
                    {modals.isMailboxOpen && <MailboxModal currentUser={currentUserWithStatus} onClose={handlers.closeMailbox} onAction={handlers.handleAction} isTopmost={topmostModalId === 'mailbox'} />}
                    {modals.isQuestsOpen && <QuestsModal currentUser={currentUserWithStatus} onClose={handlers.closeQuests} onAction={handlers.handleAction} isTopmost={topmostModalId === 'quests'} />}
                    {modals.rewardSummary && <RewardSummaryModal summary={modals.rewardSummary} onClose={handlers.closeRewardSummary} isTopmost={topmostModalId === 'rewardSummary'} />}
                    {modals.isClaimAllSummaryOpen && modals.claimAllSummary && <ClaimAllSummaryModal summary={modals.claimAllSummary} onClose={handlers.closeClaimAllSummary} isTopmost={topmostModalId === 'claimAllSummary'} />}
                    {modals.isShopOpen && <ShopModal currentUser={currentUserWithStatus} onClose={handlers.closeShop} onAction={handlers.handleAction} isTopmost={topmostModalId === 'shop'} />}
                    
                    {modals.lastUsedItemResult && modals.lastUsedItemResult.length === 1 && <ItemObtainedModal item={modals.lastUsedItemResult[0]} onClose={handlers.closeItemObtained} isTopmost={topmostModalId === 'itemObtained'} />}
                    {modals.lastUsedItemResult && modals.lastUsedItemResult.length > 1 && <BulkItemObtainedModal items={modals.lastUsedItemResult} onClose={handlers.closeItemObtained} isTopmost={topmostModalId === 'itemObtained'} />}

                    {modals.disassemblyResult && <DisassemblyResultModal result={modals.disassemblyResult} onClose={handlers.closeDisassemblyResult} isTopmost={topmostModalId === 'disassemblyResult'} />}
                    {modals.craftResult && <CraftingResultModal result={modals.craftResult} onClose={handlers.closeCraftResult} isTopmost={topmostModalId === 'craftResult'} />}
                    {modals.viewingUser && <UserProfileModal user={modals.viewingUser} onClose={handlers.closeViewingUser} onViewItem={handlers.openViewingItem} isTopmost={topmostModalId === 'viewingUser'} />}
                    {modals.isInfoModalOpen && <InfoModal onClose={handlers.closeInfoModal} isTopmost={topmostModalId === 'infoModal'} />}
                    {modals.isEncyclopediaOpen && <EncyclopediaModal onClose={handlers.closeEncyclopedia} isTopmost={topmostModalId === 'encyclopedia'} />}
                    {modals.isStatAllocationModalOpen && <StatAllocationModal currentUser={currentUserWithStatus} onClose={handlers.closeStatAllocationModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'statAllocation'} />}
                    {modals.isProfileEditModalOpen && <ProfileEditModal currentUser={currentUserWithStatus} onClose={handlers.closeProfileEditModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'profileEdit'} />}
                    {modals.pastRankingsInfo && <PastRankingsModal info={modals.pastRankingsInfo} onClose={handlers.closePastRankings} isTopmost={topmostModalId === 'pastRankings'} />}
                    {modals.moderatingUser && <AdminModerationModal user={modals.moderatingUser} currentUser={currentUserWithStatus} onClose={handlers.closeModerationModal} onAction={handlers.handleAction} isTopmost={topmostModalId === 'moderatingUser'} />}
                    {modals.viewingItem && <ItemDetailModal item={modals.viewingItem.item} isOwnedByCurrentUser={modals.viewingItem.isOwnedByCurrentUser} onClose={handlers.closeViewingItem} onStartEnhance={handlers.openEnhancementFromDetail} isTopmost={topmostModalId === 'viewingItem'} />}
                    {modals.enhancingItem && <EnhancementModal item={modals.enhancingItem} currentUser={currentUserWithStatus} onClose={handlers.closeEnhancementModal} onAction={handlers.handleAction} enhancementOutcome={enhancementOutcome} onOutcomeConfirm={handlers.clearEnhancementOutcome} isTopmost={topmostModalId === 'enhancingItem'} />}
                    {activeNegotiation && <NegotiationModal negotiation={activeNegotiation} currentUser={currentUserWithStatus} onAction={handlers.handleAction} onlineUsers={onlineUsers} isTopmost={topmostModalId === 'negotiation'} />}
                    {modals.isMbtiInfoModalOpen && <MbtiInfoModal onClose={handlers.closeMbtiInfoModal} isTopmost={topmostModalId === 'mbtiInfo'} />}
                    {modals.isBlacksmithModalOpen && <BlacksmithModal onClose={handlers.closeBlacksmithModal} isTopmost={topmostModalId === 'blacksmith'} onStartEnhance={handlers.openEnhancingItem} />}
                </>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;