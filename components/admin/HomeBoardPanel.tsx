import React, { useState } from 'react';
import { AdminProps, HomeBoardPost } from '../../types/index.js';
import Button from '../Button.js';

interface HomeBoardPanelProps extends AdminProps {
    homeBoardPosts: HomeBoardPost[];
}

const HomeBoardPanel: React.FC<HomeBoardPanelProps> = ({ currentUser, homeBoardPosts = [], onAction, onBack }) => {
    const [editingPost, setEditingPost] = useState<HomeBoardPost | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);

    const handleCreate = () => {
        setEditingPost(null);
        setIsCreating(true);
        setTitle('');
        setContent('');
        setIsPinned(false);
    };

    const handleEdit = (post: HomeBoardPost) => {
        setEditingPost(post);
        setIsCreating(false);
        setTitle(post.title);
        setContent(post.content);
        setIsPinned(post.isPinned);
    };

    const handleCancel = () => {
        setEditingPost(null);
        setIsCreating(false);
        setTitle('');
        setContent('');
        setIsPinned(false);
    };

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        if (isCreating) {
            onAction({
                type: 'ADMIN_CREATE_HOME_BOARD_POST',
                payload: { title: title.trim(), content: content.trim(), isPinned }
            });
        } else if (editingPost) {
            onAction({
                type: 'ADMIN_UPDATE_HOME_BOARD_POST',
                payload: { postId: editingPost.id, title: title.trim(), content: content.trim(), isPinned }
            });
        }

        handleCancel();
    };

    const handleDelete = (postId: string) => {
        if (window.confirm('이 게시글을 삭제하시겠습니까?')) {
            onAction({
                type: 'ADMIN_DELETE_HOME_BOARD_POST',
                payload: { postId }
            });
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 고정글을 먼저, 그 다음 최신순으로 정렬
    const sortedPosts = [...homeBoardPosts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

    return (
        <div className="bg-primary text-primary">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">홈 게시판 관리</h1>
                <button onClick={onBack} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5">
                    <img src="/images/button/back.png" alt="Back" className="w-10 h-10 sm:w-12 sm:h-12" />
                </button>
            </header>

            <div className="mb-6">
                <Button onClick={handleCreate} colorScheme="green" className="w-full sm:w-auto">
                    새 게시글 작성
                </Button>
            </div>

            {(isCreating || editingPost) && (
                <div className="bg-panel border border-color p-6 rounded-lg shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-on-panel">
                        {isCreating ? '새 게시글 작성' : '게시글 수정'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-on-panel mb-2">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-secondary border border-color text-primary rounded-md px-3 py-2 focus:ring-accent focus:border-accent"
                                placeholder="게시글 제목을 입력하세요"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-panel mb-2">내용</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-secondary border border-color text-primary rounded-md px-3 py-2 h-40 focus:ring-accent focus:border-accent resize-y"
                                placeholder="게시글 내용을 입력하세요"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isPinned"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="w-4 h-4 text-accent bg-secondary border-color rounded focus:ring-accent"
                            />
                            <label htmlFor="isPinned" className="ml-2 text-sm text-on-panel">
                                상단 고정
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSave} colorScheme="blue" className="flex-1">
                                저장
                            </Button>
                            <Button onClick={handleCancel} colorScheme="gray" className="flex-1">
                                취소
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-panel border border-color p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b border-color pb-2 text-on-panel">
                    게시글 목록 ({sortedPosts.length})
                </h2>
                <div className="space-y-4">
                    {sortedPosts.length === 0 ? (
                        <div className="text-center text-tertiary py-8">
                            게시글이 없습니다.
                        </div>
                    ) : (
                        sortedPosts.map(post => (
                            <div key={post.id} className={`bg-secondary/50 border border-color rounded-md p-4 ${post.isPinned ? 'border-l-4 border-yellow-500' : ''}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {post.isPinned && (
                                                <span className="text-yellow-500 font-bold">📌</span>
                                            )}
                                            <h3 className="text-lg font-semibold text-primary">{post.title}</h3>
                                        </div>
                                        <p className="text-sm text-tertiary mb-2 whitespace-pre-wrap">{post.content}</p>
                                        <div className="text-xs text-tertiary">
                                            작성일: {formatDate(post.createdAt)}
                                            {post.updatedAt !== post.createdAt && (
                                                <span className="ml-2">수정일: {formatDate(post.updatedAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button onClick={() => handleEdit(post)} colorScheme="blue" className="text-xs px-3 py-1">
                                            수정
                                        </Button>
                                        <Button onClick={() => handleDelete(post.id)} colorScheme="red" className="text-xs px-3 py-1">
                                            삭제
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomeBoardPanel;

