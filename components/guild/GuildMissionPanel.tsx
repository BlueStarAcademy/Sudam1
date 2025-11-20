import React from 'react';
import { GuildMission } from '../../types/entities.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface GuildMissionPanelProps {
    guildId: string;
    missions: GuildMission[];
    onMissionsUpdate: (missions: GuildMission[]) => void;
}

const GuildMissionPanel: React.FC<GuildMissionPanelProps> = ({ guildId, missions, onMissionsUpdate }) => {
    const { handlers, currentUserWithStatus } = useAppContext();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">길드 미션</h2>
                {currentUserWithStatus?.guildId && (
                    <Button
                        onClick={async () => {
                            // TODO: Implement mission creation UI
                            alert('미션 생성 기능은 곧 추가될 예정입니다.');
                        }}
                        colorScheme="green"
                        className="!py-2 !px-4"
                    >
                        미션 생성
                    </Button>
                )}
            </div>
            <div className="space-y-2">
                {missions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">진행 중인 미션이 없습니다.</p>
                ) : (
                    missions.map((mission) => (
                        <div key={mission.id} className="p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-white">{mission.missionType}</h3>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    mission.status === 'active' ? 'bg-green-600 text-white' :
                                    mission.status === 'completed' ? 'bg-blue-600 text-white' :
                                    'bg-gray-600 text-white'
                                }`}>
                                    {mission.status === 'active' && '진행중'}
                                    {mission.status === 'completed' && '완료'}
                                    {mission.status === 'expired' && '만료'}
                                </span>
                            </div>
                            {mission.target && (
                                <div className="text-sm text-gray-400">
                                    목표: {JSON.stringify(mission.target)}
                                </div>
                            )}
                            {mission.progress && (
                                <div className="text-sm text-gray-300 mt-2">
                                    진행도: {JSON.stringify(mission.progress)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GuildMissionPanel;

