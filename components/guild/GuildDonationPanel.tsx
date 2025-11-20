import React, { useState } from 'react';
import { GuildDonation } from '../../types/entities.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface GuildDonationPanelProps {
    guildId: string;
    donations: GuildDonation[];
    onDonationsUpdate: (donations: GuildDonation[]) => void;
    onGuildUpdate: () => void;
}

const GuildDonationPanel: React.FC<GuildDonationPanelProps> = ({ guildId, donations, onDonationsUpdate, onGuildUpdate }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    const [donationAmount, setDonationAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDonate = async () => {
        const amount = parseInt(donationAmount);
        if (!amount || amount <= 0) {
            alert('기부할 골드를 입력해주세요.');
            return;
        }

        if (currentUserWithStatus && currentUserWithStatus.gold < amount) {
            alert('골드가 부족합니다.');
            return;
        }

        setLoading(true);
        try {
            const result: any = await handlers.handleAction({
                type: 'DONATE_TO_GUILD',
                payload: { amount },
            });
            if (result && !result.error && result.clientResponse?.donation) {
                onDonationsUpdate([result.clientResponse.donation, ...donations]);
                onGuildUpdate();
                setDonationAmount('');
            } else if (result?.error) {
                alert(result.error);
            }
        } catch (error: any) {
            alert(error.message || '기부에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">길드 기부</h2>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">기부하기</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        type="number"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        placeholder="기부할 골드"
                        min="1"
                        className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <Button
                        onClick={handleDonate}
                        colorScheme="green"
                        disabled={loading || !donationAmount}
                        className="!py-2 !px-4"
                    >
                        기부
                    </Button>
                </div>
                <p className="text-sm text-gray-400">
                    보유 골드: {currentUserWithStatus?.gold?.toLocaleString() || 0}
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">기부 내역</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {donations.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">기부 내역이 없습니다.</p>
                    ) : (
                        donations.map((donation) => (
                            <div key={donation.id} className="p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-white">User {donation.userId}</span>
                                    <span className="text-yellow-400 font-semibold">
                                        {donation.amount.toLocaleString()} 골드
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(donation.createdAt).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuildDonationPanel;

