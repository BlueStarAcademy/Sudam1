import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LiveGameSession, User, Player, KomiBid, ServerAction, Point } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG } from '../assets.js';
import { DEFAULT_KOMI } from '../constants.js';

interface KomiBiddingPanelProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const MiniGoBoard: React.FC<{ session: LiveGameSession }> = ({ session }) => {
    const { baseStones_p1, baseStones_p2, settings: { boardSize } } = session;
    
    // For display purposes only, show p1 as black, p2 as white
    const displayStones = [
      ...(baseStones_p1 || []).map(p => ({ ...p, player: Player.Black })),
      ...(baseStones_p2 || []).map(p => ({ ...p, player: Player.White }))
    ];

    const boardSizePx = 250;
    const cell_size = boardSizePx / boardSize;
    const padding = cell_size / 2;
    const stone_radius = cell_size * 0.47;
    const specialImageSize = stone_radius * 2 * 0.7;
    const specialImageOffset = specialImageSize / 2;

    const toSvgCoords = (p: {x: number, y: number}) => ({
        cx: padding + p.x * cell_size,
        cy: padding + p.y * cell_size,
    });

    return (
        <svg viewBox={`0 0 ${boardSizePx} ${boardSizePx}`} className="w-full h-full bg-[#e0b484] rounded-md shadow-inner">
            {Array.from({ length: boardSize }).map((_, i) => (
                <g key={i}>
                    <line x1={padding + i * cell_size} y1={padding} x2={padding + i * cell_size} y2={boardSizePx - padding} stroke="#54432a" strokeWidth="1" />
                    <line x1={padding} y1={padding + i * cell_size} x2={boardSizePx - padding} y2={padding + i * cell_size} stroke="#54432a" strokeWidth="1" />
                </g>
            ))}
            {displayStones.map((stone, i) => {
                const { cx, cy } = toSvgCoords(stone);
                return (
                    <g key={`base-stone-${i}`}>
                        <circle cx={cx} cy={cy} r={stone_radius} fill={stone.player === Player.Black ? "#111827" : "#f5f2e8"} />
                        <image href={stone.player === Player.Black ? BLACK_BASE_STONE_IMG : WHITE_BASE_STONE_IMG} x={cx - specialImageOffset} y={cy - specialImageOffset} width={specialImageSize} height={specialImageSize} />
                    </g>
                );
            })}
        </svg>
    );
};

// Moved AdjustButton outside to prevent re-definition on every render
const AdjustButton: React.FC<{ amount: number; onAdjust: (amount: number) => void; disabled: boolean; }> = React.memo(({ amount, onAdjust, disabled }) => (
    <Button onClick={() => onAdjust(amount)} disabled={disabled} colorScheme="gray" className="w-full !py-1">
        {amount > 0 ? `+${amount}` : `${amount}`}
    </Button>
));


