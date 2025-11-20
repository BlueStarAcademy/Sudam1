import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { GuildMessage } from '../../types/entities.js';
import Button from '../Button.js';
import Avatar from '../Avatar.js';

interface GuildChatProps {
    guildId: string;
    messages: GuildMessage[];
    onMessagesUpdate: (messages: GuildMessage[]) => void;
}

const GuildChat: React.FC<GuildChatProps> = ({ guildId, messages, onMessagesUpdate }) => {
    const { handlers, allUsers } = useAppContext();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();
        
        // Listen for WebSocket guild messages
        const ws = (window as any).ws;
        if (!ws) return;
        
        const handleMessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'GUILD_MESSAGE' && message.payload?.message?.guildId === guildId) {
                    const newMessage = message.payload.message;
                    onMessagesUpdate(prev => [...prev, newMessage]);
                }
            } catch (e) {
                // Ignore
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [guildId, onMessagesUpdate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        try {
            const result: any = await handlers.handleAction({
                type: 'GET_GUILD_MESSAGES',
                payload: { limit: 50 },
            });
            if (result && !result.error && result.clientResponse?.messages) {
                onMessagesUpdate(result.clientResponse.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        setLoading(true);
        try {
            const result: any = await handlers.handleAction({
                type: 'SEND_GUILD_MESSAGE',
                payload: { content: input.trim() },
            });
            if (result && !result.error && result.clientResponse?.message) {
                onMessagesUpdate([...messages, result.clientResponse.message]);
                setInput('');
            } else if (result?.error) {
                alert(result.error);
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            alert(error.message || '메시지 전송에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {messages.map((message) => {
                    const author = allUsers?.find(u => u.id === message.authorId);
                    return (
                        <div key={message.id} className="flex gap-3 p-2 hover:bg-gray-800/50 rounded">
                            <Avatar userId={message.authorId} userName={author?.nickname || 'Unknown'} size={32} />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-white">{author?.nickname || 'Unknown'}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(message.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-white text-sm mt-1">{message.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <Button
                    onClick={handleSend}
                    colorScheme="blue"
                    disabled={loading || !input.trim()}
                    className="!py-2 !px-4"
                >
                    전송
                </Button>
            </div>
        </div>
    );
};

export default GuildChat;

