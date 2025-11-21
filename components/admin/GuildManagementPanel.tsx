import React, { useState } from 'react';
import type { Guild as GuildType, ServerAction } from '../../types/index.js';
import BackButton from '../BackButton.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import ToggleSwitch from '../ui/ToggleSwitch.js';

interface AdminGuildManagementPanelProps {
    guild: GuildType;
    onBack: () => void;
}

const AdminGuildManagementPanel: React.FC<AdminGuildManagementPanelProps> = ({ guild, onBack }) => {
    const { handlers } = useAppContext();
    const [editedGuild, setEditedGuild] = useState<Partial<GuildType>>(guild);
    const [sanctionDuration, setSanctionDuration] = useState(24);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedGuild(prev => ({ ...prev, [name]: value }));
    };
    
    const handleToggleChange = (field: keyof GuildType, value: boolean) => {
        setEditedGuild(prev => ({ ...prev, [field]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedGuild(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const handleSave = () => {
        handlers.handleAction({
            type: 'ADMIN_UPDATE_GUILD_DETAILS',
            payload: { guildId: guild.id, updatedDetails: editedGuild }
        });
        onBack();
    };
    
    const handleSanction = () => {
        handlers.handleAction({
            type: 'ADMIN_APPLY_GUILD_SANCTION',
            payload: { guildId: guild.id, sanctionType: 'recruitment', durationHours: sanctionDuration }
        });
    };

    const handleLiftSanction = () => {
        handlers.handleAction({
            type: 'ADMIN_APPLY_GUILD_SANCTION',
            payload: { guildId: guild.id, sanctionType: 'recruitment', durationHours: -1 }
        });
    };

    const handleDelete = () => {
        if (window.confirm(`정말로 [${guild.name}] 길드를 삭제하시겠습니까? 모든 길드원이 추방되며 되돌릴 수 없습니다.`)) {
            handlers.handleAction({ type: 'ADMIN_DELETE_GUILD', payload: { guildId: guild.id } });
            onBack();
        }
    };
    
    const isSanctioned = guild.recruitmentBanUntil && guild.recruitmentBanUntil > Date.now();

    return (
        <div className="bg-primary text-primary p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">길드 관리: <span className="text-highlight">{guild.name}</span></h1>
                <BackButton onClick={onBack} />
            </header>
            <div className="bg-panel p-6 rounded-lg shadow-lg space-y-4 text-on-panel max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary">길드 레벨</label>
                        <input type="number" name="level" value={editedGuild.level || 1} onChange={handleNumberChange} className="w-full bg-secondary p-2 rounded-md border border-color" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary">길드 경험치</label>
                        <input type="number" name="xp" value={editedGuild.xp || 0} onChange={handleNumberChange} className="w-full bg-secondary p-2 rounded-md border border-color" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary">연구 포인트</label>
                        <input type="number" name="researchPoints" value={editedGuild.researchPoints || 0} onChange={handleNumberChange} className="w-full bg-secondary p-2 rounded-md border border-color" />
                    </div>
                    <div className="flex items-center justify-between bg-tertiary/50 p-2 rounded-md">
                        <label className="text-sm font-medium">공개 설정</label>
                        <ToggleSwitch checked={!!editedGuild.isPublic} onChange={(val) => handleToggleChange('isPublic', val)} />
                    </div>
                </div>
                 <div className="pt-4 border-t border-color">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">위험 구역</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                            <div>
                                <h4 className="font-semibold">길드원 모집 제재</h4>
                                {isSanctioned ? <p className="text-xs text-yellow-400">제재 중 (~{new Date(guild.recruitmentBanUntil!).toLocaleString()})</p> : <p className="text-xs text-tertiary">현재 제재 없음</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={sanctionDuration} onChange={e => setSanctionDuration(parseInt(e.target.value))} className="bg-tertiary border border-color rounded-md p-1 text-xs">
                                    <option value={1}>1시간</option>
                                    <option value={6}>6시간</option>
                                    <option value={24}>1일</option>
                                    <option value={72}>3일</option>
                                </select>
                                <Button onClick={handleSanction} colorScheme="orange" className="!text-xs !py-1">적용</Button>
                                {isSanctioned && <Button onClick={handleLiftSanction} colorScheme="yellow" className="!text-xs !py-1">해제</Button>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                            <h4 className="font-semibold">길드 삭제</h4>
                            <Button onClick={handleDelete} colorScheme="red">삭제</Button>
                        </div>
                    </div>
                 </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <Button onClick={onBack} colorScheme="gray">취소</Button>
                <Button onClick={handleSave} colorScheme="green">저장</Button>
            </div>
        </div>
    );
};

export default AdminGuildManagementPanel;