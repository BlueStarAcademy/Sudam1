import React from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface GuildWarPanelProps {
    guildId: string;
}

const GuildWarPanel: React.FC<GuildWarPanelProps> = ({ guildId }) => {
    const { handlers } = useAppContext();

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">길드전</h2>
            <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 mb-4">길드전 기능은 곧 추가될 예정입니다.</p>
                <Button
                    onClick={() => {
                        alert('길드전 기능은 곧 추가될 예정입니다.');
                    }}
                    colorScheme="blue"
                    className="!py-2 !px-4"
                    disabled
                >
                    길드전 시작
                </Button>
            </div>
        </div>
    );
};

export default GuildWarPanel;

