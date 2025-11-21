
import React from 'react';
import type { GuildBossBattleResult as GuildBossBattleResultType } from '../../types/index.js';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';

interface GuildBossBattleResultModalProps {
    result: GuildBossBattleResultType & { bossName: string };
    onClose: () => void;
    isTopmost?: boolean;
}

const GuildBossBattleResultModal: React.FC<GuildBossBattleResultModalProps> = ({ result, onClose, isTopmost }) => {
    const hpPercentAfter = (result.bossHpAfter / result.bossMaxHp) * 100;
    
    return (
        <DraggableWindow title="전투 결과" onClose={onClose} windowId="guild-boss-battle-result" initialWidth={500} isTopmost={isTopmost}>
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">{result.bossName} 전투 결과</h2>
                <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg text-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">총 피해량:</span>
                        <span className="font-bold text-yellow-300">{result.damageDealt.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">생존 턴:</span>
                        <span className="font-bold text-white">{result.turnsSurvived} 턴</span>
                    </div>
                     <div className="pt-3 border-t border-gray-700">
                        <p className="text-sm text-gray-300 mb-1">보스 남은 체력 ({hpPercentAfter.toFixed(1)}%)</p>
                        <div className="w-full bg-tertiary rounded-full h-4 border-2 border-color relative">
                            <div className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full" style={{ width: `${hpPercentAfter}%` }}></div>
                             <span className="absolute inset-0 text-xs font-bold text-white flex items-center justify-center" style={{textShadow: '1px 1px 2px black'}}>
                                {result.bossHpAfter.toLocaleString()} / {result.bossMaxHp.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                        <span className="text-gray-300">획득 보상:</span>
                         <span className="font-bold text-green-400 flex items-center gap-1">
                            <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-5 h-5" />
                            {result.rewards.guildCoins?.toLocaleString() || 0}
                        </span>
                    </div>
                </div>
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default GuildBossBattleResultModal;
