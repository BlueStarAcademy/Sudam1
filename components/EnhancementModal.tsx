import React from 'react';
import { InventoryItem, UserWithStatus, ServerAction, EnhancementResult } from '../../types';
import Button from './Button';
import Modal from '../Modal';

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
        <Modal isOpen={true} onClose={onClose} title="강화" isTopmost={isTopmost}>
            <div className="p-4">
                <p>강화 모달: {item.name}</p>
                <Button onClick={onClose}>닫기</Button>
            </div>
        </Modal>
    );
};

export default EnhancementModal;
