
import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, ServerAction, GameMode, UserWithStatus } from '../../types.js';
import { GAME_CHAT_MESSAGES, GAME_CHAT_EMOJIS } from '../../constants';
import { containsProfanity } from '../../profanity.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';

interface ChatWindowProps {
    messages: ChatMessage[];
    onAction: (a: ServerAction) => void;
    mode: GameMode | 'global';
    onViewUser?: (userId: string) => void; // Optional for profile view
    locationPrefix?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onAction, mode, onViewUser, locationPrefix }) => {
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const quickChatRef = useRef<HTMLDivElement>(null);
    const [chatInput, setChatInput] = useState('');
    const [showQuickChat, setShowQuickChat] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const { currentUserWithStatus, handlers } = useAppContext();

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => {
                setCooldown(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (quickChatRef.current && !quickChatRef.current.contains(event.target as Node)) {
                setShowQuickChat(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = (message: { text?: string, emoji?: string }) => {
        if (cooldown > 0) return;
        const payload = { channel: 'global', ...message, location: locationPrefix };
        onAction({ type: 'SEND_CHAT_MESSAGE', payload });
        setShowQuickChat(false);
        setChatInput('');
        setCooldown(5);
    };
    
    const handleSendTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        if (containsProfanity(chatInput)) {
            alert("부적절한 단어가 포함되어 있어 메시지를 전송할 수 없습니다.");
            setChatInput('');
            return;
        }
        handleSend({ text: chatInput });
    };

    if (!currentUserWithStatus) {
        return null;
    }
    
    const handleUserClick = (userId: string) => {
        if (currentUserWithStatus.isAdmin && userId !== currentUserWithStatus.id) {
            handlers.openModerationModal(userId);
        } else if (userId !== currentUserWithStatus.id) {
            const viewUserHandler = onViewUser || handlers.openViewingUser;
            viewUserHandler(userId);
        }
    };

    const isBanned = (currentUserWithStatus.chatBanUntil ?? 0) > Date.now();
    const banTimeLeft = isBanned ? Math.ceil((currentUserWithStatus.chatBanUntil! - Date.now()) / 1000 / 60) : 0;
    const isInputDisabled = isBanned || cooldown > 0;
    const placeholderText = isBanned 
        ? `채팅 금지 중 (${banTimeLeft}분 남음)` 
        : isInputDisabled
            ? `(${cooldown}초)`
            : "[메시지 입력]";

    return (
        <div className="p-4 flex flex-col h-full min-h-0 text-on-panel">
            <h2 className="text-lg font-semibold border-b border-color pb-1 flex-shrink-0">전체채팅</h2>
            <p className="text-[10px] text-center text-yellow-400 bg-tertiary/50 rounded-sm p-0.5">AI 보안관봇이 부적절한 언어 사용을 감지하고 있습니다. 🚓</p>
            <div ref={chatBodyRef} className="flex-grow space-y-0.5 overflow-y-auto pr-1 bg-tertiary/40 p-1 rounded-md min-h-0">
                {messages.map(msg => {
                    const isBotMessage = msg.system && !msg.actionInfo && msg.user.nickname === 'AI 보안관봇';
                    return (
                        <div key={msg.id} className="text-xs">
                            {msg.location && <span className="font-semibold text-tertiary pr-1">{msg.location}</span>}
                            <span 
                                className={`font-semibold pr-2 ${msg.system ? 'text-highlight' : 'text-tertiary cursor-pointer hover:underline'}`}
                                onClick={() => !msg.system && handleUserClick(msg.user.id)}
                                title={!msg.system ? `${msg.user.nickname} 프로필 보기 / 제재` : ''}
                            >
                                {msg.system ? (isBotMessage ? 'AI 보안관봇' : '시스템') : msg.user.nickname}:
                            </span>
                            {msg.text && <span className={isBotMessage ? 'text-highlight' : ''}>{msg.text}{isBotMessage && ' 🚓'}</span>}
                            {msg.emoji && <span className="text-xl">{msg.emoji}</span>}
                        </div>
                    );
                })}
                {messages.length === 0 && <div className="h-full flex items-center justify-center text-tertiary text-sm">채팅 메시지가 없습니다.</div>}
            </div>
            <div className="relative flex-shrink-0">
               {showQuickChat && (
                   <div ref={quickChatRef} className="absolute bottom-full mb-2 w-full bg-secondary rounded-lg shadow-xl p-1 z-10 max-h-64 overflow-y-auto">
                       <div className="grid grid-cols-5 gap-1 text-xl mb-1 border-b border-color pb-1">
                          {GAME_CHAT_EMOJIS.map(emoji => ( <button key={emoji} onClick={() => handleSend({ emoji })} className="w-full p-1 rounded-md hover:bg-accent transition-colors text-center"> {emoji} </button> ))}
                       </div>
                       <ul className="space-y-0.5">
                          {GAME_CHAT_MESSAGES.map(msg => ( <li key={msg}> <button onClick={() => handleSend({ text: msg })} className="w-full text-left text-xs p-1 rounded-md hover:bg-accent transition-colors"> {msg} </button> </li> ))}
                       </ul>
                   </div>
               )}
               <form onSubmit={handleSendTextSubmit} className="flex gap-1">
                    <button type="button" onClick={() => setShowQuickChat(s => !s)} className="bg-secondary hover:bg-tertiary text-primary font-bold px-2.5 rounded-md transition-colors text-lg flex items-center justify-center" title="빠른 채팅" disabled={isInputDisabled}>
                        <span>🙂</span>
                    </button>
                   <input
                       type="text"
                       value={chatInput}
                       onChange={e => setChatInput(e.target.value)}
                       placeholder={placeholderText}
                       className="flex-grow bg-tertiary border border-color rounded-md p-1 focus:ring-accent focus:border-accent text-xs disabled:bg-secondary disabled:text-tertiary"
                       maxLength={30}
                       disabled={isInputDisabled}
                   />
                   <Button type="submit" disabled={!chatInput.trim() || isInputDisabled} className="!px-2 !py-1" title="보내기">
                        💬
                   </Button>
               </form>
            </div>
        </div>
    );
};

export default ChatWindow;
