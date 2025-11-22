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
        <div className="flex flex-col h-full gap-6 bg-gradient-to-br from-stone-900/95 via-neutral-800/90 to-stone-900/95 rounded-xl border-2 border-stone-600/60 shadow-2xl backdrop-blur-md p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 via-gray-500/5 to-stone-500/10 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full">
                {isEditingProfile && (
                    <DraggableWindow title="길드 정보 수정" onClose={() => setIsEditingProfile(false)} windowId={`guild-profile-edit-${guild.id}`}>
                        <div className="space-y-4 p-2">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-highlight">길드 소개</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={100} className="w-full bg-gradient-to-br from-stone-800/90 to-neutral-700/90 p-3 rounded-lg border-2 border-stone-600/50 h-24 text-primary focus:border-cyan-500/60 focus:outline-none transition-all shadow-inner backdrop-blur-sm" />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-stone-800/60 to-neutral-700/60 rounded-lg border border-stone-600/40">
                                <label className="text-sm font-semibold text-highlight">공개 설정</label>
                                <ToggleSwitch checked={!!isPublic} onChange={setIsPublic} />
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-600/50">
                                <Button onClick={() => setIsEditingProfile(false)} className="border-2 border-stone-500/50 bg-gradient-to-r from-stone-700/90 to-neutral-700/90 text-white shadow-lg hover:shadow-xl transition-all">취소</Button>
                                <Button onClick={handleSaveProfile} className="border-2 border-green-500/50 bg-gradient-to-r from-green-600/90 to-emerald-600/90 text-white shadow-lg hover:shadow-xl transition-all">저장</Button>
                            </div>
                        </div>
                    </DraggableWindow>
                )}

                <div className="bg-gradient-to-br from-stone-800/95 via-neutral-700/90 to-stone-800/95 p-7 rounded-xl border-2 border-stone-600/50 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 via-gray-500/5 to-stone-500/10 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <h3 className="font-bold text-2xl text-highlight drop-shadow-lg flex items-center gap-2">
                                <span className="text-2xl">📢</span>
                                <span>길드 공지</span>
                            </h3>
                            <Button 
                                onClick={() => setIsEditingAnnouncement(!isEditingAnnouncement)} 
                                className="!text-sm !py-2.5 !px-5 border-2 border-cyan-500/60 bg-gradient-to-r from-cyan-600/95 via-blue-600/95 to-indigo-600/95 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                            >
                                {isEditingAnnouncement ? '취소' : '편집'}
                            </Button>
                        </div>
                        {isEditingAnnouncement ? (
                            <div className="mt-5">
                                <textarea 
                                    value={announcement} 
                                    onChange={e => setAnnouncement(e.target.value)} 
                                    maxLength={150} 
                                    className="w-full h-36 p-4 bg-gradient-to-br from-stone-900/95 to-neutral-800/95 rounded-xl border-2 border-stone-600/60 text-primary focus:border-cyan-500/70 focus:outline-none transition-all shadow-inner backdrop-blur-md text-sm leading-relaxed" 
                                />
                                <Button 
                                    onClick={handleSaveAnnouncement} 
                                    className="w-full mt-4 border-2 border-green-500/60 bg-gradient-to-r from-green-600/95 via-emerald-600/95 to-teal-600/95 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-semibold py-3"
                                >
                                    저장
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-5 p-5 bg-gradient-to-br from-stone-900/85 to-neutral-800/85 rounded-xl border-2 border-stone-600/50 min-h-[120px] shadow-inner backdrop-blur-sm">
                                <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed drop-shadow-md">{guild.announcement || <span className="text-tertiary italic">등록된 공지사항이 없습니다.</span>}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-stone-800/95 via-neutral-700/90 to-stone-800/95 p-7 rounded-xl border-2 border-stone-600/50 shadow-2xl backdrop-blur-md flex-1 min-h-0 flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 via-gray-500/5 to-stone-500/10 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-5 flex-shrink-0">
                            <h3 className="font-bold text-2xl text-highlight drop-shadow-lg flex items-center gap-2">
                                <span className="text-2xl">📝</span>
                                <span>가입 신청 관리</span>
                            </h3>
                            <Button 
                                onClick={() => setIsEditingProfile(true)} 
                                className="!text-sm !py-2.5 !px-5 border-2 border-purple-500/60 bg-gradient-to-r from-purple-600/95 via-indigo-600/95 to-violet-600/95 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                            >
                                정보 수정
                            </Button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-3 min-h-0">
                            {applicantsWithUserData.length > 0 ? (
                                <ul className="space-y-4">
                                    {applicantsWithUserData.map(applicant => (
                                        <li 
                                            key={applicant.id} 
                                            className="flex items-center justify-between bg-gradient-to-r from-stone-800/95 via-neutral-700/90 to-stone-800/95 p-5 rounded-xl border-2 border-stone-600/50 shadow-xl backdrop-blur-md transition-all duration-200 hover:border-stone-500/70 hover:shadow-2xl hover:-translate-y-0.5 hover:scale-[1.01]"
                                        >
                                            <span className="font-bold text-lg text-primary drop-shadow-lg">{applicant.nickname}</span>
                                            <div className="flex gap-3">
                                                <Button 
                                                    onClick={() => handleApplicant(applicant.id, true)} 
                                                    className="!text-xs !py-2.5 !px-5 border-2 border-green-500/60 bg-gradient-to-r from-green-600/95 via-emerald-600/95 to-teal-600/95 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                                                >
                                                    승인
                                                </Button>
                                                <Button 
                                                    onClick={() => handleApplicant(applicant.id, false)} 
                                                    className="!text-xs !py-2.5 !px-5 border-2 border-red-500/60 bg-gradient-to-r from-red-600/95 via-rose-600/95 to-pink-600/95 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                                                >
                                                    거절
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-sm text-tertiary text-center bg-gradient-to-br from-stone-900/70 to-neutral-800/70 p-8 rounded-xl border-2 border-stone-600/40 backdrop-blur-md shadow-inner">
                                        가입 신청이 없습니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default GuildManagementPanel;