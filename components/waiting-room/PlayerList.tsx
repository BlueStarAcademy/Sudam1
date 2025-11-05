import React, { useMemo, useState, useEffect } from 'react';
import { UserWithStatus, ServerAction, UserStatus, GameMode, Negotiation } from '../../types.js';
import Avatar from '../Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../../constants';
import Button from '../Button.js';
import ChallengeSelectionModal from '../ChallengeSelectionModal';
import GameRejectionSettingsModal from '../GameRejectionSettingsModal.tsx';
import { useAppContext } from '../../hooks/useAppContext.js';

const statusDisplay: Record<UserStatus, { text: string; color: string; }> = {
  'online': { text: '온라인', color: 'text-green-500' },
  'waiting': { text: '대기 중', color: 'text-green-400' },
  'resting': { text: '휴식 중', color: 'text-gray-400' },
  'negotiating': { text: '협상 중', color: 'text-yellow-400' },
  'in-game': { text: '대국 중', color: 'text-blue-400' },
  'spectating': { text: '관전 중', color: 'text-purple-400' },
};

interface PlayerListProps {
    users: UserWithStatus[];
    onAction: (a: ServerAction) => void;
    currentUser: UserWithStatus;
    mode: GameMode | 'strategic' | 'playful';
    negotiations: Negotiation[];
    onViewUser: (userId: string) => void;
    lobbyType: 'strategic' | 'playful';
}

