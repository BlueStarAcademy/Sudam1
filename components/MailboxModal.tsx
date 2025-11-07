import React, { useState, useEffect } from 'react';
import { UserWithStatus, Mail, ServerAction, InventoryItem } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { audioService } from '../services/audioService.js';
import { useAppContext } from '../hooks/useAppContext.js';

interface MailboxModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    isTopmost?: boolean;
}

const formatRemainingTime = (expiresAt: number): string => {
    const remainingSeconds = Math.max(0, (expiresAt - Date.now()) / 1000);
    if (remainingSeconds === 0) return "만료됨";

    const days = Math.floor(remainingSeconds / (24 * 3600));
    const hours = Math.floor((remainingSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
};


const MailboxModal: React.FC<MailboxModalProps> = ({ currentUser: propCurrentUser, onClose, onAction, isTopmost }) => {
    const { currentUserWithStatus } = useAppContext();
    
    // useAppContext의 currentUserWithStatus를 우선 사용 (최신 상태 보장)
    const currentUser = currentUserWithStatus || propCurrentUser;
    
    const { mail } = currentUser;
    const [selectedMail, setSelectedMail] = useState<Mail | null>(mail.length > 0 ? mail[0] : null);
    const [remainingTime, setRemainingTime] = useState<string | null>(null);
    
    useEffect(() => {
        // This effect keeps the selectedMail state in sync with the currentUser prop.
        if (selectedMail) {
            const updatedVersion = mail.find(m => m.id === selectedMail.id);
            if (updatedVersion) {
                // Only update state if the object has actually changed to prevent re-renders
                if (JSON.stringify(updatedVersion) !== JSON.stringify(selectedMail)) {
                    setSelectedMail(updatedVersion);
                }
            } else {
                // The selected mail was deleted, so select the first available or null
                setSelectedMail(mail.length > 0 ? mail[0] : null);
            }
        } else if (mail.length > 0) {
            // If nothing is selected, but there is mail, select the first one.
            setSelectedMail(mail[0]);
        }
    }, [mail, selectedMail]);


    useEffect(() => {
        if (selectedMail && !selectedMail.isRead) {
            onAction({ type: 'MARK_MAIL_AS_READ', payload: { mailId: selectedMail.id } });
        }
    }, [selectedMail, onAction]);

    useEffect(() => {
        if (selectedMail?.expiresAt) {
            const updateTimer = () => {
                setRemainingTime(formatRemainingTime(selectedMail.expiresAt!));
            };
            updateTimer();
            const interval = setInterval(updateTimer, 60000); // Update every minute
            return () => clearInterval(interval);
        } else {
            setRemainingTime(null);
        }
    }, [selectedMail]);

    const handleClaim = () => {
        if (selectedMail && selectedMail.attachments && !selectedMail.attachmentsClaimed) {
            audioService.claimReward();
            onAction({ type: 'CLAIM_MAIL_ATTACHMENTS', payload: { mailId: selectedMail.id } });
        }
    };
    
    const handleDelete = () => {
        if (selectedMail) {
            const nextMailIndex = mail.findIndex(m => m.id === selectedMail.id) - 1;
            onAction({ type: 'DELETE_MAIL', payload: { mailId: selectedMail.id } });
            setSelectedMail(mail.length > 1 ? mail[Math.max(0, nextMailIndex)] : null);
        }
    };

    const hasUnclaimedMail = mail.some(m => m.attachments && !m.attachmentsClaimed);
    const hasClaimedMail = mail.some(m => m.attachmentsClaimed);

    const handleClaimAll = () => {
        audioService.claimReward();
        onAction({ type: 'CLAIM_ALL_MAIL_ATTACHMENTS' });
    };

    const handleDeleteAllClaimed = () => {
        if (window.confirm('수령 완료된 모든 메일을 삭제하시겠습니까?')) {
            onAction({ type: 'DELETE_ALL_CLAIMED_MAIL' });
            // After deleting, select the first mail if available
            const remainingMail = mail.filter(m => !m.attachmentsClaimed);
            setSelectedMail(remainingMail.length > 0 ? remainingMail[0] : null);
        }
    };

    return (
        <DraggableWindow title="우편함" onClose={onClose} windowId="mailbox" initialWidth={800} isTopmost={isTopmost}>
            <div className="flex gap-6 h-[65vh]">
                {/* Mail List */}
                <div className="w-1/3 bg-gray-900/50 rounded-lg p-3 flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 flex-shrink-0">받은 우편 ({mail.length})</h3>
                    <div className="flex flex-col gap-2 mb-2 flex-shrink-0">
                        <Button onClick={handleClaimAll} disabled={!hasUnclaimedMail} colorScheme="green" className="!text-sm !py-2">
                            일괄 수령
                        </Button>
                        <Button onClick={handleDeleteAllClaimed} disabled={!hasClaimedMail} colorScheme="red" className="!text-sm !py-2">
                            수령 완료 메일 삭제
                        </Button>
                    </div>
                    <ul className="space-y-1 overflow-y-auto flex-grow pr-2">
                        {mail.map(m => (
                            <li key={m.id}>
                                <button
                                    onClick={() => setSelectedMail(m)}
                                    className={`w-full text-left p-2 rounded-md transition-colors ${selectedMail?.id === m.id ? 'bg-blue-600' : 'hover:bg-gray-700/50'}`}
                                >
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>From: {m.from}</span>
                                        {!m.isRead && <span className="text-yellow-400 font-bold">● New</span>}
                                    </div>
                                    <p className="font-semibold truncate">{m.title}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Mail Details */}
                <div className="w-2/3 flex flex-col">
                    {selectedMail ? (
                        <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col h-full">
                            <div className="flex-grow flex flex-col mb-4">
                                <h2 className="text-xl font-bold mb-2 pb-2 border-b border-gray-700">{selectedMail.title}</h2>
                                <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                                    <span>보낸 사람: {selectedMail.from}</span>
                                    {remainingTime && <span>남은 시간: <span className="text-yellow-400 font-semibold">{remainingTime}</span></span>}
                                </div>
                                <div className="text-sm text-gray-300 flex-grow bg-gray-800/50 p-3 rounded-md overflow-y-auto">
                                    {selectedMail.message}
                                </div>
                            </div>
                            <div className="flex-shrink-0 pt-4 border-t border-gray-700">
                                {selectedMail.attachments && (
                                    <div className="bg-gray-800 p-3 rounded-lg mb-4">
                                        <h4 className="font-semibold text-gray-300 mb-2">첨부 아이템</h4>
                                        {selectedMail.attachmentsClaimed ? (
                                            <p className="text-gray-400 text-center">[수령 완료]</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                {(selectedMail.attachments?.actionPoints ?? 0) > 0 && <span>⚡ {selectedMail.attachments.actionPoints!.toLocaleString()} 행동력</span>}
                                                {(selectedMail.attachments?.gold ?? 0) > 0 && <span className="flex items-center gap-1"><img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4" /> {selectedMail.attachments.gold!.toLocaleString()} 골드</span>}
                                                {(selectedMail.attachments?.diamonds ?? 0) > 0 && <span className="flex items-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" /> {selectedMail.attachments.diamonds!.toLocaleString()} 다이아</span>}
                                                {selectedMail.attachments.items?.map((item, index) => {
                                                    const inventoryItem = item as InventoryItem;
                                                    return (
                                                        <span key={index} className="flex items-center gap-1">
                                                            {inventoryItem.image && <img src={inventoryItem.image} alt={inventoryItem.name} className="w-4 h-4 object-contain" />}
                                                            {inventoryItem.name} {inventoryItem.quantity && inventoryItem.quantity > 1 ? `x${inventoryItem.quantity}` : ''}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between items-center gap-3">
                                    <Button onClick={handleDelete} colorScheme="red">삭제</Button>
                                    <Button 
                                        onClick={handleClaim} 
                                        colorScheme="green" 
                                        disabled={!selectedMail.attachments || selectedMail.attachmentsClaimed}
                                    >
                                        {selectedMail.attachmentsClaimed ? '수령 완료' : '보상 받기'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
                            <p className="text-gray-400">받은 우편이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MailboxModal;