const KomiBiddingPanel: React.FC<KomiBiddingPanelProps> = (props) => {
    const { session, currentUser, onAction } = props;
    const { id: gameId, player1, player2, komiBids, komiBiddingDeadline, gameStatus, komiBiddingRound } = session;
    const [selectedColor, setSelectedColor] = useState<Player>(Player.Black);
    const [komiValue, setKomiValue] = useState<number>(0);
    const [timer, setTimer] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const opponent = currentUser.id === player1.id ? player2 : player1;
    const myBid = komiBids?.[currentUser.id];
    const opponentBid = opponent ? komiBids?.[opponent.id] : undefined;
    
    const handleBidSubmit = useCallback(() => {
        const { session: currentSession, onAction: currentOnAction, currentUser } = latestProps.current;
        const myCurrentBid = currentSession.komiBids?.[currentUser.id];
        if (myCurrentBid || isSubmitting) return;
        if (selectedColor === Player.None) return;

        setIsSubmitting(true);
        const bid: KomiBid = { color: selectedColor, komi: komiValue };
        currentOnAction({type: 'UPDATE_KOMI_BID', payload: { gameId: currentSession.id, bid }});
        setTimeout(() => setIsSubmitting(false), 5000);
    }, [isSubmitting, selectedColor, komiValue]);
    
     useEffect(() => {
        // Reset the form only when the bidding round changes.
        // This prevents the user's input from being wiped when the opponent submits their bid.
        setSelectedColor(Player.Black);
        setKomiValue(0);
    }, [komiBiddingRound]);

    useEffect(() => {
        if (myBid || !komiBiddingDeadline) {
            setTimer(myBid ? 0 : 30);
            return;
        }
        const intervalId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((komiBiddingDeadline - Date.now()) / 1000));
            setTimer(remaining);
            if (remaining <= 0) {
                // Auto-submit on timeout is handled server-side, but we can trigger it for responsiveness
                handleBidSubmit();
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [myBid, komiBiddingDeadline, handleBidSubmit]);

    // Simplified adjustKomi without useCallback, as it's now stable
    const adjustKomi = (amount: number) => {
        setKomiValue(prev => Math.max(0, Math.min(100, prev + amount)));
    };

    const renderBidResult = () => {
        if (!myBid || !opponentBid || !opponent) {
            return (
                <div className="text-center">
                    <h3 className="text-lg font-bold mb-2">결과 확인 중...</h3>
                    <p className="text-gray-400 animate-pulse">상대방의 설정을 기다립니다.</p>
                     <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-100"></div>
                    </div>
                </div>
            )
        }
        let resultText = '';
        const isTie = myBid.color === opponentBid.color && myBid.komi === opponentBid.komi;

        if (myBid.color !== opponentBid.color) {
            resultText = `서로 다른 색을 선택하여, 각자 원하는 색으로 시작합니다. (덤 0.5집)`;
        } else {
             if (myBid.komi !== opponentBid.komi) {
                resultText = '같은 색을 선택하여, 더 유리한 덤을 제시한 쪽이 가져갑니다.';
             } else {
                if(komiBiddingRound === 1){
                   resultText = '같은 색과 덤을 선택하여, 2차 덤 설정을 진행합니다.';
                } else {
                   resultText = '2차에서도 같은 색과 덤을 선택하여, 흑/백이 랜덤으로 결정됩니다.';
                }
             }
        }
        
        const pulseText = isTie && komiBiddingRound === 1
            ? '잠시 후 재설정을 시작합니다...'
            : '잠시 후 대국이 시작됩니다...';

        return (
            <div className="text-center">
                <h3 className="text-lg font-bold mb-2">덤 설정 결과 {komiBiddingRound === 2 && "(재설정)"}</h3>
                 <div className="bg-gray-900/50 p-3 rounded-md space-y-2 text-sm">
                    <div>{currentUser.nickname}: <span className="font-bold">{myBid.color === Player.Black ? '흑' : '백'}, {myBid.komi}집</span></div>
                    <div>{opponent.nickname}: <span className="font-bold">{opponentBid.color === Player.Black ? '흑' : '백'}, {opponentBid.komi}집</span></div>
                </div>
                <p className="mt-4 text-xs text-yellow-300">{resultText}</p>
                <p className="mt-4 text-sm text-gray-400 animate-pulse">{pulseText}</p>
            </div>
        )
    };


    if (gameStatus === 'komi_bid_reveal') {
        return <DraggableWindow title="덤 설정 결과" windowId="komi-bidding">{renderBidResult()}</DraggableWindow>;
    }
    
    if (myBid) {
        return (
             <DraggableWindow title="덤 설정" windowId="komi-bidding">
                <div className="text-center">
                    <h3 className="text-lg font-bold mb-2">설정 완료!</h3>
                    <p className="text-gray-400 animate-pulse">상대방의 설정을 기다리고 있습니다...</p>
                    <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-100"></div>
                    </div>
                </div>
             </DraggableWindow>
        )
    }
    
    const baseKomi = 0.5;

    const renderDescription = () => {
        // This calculation is for display only. The final logic is on the server.
        if (selectedColor === Player.Black) {
            const finalKomi = komiValue + baseKomi;
            return `흑을 잡고, 백에게 덤 ${finalKomi}집을 줍니다.`;
        } else {
            const finalKomi = baseKomi - komiValue;
            if (finalKomi >= 0) {
                return `백을 잡고, 흑에게서 덤 ${finalKomi}집을 받습니다.`;
            } else {
                return `백을 잡고, 흑에게 오히려 덤 ${Math.abs(finalKomi)}집을 줍니다.`;
            }
        }
    };
    
    const buttonsDisabled = !!myBid;

    return (
        <DraggableWindow title={`덤 설정 ${komiBiddingRound === 2 ? '(재설정)' : ''}`} windowId="komi-bidding" initialWidth={650}>
            <div className="flex gap-4">
                <div className="w-1/2 flex flex-col">
                    <p className="text-center text-sm text-gray-400 mb-2">배치 결과</p>
                    <div className="aspect-square">
                        <MiniGoBoard session={session} />
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-1">(P1: 흑돌, P2: 백돌로 표시)</p>
                </div>
                <div className="w-1/2 flex flex-col justify-between">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 mb-2">판세를 보고 원하는 돌 색과 추가 덤을 설정하세요. (기본 덤: 백 {baseKomi}집)</p>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 my-2 overflow-hidden">
                            <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${(timer / 30) * 100}%`, transition: 'width 0.5s linear' }}></div>
                        </div>
                        <div className="text-3xl font-mono font-bold text-center text-white">{timer}</div>

                        <div className="flex justify-center gap-4 my-4">
                            <Button onClick={() => setSelectedColor(Player.Black)} disabled={buttonsDisabled} colorScheme={selectedColor === Player.Black ? 'blue' : 'gray'} className="w-24">흑</Button>
                            <Button onClick={() => setSelectedColor(Player.White)} disabled={buttonsDisabled} colorScheme={selectedColor === Player.White ? 'blue' : 'gray'} className="w-24">백</Button>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">추가 덤 설정 (0~100)</label>
                            <div className="bg-gray-900/70 p-2 rounded-lg text-2xl font-bold text-yellow-300 mb-2">{komiValue}집</div>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                <AdjustButton amount={10} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={5} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={3} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={1} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <AdjustButton amount={-10} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={-5} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={-3} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                                <AdjustButton amount={-1} onAdjust={adjustKomi} disabled={buttonsDisabled} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-3 h-8">{renderDescription()}</p>
                    </div>
                    <Button onClick={handleBidSubmit} disabled={buttonsDisabled || isSubmitting} className="w-full mt-auto">{buttonsDisabled ? '설정 완료' : '덤 설정 완료'}</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default KomiBiddingPanel;