import React from 'react';
import { LiveGameSession, User } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';

interface NoContestModalProps {
    session: LiveGameSession;
    currentUser: User;
    onConfirm: () => void;
}

const NoContestModal: React.FC<NoContestModalProps> = ({ session, currentUser, onConfirm }) => {
    
    const isInitiator = session.noContestInitiatorIds?.includes(currentUser.id);

    return (
        <DraggableWindow title="무효 대국" onClose={onConfirm} initialWidth={450} windowId="no-contest">
            <div className="text-white">
                <div className="bg-gray-900/50 p-4 rounded-lg mb-6 text-center">
                    <p className="text-lg">
                        10수 미만 대국에서 기권 또는 계가 요청이 있어<br/>
                        해당 대국은 무효 처리되었습니다.
                    </p>
                    {isInitiator && (
                        <p className="text-sm text-red-400 mt-3">
                            경고: 반복적으로 무효 대국을 만들 경우, 페널티가 적용될 수 있습니다.
                        </p>
                    )}
                </div>

                 <Button 
                    onClick={onConfirm}
                    className="w-full py-3"
                 >
                    확인
                 </Button>
            </div>
        </DraggableWindow>
    );
};

export default NoContestModal;