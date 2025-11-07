import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import Button from './Button.js';
import ClassNavigationPanel from './singleplayer/ClassNavigationPanel.js';
import StageGrid from './singleplayer/StageGrid.js';
import TrainingQuestPanel from './singleplayer/TrainingQuestPanel.js';
import { SinglePlayerLevel } from '../types.js';

const SinglePlayerLobby: React.FC = () => {
    const { currentUser, currentUserWithStatus } = useAppContext();
    const [selectedClass, setSelectedClass] = useState<SinglePlayerLevel>(SinglePlayerLevel.입문);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const onBackToProfile = () => window.location.hash = '#/profile';

    if (!currentUser || !currentUserWithStatus) {
        return null;
    }

    return (
        <div className="bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 w-full mx-auto flex flex-col h-[calc(100vh-5rem)] relative">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button 
                    onClick={onBackToProfile} 
                    className="transition-transform active:scale-90 filter hover:drop-shadow-lg p-0 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-800"
                    aria-label="뒤로가기"
                >
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </button>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-100">싱글플레이</h1>
                {/* 모바일: 사이드 메뉴 버튼, 데스크톱: 스페이서 */}
                {isMobile ? (
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="transition-transform active:scale-90 filter hover:drop-shadow-lg p-0 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-800"
                        aria-label="메뉴 열기"
                    >
                        <span className="relative font-bold text-lg text-gray-100">{'<'}</span>
                    </button>
                ) : (
                    <div className="w-10"></div>
                )}
            </header>

            {/* Main Content */}
            {isMobile ? (
                // 모바일: 단계 선택 + 스테이지 패널만 표시
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    {/* 단계 선택 패널 */}
                    <div className="flex-shrink-0">
                        <ClassNavigationPanel 
                            selectedClass={selectedClass}
                            onClassSelect={setSelectedClass}
                        />
                    </div>

                    {/* 스테이지 패널 */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <StageGrid 
                            selectedClass={selectedClass}
                            currentUser={currentUserWithStatus}
                        />
                    </div>
                </div>
            ) : (
                // 데스크톱: 기존 레이아웃 (3개 패널 모두 표시)
                <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 min-h-0">
                    {/* Left: 큰 이미지 클래스 선택 슬라이더 */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                        <ClassNavigationPanel 
                            selectedClass={selectedClass}
                            onClassSelect={setSelectedClass}
                        />
                    </div>

                    {/* Center: Stage Grid - 더 넓게 */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                        <StageGrid 
                            selectedClass={selectedClass}
                            currentUser={currentUserWithStatus}
                        />
                    </div>

                    {/* Right: Training Quest Panel */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                        <TrainingQuestPanel 
                            currentUser={currentUserWithStatus}
                        />
                    </div>
                </div>
            )}

            {/* 모바일 사이드 메뉴: 수련 과제 패널 */}
            {isMobile && (
                <>
                    <div className={`fixed top-0 right-0 h-full w-[320px] bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-100">수련 과제</h3>
                            <button 
                                onClick={() => setIsMobileSidebarOpen(false)} 
                                className="text-2xl font-bold text-gray-300 hover:text-white"
                                aria-label="메뉴 닫기"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-4">
                            <TrainingQuestPanel 
                                currentUser={currentUserWithStatus}
                            />
                        </div>
                    </div>
                    {/* 오버레이 */}
                    {isMobileSidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/60 z-40" 
                            onClick={() => setIsMobileSidebarOpen(false)}
                        ></div>
                    )}
                </>
            )}
        </div>
    );
};

export default SinglePlayerLobby;
