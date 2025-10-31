
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveGameSession, User, ServerAction } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';

interface CaptureBidModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const AdjustButton: React.FC<{amount: number; onAdjust: (amount: number) => void; disabled: boolean}> = React.memo(({amount, onAdjust, disabled}) => (
    <Button 
        onClick={() => onAdjust(amount)}
        disabled={disabled}
        colorScheme="gray"
        className="w-full"
    >
        {amount > 0 ? `+${amount}` : `${amount}`}
    </Button>
));


const CaptureBidModal: React.FC<CaptureBidModalProps> = (props) => {
    const { session, currentUser, onAction } = props;
    const { id: gameId, player1, player2, bids, biddingRound, captureBidDeadline, settings } = session;
    const [localBid, setLocalBid] = useState<number>(1);
    const [countdown, setCountdown] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const lastBiddingRoundRef = useRef(biddingRound);
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    useEffect(() => {
        if (biddingRound !== lastBiddingRoundRef.current) {
            setLocalBid(1);
            setIsSubmitting(false);
            lastBiddingRoundRef.current = biddingRound;
        }
    }, [biddingRound]);

    const opponent = currentUser.id === player1.id ? player2 : player1;
    const myBid = bids?.[currentUser.id];
    const opponentBid = bids?.[opponent.id];
    const bothHaveBid = typeof myBid === 'number' && typeof opponentBid === 'number';
    
    const handleBidSubmit = useCallback(() => {
        const { onAction: currentOnAction, session: currentSession, currentUser } = latestProps.current;
        const myCurrentBid = currentSession.bids?.[currentUser.id];
        
        if (typeof myCurrentBid === 'number' || isSubmitting) return;

        setIsSubmitting(true);
        currentOnAction({ type: 'UPDATE_CAPTURE_BID', payload: { gameId, bid: localBid } });
        setTimeout(() => setIsSubmitting(false), 5000);
    }, [isSubmitting, gameId, localBid]);

    useEffect(() => {
        if (typeof myBid === 'number' || !captureBidDeadline) {
            setCountdown(0);
            return;
        };
        const timerId = setInterval(() => {
             const remaining = Math.max(0, Math.ceil((captureBidDeadline - Date.now()) / 1000));
             setCountdown(remaining);
             if (remaining <= 0) {
                 clearInterval(timerId);
             }
        }, 1000);
        return () => clearInterval(timerId);
    }, [myBid, captureBidDeadline]);

    const adjustBid = useCallback((amount: number) => {
        if (typeof myBid === 'number') return;
        setLocalBid(prev => Math.max(1, Math.min(50, prev + amount)));
    }, [myBid]);

    const renderContent = () => {
        const baseTarget = settings.captureTarget || 20;

        if (bothHaveBid) {
          const p1Bid = bids![player1.id]!;
          const p2Bid = bids![player2.id]!;
          let winnerText = '';
          const isTie = p1Bid === p2Bid;
          
          let winner, loser, winnerBid;
          if (p1Bid > p2Bid) {
              winner = player1;
              winnerBid = p1Bid;
          } else if (p2Bid > p1Bid) {
              winner = player2;
              winnerBid = p2Bid;
          }

          if (winner) {
            winnerText = `${winner.nickname}님이 ${winnerBid}개를 추가 설정하여 흑(선)이 됩니다.`;
          } else {
            winnerText = biddingRound === 2 ? '두 번째에도 비겨서, 랜덤으로 결정됩니다.' : '동점이므로, 재설정합니다!';
          }
          
          const pulseText = isTie && biddingRound === 1
            ? '잠시 후 재설정을 시작합니다...'
            : '잠시 후 대국이 시작됩니다...';

          return (
            <div className="text-center">
              <div className="grid grid-cols-2 gap-4 text-lg mb-6">
                  <div className="bg-gray-900 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">{player1.nickname}님의 설정</p>
                      <p className="text-3xl font-bold">{p1Bid}개</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">{player2.nickname}님의 설정</p>
                      <p className="text-3xl font-bold">{p2Bid}개</p>
                  </div>
              </div>
              <p className="mt-4 text-xl"><span className="font-bold text-yellow-300">{winnerText}</span></p>
              <p className="mt-6 text-sm text-gray-400 animate-pulse">{pulseText}</p>
            </div>
          );
        }

        if (typeof myBid === 'number') {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">설정 완료!</h2>
                    <p className="text-gray-300 mb-6 animate-pulse">{opponent.nickname}님의 설정을 기다리고 있습니다...</p>
                    <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-100"></div>
                    </div>
                </div>
            );
        }

        const buttonsDisabled = typeof myBid === 'number';

        return (
            <div className="text-center">
                <p className="text-gray-300 mb-6">기본 목표는 <span className="font-bold text-yellow-300">{baseTarget}개</span>입니다. 흑(선수)을 잡기 위해 추가로 몇 개의 돌을 더 따낼지 설정하세요. 더 높은 숫자를 제시하는 쪽이 흑이 됩니다.</p>
                
                <div className="my-4 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(countdown / 30) * 100}%`, transition: 'width 1s linear' }}></div>
                    </div>
                    <div className="text-5xl font-mono text-yellow-300">{countdown}</div>
                </div>

                <div className="my-4">
                    <div className="bg-gray-900/70 p-2 rounded-lg text-4xl font-bold text-yellow-300 mb-4 text-center">
                        {baseTarget} + {localBid}개
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        <AdjustButton amount={10} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={5} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={3} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={1} onAdjust={adjustBid} disabled={buttonsDisabled} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <AdjustButton amount={-10} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={-5} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={-3} onAdjust={adjustBid} disabled={buttonsDisabled} />
                        <AdjustButton amount={-1} onAdjust={adjustBid} disabled={buttonsDisabled} />
                    </div>
                </div>
                <Button
                  onClick={handleBidSubmit}
                  disabled={isSubmitting || buttonsDisabled}
                  className="w-full py-3"
                >
                  {isSubmitting ? '설정 중...' : '설정하기'}
                </Button>
            </div>
        );
    };

    return (
        <DraggableWindow title={`흑선 가져오기 ${biddingRound === 2 ? '(재설정)' : ''}`} windowId="capture-bid">
             {renderContent()}
        </DraggableWindow>
    );
};

export default CaptureBidModal;