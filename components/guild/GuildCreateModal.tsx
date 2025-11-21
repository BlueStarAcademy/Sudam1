import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { Guild } from '../../types/entities.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';
import { resourceIcons } from '../resourceIcons.js';

interface GuildCreateModalProps {
    onClose: () => void;
    onSuccess: (guild: Guild) => void;
}

const GuildCreateModal: React.FC<GuildCreateModalProps> = ({ onClose, onSuccess }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if user already has a guild when modal opens
    // Admin users can always create a guild, even if they're in one
    useEffect(() => {
        if (currentUserWithStatus?.guildId && !currentUserWithStatus?.isAdmin) {
            // User already has a guild (and is not admin), close modal to show guild home
            onClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserWithStatus?.guildId, currentUserWithStatus?.isAdmin]);

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('길드 이름을 입력해주세요.');
            return;
        }

        if (name.length < 2 || name.length > 20) {
            setError('길드 이름은 2자 이상 20자 이하여야 합니다.');
            return;
        }

        // Check if user already has a guild
        // Admin users can always create a guild, even if they're in one
        if (currentUserWithStatus?.guildId && !currentUserWithStatus?.isAdmin) {
            // User already has a guild (and is not admin), close modal to show guild home
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('[GuildCreateModal] Attempting to create guild:', { name: name.trim(), description: description.trim() || undefined });
            const result: any = await handlers.handleAction({
                type: 'CREATE_GUILD',
                payload: { name: name.trim(), description: description.trim() || undefined },
            });

            console.log('[GuildCreateModal] Received response:', {
                hasResult: !!result,
                hasError: !!result?.error,
                hasSuccess: !!result?.success,
                hasGuild: !!result?.guild,
                hasClientResponse: !!result?.clientResponse,
                hasClientResponseGuild: !!result?.clientResponse?.guild,
                result: result
            });

            // Server returns { success: true, guild: {...}, updatedUser: {...} } 
            // or { clientResponse: { guild: {...}, updatedUser: {...} } }
            const guild = result?.guild || result?.clientResponse?.guild;

            if (result?.error) {
                console.warn('[GuildCreateModal] Error received:', result.error);
                // If error is about already being in a guild, close modal to show guild home
                if (result.error.includes('이미 길드에 가입되어 있습니다') || 
                    result.error.includes('already in guild')) {
                    onClose();
                    return;
                }
                setError(result.error);
            } else if (guild) {
                console.log('[GuildCreateModal] Guild created successfully:', guild);
                setLoading(false);
                onSuccess(guild);
            } else {
                console.error('[GuildCreateModal] Unexpected response format:', {
                    result,
                    hasResult: !!result,
                    hasSuccess: !!result?.success,
                    hasGuild: !!result?.guild,
                    hasClientResponse: !!result?.clientResponse,
                    hasClientResponseGuild: !!result?.clientResponse?.guild,
                    clientResponseKeys: result?.clientResponse ? Object.keys(result.clientResponse) : [],
                    resultKeys: result ? Object.keys(result) : []
                });
                setError('길드 생성 응답 형식이 올바르지 않습니다.');
            }
        } catch (err: any) {
            console.error('[GuildCreateModal] Exception occurred:', err);
            setError(err.message || '길드 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DraggableWindow
            title="길드 창설"
            windowId="guild-create"
            onClose={onClose}
            initialWidth={500}
            isTopmost
        >
            <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        길드 이름 *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="길드 이름을 입력하세요"
                        maxLength={20}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">2-20자</p>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        길드 설명
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="길드 설명을 입력하세요 (선택사항)"
                        maxLength={200}
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">{description.length}/200자</p>
                </div>

                <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-yellow-200">
                            길드 생성 비용:
                        </p>
                        <div className="flex items-center gap-1">
                            <img src={resourceIcons.diamonds} alt="다이아" className="w-5 h-5 object-contain" />
                            <span className="font-bold text-yellow-200">100</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-yellow-300">
                            현재 보유:
                        </p>
                        <div className="flex items-center gap-1">
                            <img src={resourceIcons.diamonds} alt="다이아" className="w-4 h-4 object-contain" />
                            <span className="text-xs text-yellow-300 font-semibold">
                                {currentUserWithStatus?.diamonds?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        colorScheme="gray"
                        className="flex-1"
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleCreate}
                        colorScheme="green"
                        className="flex-1"
                        disabled={loading || !name.trim()}
                    >
                        {loading ? '생성 중...' : '길드 생성'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildCreateModal;