const PlayerList: React.FC<PlayerListProps> = ({ users, onAction, currentUser, mode, negotiations, onViewUser, lobbyType }) => {
    const [isChallengeSelectionModalOpen, setIsChallengeSelectionModalOpen] = useState(false);
    const [challengeTargetUser, setChallengeTargetUser] = useState<UserWithStatus | null>(null);
    const [isRejectionSettingsModalOpen, setIsRejectionSettingsModalOpen] = useState(false);
    const me = users.find(user => user.id === currentUser.id);
    const otherUsers = users.filter(user => user.id !== currentUser.id).sort((a,b) => a.nickname.localeCompare(b.nickname));

    const canChallenge = (targetUser: UserWithStatus) => {
        // The current user must be in the waiting room to use this UI
        if (currentUser.status !== 'waiting') {
            return false;
        }
        // The target user can be either in the waiting room or online (in profile)
        return targetUser.status === 'waiting' || targetUser.status === 'online';
    };

    const renderUserItem = (user: UserWithStatus, isCurrentUser: boolean) => {
        const isChallengeable = !isCurrentUser && canChallenge(user);
        const statusInfo = statusDisplay[user.status];
        const isDiceGo = mode === GameMode.Dice;

        const sentNegotiation = !isCurrentUser ? negotiations.find(n => 
            n.challenger.id === currentUser.id && 
            n.opponent.id === user.id && 
            (n.status === 'pending' || n.status === 'draft')
        ) : null;
        
        const avatarUrl = AVATAR_POOL.find(a => a.id === user.avatarId)?.url;
        const borderUrl = BORDER_POOL.find(b => b.id === user.borderId)?.url;

        return (
            <li key={user.id} className={`flex items-center justify-between p-1.5 rounded-lg ${isCurrentUser ? 'bg-blue-900/40 border border-blue-700' : 'bg-tertiary/50'}`}>
                <div 
                    className={`flex items-center gap-2 lg:gap-3 overflow-hidden ${!isCurrentUser ? 'cursor-pointer' : ''}`}
                    onClick={() => !isCurrentUser && onViewUser(user.id)}
                    title={!isCurrentUser ? `${user.nickname} 프로필 보기` : ''}
                >
                    <Avatar userId={user.id} userName={user.nickname} size={36} className="border-2 border-color" avatarUrl={avatarUrl} borderUrl={borderUrl} />
                    {isDiceGo && <div className="w-5 h-5 rounded-full bg-black border border-gray-300 flex-shrink-0" />}
                    <div className="overflow-hidden">
                        <h3 className="font-bold text-sm lg:text-base truncate">{user.nickname}</h3>
                        <span className={`text-xs ${statusInfo.color}`}>● {statusInfo.text}</span>
                    </div>
                </div>
                {isCurrentUser ? (
                    <select
                        value={currentUser.status}
                        onChange={(e) => onAction({ type: 'SET_USER_STATUS', payload: { status: e.target.value } })}
                        disabled={!['waiting', 'resting'].includes(currentUser.status)}
                        className="px-2 py-1 lg:px-3 lg:py-1.5 bg-secondary border border-color rounded-lg text-xs lg:text-sm transition-colors w-20 lg:w-24 text-center focus:ring-accent focus:border-accent disabled:opacity-50"
                    >
                        <option value="waiting">대기 중</option>
                        <option value="resting">휴식 중</option>
                        {!['waiting', 'resting'].includes(currentUser.status) && (
                            <option value={currentUser.status} disabled>{statusDisplay[currentUser.status].text}</option>
                        )}
                    </select>
                ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {currentUser.isAdmin && !user.isAdmin && (
                            <Button
                                onClick={() => {
                                    if (window.confirm(`[${user.nickname}]님을 강제로 접속 종료하시겠습니까?`)) {
                                        onAction({ type: 'ADMIN_FORCE_LOGOUT', payload: { targetUserId: user.id } });
                                    }
                                }}
                                colorScheme="red"
                                className="!text-xs !py-1 !px-2"
                            >
                                강제 퇴장
                            </Button>
                        )}
                        {sentNegotiation ? (
                             <Button
                                onClick={() => onAction({ type: 'DECLINE_NEGOTIATION', payload: { negotiationId: sentNegotiation.id } })}
                                colorScheme="red"
                                className="!text-xs !py-1 !px-2"
                            >
                                신청 취소
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    setChallengeTargetUser(user);
                                    setIsChallengeSelectionModalOpen(true);
                                }}
                                disabled={!isChallengeable}
                                className="!text-xs !py-1 !px-2"
                            >
                                대국 신청
                            </Button>
                        )}
                    </div>
                )}
            </li>
        );
    };

    return (
        <div className="p-3 flex flex-col min-h-0 text-on-panel">
             <h2 className="text-xl font-semibold mb-2 border-b border-color pb-2 flex-shrink-0 flex justify-between items-center">
                <span>유저 목록</span>
                                <Button
                                    onClick={() => setIsRejectionSettingsModalOpen(true)}
                                    colorScheme="none"
                                    className="!text-xs !py-1 !px-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
                                >
                                    대국 신청 거부
                                </Button>            </h2>
            {me && (
              <div className="flex-shrink-0 mb-2">
                  {renderUserItem(me, true)}
              </div>
            )}
            <ul className="space-y-2 overflow-y-auto pr-2 max-h-[calc(var(--vh,1vh)*25)] min-h-[96px]">
                {otherUsers.length > 0 ? otherUsers.map(user => renderUserItem(user, false)) : (
                    <p className="text-center text-tertiary pt-8">다른 플레이어가 없습니다.</p>
                )}
            </ul>
            {isRejectionSettingsModalOpen && (
                <GameRejectionSettingsModal
                    onClose={() => setIsRejectionSettingsModalOpen(false)}
                    lobbyType={lobbyType}
                />
            )}
            {isChallengeSelectionModalOpen && challengeTargetUser && (
                <ChallengeSelectionModal
                    opponent={challengeTargetUser}
                    onClose={() => setIsChallengeSelectionModalOpen(false)}
                    negotiations={negotiations}
                    currentUser={currentUser}
                    onChallenge={async (gameMode, settings) => {
                        // 모달을 닫지 않고 유지하여 응답을 기다림
                        
                        // CHALLENGE_USER로 draft negotiation 생성
                        const createChallengeAction = { 
                            type: 'CHALLENGE_USER', 
                            payload: { opponentId: challengeTargetUser.id, mode: gameMode, settings } 
                        };
                        
                        // handleAction을 직접 호출하여 응답을 받음
                        try {
                            const response = await fetch('/api/action', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    ...createChallengeAction,
                                    userId: currentUser.id
                                })
                            });
                            
                            const result = await response.json();
                            if (result.error) {
                                alert(result.error);
                                return;
                            }
                            
                            // 응답에서 negotiationId를 받아서 즉시 SEND_CHALLENGE 호출
                            const negotiationId = result.negotiationId || result.clientResponse?.negotiationId;
                            if (negotiationId) {
                                onAction({ 
                                    type: 'SEND_CHALLENGE', 
                                    payload: { negotiationId, settings } 
                                });
                            } else {
                                // negotiationId가 없으면 WebSocket 업데이트를 기다림
                                setTimeout(() => {
                                    const negotiationsArray = Object.values(negotiations || {});
                                    const draftNegotiation = negotiationsArray.find(n => 
                                        n.challenger.id === currentUser.id && 
                                        n.opponent.id === challengeTargetUser.id && 
                                        n.status === 'draft'
                                    );
                                    
                                    if (draftNegotiation) {
                                        onAction({ 
                                            type: 'SEND_CHALLENGE', 
                                            payload: { negotiationId: draftNegotiation.id, settings } 
                                        });
                                    }
                                }, 300);
                            }
                        } catch (error) {
                            console.error('Failed to send challenge:', error);
                            alert('대국 신청 전송에 실패했습니다.');
                        }
                    }}
                    lobbyType={lobbyType}
                />
            )}
        </div>
    );
};

export default PlayerList;