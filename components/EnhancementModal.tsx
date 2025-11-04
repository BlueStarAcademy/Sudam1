import React from 'react';
import { InventoryItem, UserWithStatus, ServerAction, EnhancementResult } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow';

interface EnhancementModalProps {
    item: InventoryItem;
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    enhancementOutcome: EnhancementResult | null;
    onOutcomeConfirm: () => void;
    isTopmost: boolean;
}

const EnhancementModal: React.FC<EnhancementModalProps> = ({ item, currentUser, onClose, onAction, enhancementOutcome, onOutcomeConfirm, isTopmost }) => {
    // Placeholder content for now
    return (
        <DraggableWindow title="강화" onClose={onClose} windowId="enhancement" isTopmost={isTopmost}>
            <div className="p-4">
                <p>강화 모달: {item.name}</p>
                <Button onClick={onClose}>닫기</Button>
            </div>
        </DraggableWindow>
    );
};

export default EnhancementModal;
