
import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface DraggableWindowProps {
    title: string;
    windowId: string;
    onClose?: () => void;
    children: ReactNode;
    initialWidth?: number;
    modal?: boolean;
    closeOnOutsideClick?: boolean;
    isTopmost?: boolean;
    headerContent?: ReactNode;
    zIndex?: number;
}

const SETTINGS_KEY = 'draggableWindowSettings';

const DraggableWindow: React.FC<DraggableWindowProps> = ({ title, windowId, onClose, children, initialWidth = 500, modal = true, closeOnOutsideClick = true, isTopmost = true, headerContent, zIndex = 50 }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const initialWindowPos = useRef({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const positionRef = useRef(position);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [rememberPosition, setRememberPosition] = useState(true);
    
    const [scale, setScale] = useState(1);
    
    const windowRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (onClose && closeOnOutsideClick && isTopmost && windowRef.current && !windowRef.current.contains(event.target as Node)) {
            onClose();
        }
    }, [onClose, closeOnOutsideClick, isTopmost]);

    useEffect(() => {
        if (modal && onClose) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [modal, onClose, handleClickOutside]);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkIsMobile);
        checkIsMobile();
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (isMobile) {
                setScale(1);
                return;
            }
            const windowWidth = window.innerWidth;
            const scale = Math.min(1, windowWidth / (initialWidth + 100)); // Adding some padding
            setScale(scale);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial calculation

        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile, initialWidth]);


    useEffect(() => {
        positionRef.current = position;
    }, [position]);

     useEffect(() => {
        try {
            const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            const shouldRemember = settings.rememberPosition ?? true;
            setRememberPosition(shouldRemember);

            if (shouldRemember) {
                const savedPositions = JSON.parse(localStorage.getItem('draggableWindowPositions') || '{}');
                if (savedPositions[windowId]) {
                    setPosition(savedPositions[windowId]);
                } else {
                    setPosition({ x: 0, y: 0 });
                }
            } else {
                setPosition({ x: 0, y: 0 });
            }
        } catch (e) {
            console.error("Failed to load window settings from localStorage", e);
            setPosition({ x: 0, y: 0 });
        }
        setIsInitialized(true);
    }, [windowId]);


    const handleDragStart = useCallback((clientX: number, clientY: number) => {
        setIsDragging(true);
        dragStartPos.current = { x: clientX, y: clientY };
        initialWindowPos.current = positionRef.current;
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isTopmost || e.button !== 0) return;
        handleDragStart(e.clientX, e.clientY);
    }, [handleDragStart, isTopmost]);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!isTopmost) return;
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY);
    }, [handleDragStart, isTopmost]);
    
    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging || !windowRef.current) return;

        const dx = clientX - dragStartPos.current.x;
        const dy = clientY - dragStartPos.current.y;

        let newX = initialWindowPos.current.x + dx;
        let newY = initialWindowPos.current.y + dy;
        
        const { offsetWidth, offsetHeight } = windowRef.current;
        const { innerWidth, innerHeight } = window;

        const halfW = offsetWidth / 2;
        const halfH = offsetHeight / 2;
        
        // Horizontal constraints (keep window fully inside)
        const minX = -(innerWidth / 2) + halfW;
        const maxX = (innerWidth / 2) - halfW;
        
        // Vertical constraints (keep header visible)
        const headerHeight = 50; // Approximate header height for safety margin
        let minY, maxY;

        if (offsetHeight <= innerHeight) {
            // Window is shorter than or same height as viewport
            // Keep it fully inside the viewport
            minY = -(innerHeight / 2) + halfH;
            maxY = (innerHeight / 2) - halfH;
        } else {
            // Window is taller than viewport
            // Allow vertical scrolling, but always keep the header visible
            minY = -(innerHeight / 2) - halfH + headerHeight; // Allow top to go off-screen, but keep header visible
            maxY = (innerHeight / 2) + halfH - headerHeight; // Allow bottom to go off-screen, but keep header visible
        }

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        handleDragMove(e.clientX, e.clientY);
    }, [handleDragMove]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (isDragging) {
             const touch = e.touches[0];
             handleDragMove(touch.clientX, touch.clientY);
        }
    }, [isDragging, handleDragMove]);


    const handleDragEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (rememberPosition) {
                try {
                    const savedPositions = JSON.parse(localStorage.getItem('draggableWindowPositions') || '{}');
                    savedPositions[windowId] = positionRef.current;
                    localStorage.setItem('draggableWindowPositions', JSON.stringify(savedPositions));
                } catch (e) {
                    console.error("Failed to save window position to localStorage", e);
                }
            }
        }
    }, [isDragging, windowId, rememberPosition]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);
    
    const handleRememberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setRememberPosition(isChecked);
        try {
            const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            settings.rememberPosition = isChecked;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            if (!isChecked) {
                // If unchecked, reset position immediately and clear saved data
                setPosition({ x: 0, y: 0 });
                const savedPositions = JSON.parse(localStorage.getItem('draggableWindowPositions') || '{}');
                delete savedPositions[windowId];
                localStorage.setItem('draggableWindowPositions', JSON.stringify(savedPositions));
            }
        } catch (error) {
            console.error("Failed to save remember position setting", error);
        }
    };


    const transformStyle = `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${isDragging ? scale * 1.02 : scale})`;

    if (!isInitialized) return null;
    
    const headerCursor = isTopmost ? 'cursor-move' : '';
    
    return (
        <>
            {modal && (
                 <div className={`fixed inset-0 z-40 bg-black/50 ${!isTopmost ? 'backdrop-blur-sm' : ''}`} />
            )}
            <div
                ref={windowRef}
                className={`fixed top-1/2 left-1/2 bg-primary rounded-xl shadow-2xl border border-color flex flex-col text-on-panel`}
                style={{
                    width: isMobile ? '90vw' : `${initialWidth}px`,
                    transform: transformStyle,
                    transformOrigin: 'center',
                    boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    maxHeight: '90vh',
                    zIndex: zIndex,
                }}
            >
                {!isTopmost && (
                    <div className="absolute inset-0 bg-black/30 z-20 rounded-xl cursor-not-allowed" />
                )}
                <div
                    className={`bg-secondary p-3 rounded-t-xl flex justify-between items-center ${headerCursor} touch-none`}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    <h2 className="text-lg font-bold text-secondary select-none">{title}</h2>
                    <div className="flex items-center gap-2">
                        {headerContent}
                        {onClose && (
                            <button onClick={isTopmost ? onClose : undefined} className="w-10 h-10 flex items-center justify-center rounded-full bg-tertiary hover:bg-danger transition-colors z-30">
                                <span className="text-white font-bold text-lg">✕</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="p-3 md:p-6 flex-grow">
                    {children}
                </div>
                <div className="flex-shrink-0 p-2 border-t border-color flex justify-end items-center bg-secondary rounded-b-xl">
                    <label className="flex items-center text-xs text-tertiary gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={rememberPosition}
                            onChange={handleRememberChange}
                            className="w-4 h-4 bg-tertiary border-color rounded focus:ring-accent"
                        />
                        창 위치 기억하기
                    </label>
                </div>
            </div>
        </>
    );
};

export default DraggableWindow;
