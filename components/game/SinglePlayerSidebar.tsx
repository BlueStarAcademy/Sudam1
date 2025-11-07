import React from 'react';
import { LiveGameSession, GameProps } from '../../types.js';
import ProverbPanel from './SinglePlayerInfoPanel.js';
import { GameInfoPanel, ChatPanel } from './Sidebar.js';
import Button from '../Button.js';

interface SinglePlayerSidebarProps {
    session: LiveGameSession;
    gameChat?: GameProps['gameChat'];
    onAction?: GameProps['onAction'];
    currentUser?: GameProps['currentUser'];
    onLeaveOrResign?: () => void;
    onClose?: () => void;
}

const SinglePlayerSidebar: React.FC<SinglePlayerSidebarProps> = ({ 
    session, 
    gameChat = [],
    onAction,
    currentUser,
    onLeaveOrResign,
    onClose 
}) => {
    return (
        <div className="flex flex-col h-full gap-1.5 bg-gray-900/80 rounded-lg p-2 border border-color">
            <div className="flex-shrink-0 space-y-2">
                <GameInfoPanel session={session} onClose={onClose} />
                <ProverbPanel />
            </div>
            <div className="flex-1 mt-2 min-h-0">
                <ChatPanel 
                    session={session}
                    isSpectator={false}
                    onAction={onAction || (() => {})}
                    waitingRoomChat={[]}
                    gameChat={gameChat}
                    onViewUser={() => {}}
                    onlineUsers={[]}
                    currentUser={currentUser}
                />
            </div>
            <div className="flex-shrink-0 pt-2">
                {onLeaveOrResign && (
                    <Button onClick={onLeaveOrResign} colorScheme="red" className="w-full">
                        나가기
                    </Button>
                )}
            </div>
        </div>
    );
};

export default SinglePlayerSidebar;

