import React, { useState, useMemo } from 'react';
import { Guild as GuildType, ServerAction, GuildMember, GuildMemberRole } from '../../types/index.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import ToggleSwitch from '../ui/ToggleSwitch.js';

interface GuildManagementPanelProps {
    guild: GuildType;
}

const GuildManagementPanel: React.FC<GuildManagementPanelProps> = ({ guild }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    const [announcement, setAnnouncement] = useState(guild.announcement || '');
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);

    const [description, setDescription] = useState(guild.description);
    const [isPublic, setIsPublic] = useState(guild.isPublic);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const applicantsWithUserData = useMemo(() => {
        // This would ideally fetch user data for applicants, but for now we'll assume we don't have it
        // and just show IDs or a placeholder.
        return guild.applicants?.map(app => ({ 
            id: app.userId, 
            nickname: `User-${app.userId.slice(0, 4)}`,
            appliedAt: app.appliedAt
        })) || [];
    }, [guild.applicants]);

    const handleSaveAnnouncement = () => {
        handlers.handleAction({ type: 'GUILD_UPDATE_ANNOUNCEMENT', payload: { guildId: guild.id, announcement } });
        setIsEditingAnnouncement(false);
    };

    const handleSaveProfile = () => {
        handlers.handleAction({ type: 'GUILD_UPDATE_PROFILE', payload: { guildId: guild.id, description, isPublic } });
        setIsEditingProfile(false);
    };

    const handleApplicant = (applicantId: string, accept: boolean) => {
        const type = accept ? 'GUILD_ACCEPT_APPLICANT' : 'GUILD_REJECT_APPLICANT';
        handlers.handleAction({ type, payload: { guildId: guild.id, userId: applicantId, applicantId } });
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {isEditingProfile && (
                <DraggableWindow title="길드 정보 수정" onClose={() => setIsEditingProfile(false)} windowId={`guild-profile-edit-${guild.id}`}>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium">길드 소개</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={100} className="w-full bg-secondary p-2 rounded-md border border-color h-24" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">공개 설정</label>
                            <ToggleSwitch checked={!!isPublic} onChange={setIsPublic} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-color">
                            <Button onClick={() => setIsEditingProfile(false)} colorScheme="gray">취소</Button>
                            <Button onClick={handleSaveProfile} colorScheme="green">저장</Button>
                        </div>
                    </div>
                </DraggableWindow>
            )}

            <div className="bg-secondary p-4 rounded-lg">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl text-highlight">길드 공지</h3>
                    <Button onClick={() => setIsEditingAnnouncement(!isEditingAnnouncement)} className="!text-xs !py-1">
                        {isEditingAnnouncement ? '취소' : '편집'}
                    </Button>
                </div>
                {isEditingAnnouncement ? (
                    <div className="mt-2">
                        <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} maxLength={150} className="w-full h-24 p-2 bg-tertiary rounded-md border border-color" />
                        <Button onClick={handleSaveAnnouncement} className="w-full mt-2">저장</Button>
                    </div>
                ) : (
                    <p className="text-sm text-tertiary mt-2 whitespace-pre-wrap">{guild.announcement || '등록된 공지사항이 없습니다.'}</p>
                )}
            </div>

            <div className="bg-secondary p-4 rounded-lg flex-1 min-h-0 flex flex-col">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-highlight">가입 신청 관리</h3>
                    <Button onClick={() => setIsEditingProfile(true)} className="!text-xs !py-1">정보 수정</Button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {applicantsWithUserData.length > 0 ? (
                        <ul className="space-y-2">
                            {applicantsWithUserData.map(applicant => (
                                <li key={applicant.id} className="flex items-center justify-between bg-tertiary p-2 rounded-md">
                                    <span>{applicant.nickname}</span>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleApplicant(applicant.id, true)} colorScheme="green" className="!text-xs !py-1">승인</Button>
                                        <Button onClick={() => handleApplicant(applicant.id, false)} colorScheme="red" className="!text-xs !py-1">거절</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-tertiary text-center h-full flex items-center justify-center">가입 신청이 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
export default GuildManagementPanel;