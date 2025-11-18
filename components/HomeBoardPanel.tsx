import React, { useState } from 'react';
import { HomeBoardPost } from '../types/entities.js';
import DraggableWindow from './DraggableWindow.js';

interface HomeBoardPanelProps {
    posts: HomeBoardPost[];
    isAdmin?: boolean;
    onAction?: (action: any) => void;
}

const HomeBoardPanel: React.FC<HomeBoardPanelProps> = ({ posts, isAdmin, onAction }) => {
    const [selectedPost, setSelectedPost] = useState<HomeBoardPost | null>(null);

    // 고정글을 먼저, 그 다음 최신순으로 정렬
    const sortedPosts = [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const handlePostClick = (post: HomeBoardPost) => {
        setSelectedPost(post);
    };

    return (
        <>
            <div className="bg-panel border border-color text-on-panel rounded-lg min-h-0 flex flex-col h-full">
                <div className="flex-shrink-0 border-b border-color p-2">
                    <h3 className="text-sm font-bold text-center">공지사항</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {sortedPosts.length === 0 ? (
                        <div className="text-center text-tertiary text-xs py-4">
                            공지사항이 없습니다.
                        </div>
                    ) : (
                        sortedPosts.map(post => (
                            <div 
                                key={post.id} 
                                className={`bg-secondary/50 rounded-md p-2 cursor-pointer hover:bg-secondary transition-colors ${post.isPinned ? 'border-l-4 border-yellow-500' : ''}`}
                                onClick={() => handlePostClick(post)}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        {post.isPinned && (
                                            <span className="text-yellow-500 text-xs font-bold flex-shrink-0">📌</span>
                                        )}
                                        <h4 className="text-xs font-semibold text-primary truncate">
                                            {post.title}
                                        </h4>
                                    </div>
                                    <div className="text-[9px] text-tertiary flex-shrink-0">
                                        {formatDate(post.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedPost && (
                <DraggableWindow 
                    title={selectedPost.title} 
                    onClose={() => setSelectedPost(null)} 
                    windowId={`home-board-post-${selectedPost.id}`}
                    initialWidth={600}
                    initialHeight={500}
                    isTopmost={true}
                >
                    <div className="p-4 text-on-panel">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-color">
                            <div className="flex items-center gap-2">
                                {selectedPost.isPinned && (
                                    <span className="text-yellow-500 text-sm font-bold">📌</span>
                                )}
                                <span className="text-xs text-tertiary">
                                    {formatDate(selectedPost.createdAt)}
                                    {selectedPost.updatedAt !== selectedPost.createdAt && (
                                        <span className="ml-2">(수정됨: {formatDate(selectedPost.updatedAt)})</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="text-sm text-primary whitespace-pre-wrap leading-relaxed">
                            {selectedPost.content}
                        </div>
                    </div>
                </DraggableWindow>
            )}
        </>
    );
};

export default HomeBoardPanel;

