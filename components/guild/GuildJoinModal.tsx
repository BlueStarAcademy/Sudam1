import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { Guild } from '../../types/entities.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';

interface GuildJoinModalProps {
    onClose: () => void;
    onSuccess: (guild: Guild) => void;
}

const GuildJoinModal: React.FC<GuildJoinModalProps> = ({ onClose, onSuccess }) => {
    const { handlers } = useAppContext();
    const [guildId, setGuildId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // TODO: Implement guild search API
    const handleSearch = async () => {
        // Placeholder - should implement GET_GUILDS or similar action
        setError('길드 검색 기능은 아직 구현되지 않았습니다. 길드 ID를 직접 입력하세요.');
    };

    const handleJoin = async () => {
        if (!guildId.trim()) {
            setError('길드 ID를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // If guildName is provided, we need to find the guild first
            // For now, assume guildId is provided
            const result: any = await handlers.handleAction({
                type: 'JOIN_GUILD',
                payload: { guildId: guildId.trim() },
            });

            if (result?.error) {
                setError(result.error);
            } else if (result?.clientResponse?.guild) {
                onSuccess(result.clientResponse.guild);
            } else if (result?.error) {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message || '길드 가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DraggableWindow
            title="길드 가입"
            windowId="guild-join"
            onClose={onClose}
            initialWidth={500}
            isTopmost
        >
            <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        길드 ID
                    </label>
                    <input
                        type="text"
                        value={guildId}
                        onChange={(e) => setGuildId(e.target.value)}
                        placeholder="길드 ID를 입력하세요"
                        className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        길드 이름으로 검색
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="길드 이름을 입력하세요"
                            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                        <Button
                            onClick={handleSearch}
                            colorScheme="blue"
                            className="!py-2 !px-4"
                        >
                            검색
                        </Button>
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
                        onClick={handleJoin}
                        colorScheme="green"
                        className="flex-1"
                        disabled={loading || !guildId.trim()}
                    >
                        {loading ? '가입 중...' : '길드 가입'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildJoinModal;

