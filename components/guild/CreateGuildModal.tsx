

import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { containsProfanity } from '../../profanity.js';
import { GUILD_CREATION_COST } from '../../constants/index.js';
import ToggleSwitch from '../ui/ToggleSwitch.js';

interface CreateGuildModalProps {
    onClose: () => void;
}

const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ onClose }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const handleCreate = () => {
        if (name.trim().length < 2 || name.trim().length > 12) {
            alert('길드 이름은 2~12자 사이여야 합니다.');
            return;
        }
        if (containsProfanity(name) || containsProfanity(description)) {
            alert('길드 이름이나 설명에 부적절한 단어가 포함되어 있습니다.');
            return;
        }
        if (currentUserWithStatus && currentUserWithStatus.diamonds < GUILD_CREATION_COST) {
            alert('길드 창설에 필요한 다이아가 부족합니다.');
            return;
        }
        if (window.confirm(`다이아 ${GUILD_CREATION_COST}개를 사용하여 길드를 창설하시겠습니까?`)) {
            handlers.handleAction({ type: 'CREATE_GUILD', payload: { name, description, isPublic } });
            onClose();
        }
    };

    return (
        <DraggableWindow title="길드 창설" onClose={onClose} windowId="create-guild">
            <div className="space-y-4">
                <input type="text" placeholder="길드 이름 (2-12자)" value={name} onChange={e => setName(e.target.value)} className="w-full bg-secondary p-2 rounded-md border border-color" maxLength={12} />
                <textarea placeholder="길드 소개 (100자 이내)" value={description} onChange={e => setDescription(e.target.value)} maxLength={100} className="w-full bg-secondary p-2 rounded-md border border-color h-24" />
                <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                    <label className="font-semibold text-text-secondary">공개 설정</label>
                    <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
                </div>
                <p className="text-xs text-tertiary">{isPublic ? '누구나 자유롭게 가입할 수 있습니다.' : '길드장의 승인 후 가입할 수 있습니다.'}</p>
                <div className="text-center text-yellow-300">창설 비용: 💎{GUILD_CREATION_COST}</div>
                <div className="flex justify-end gap-2 pt-2 border-t border-color">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleCreate} colorScheme="green">창설</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default CreateGuildModal;