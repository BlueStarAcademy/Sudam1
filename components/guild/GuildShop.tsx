import React from 'react';
import type { GuildShop } from '../../types/entities.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface GuildShopProps {
    guildId: string;
    shopItems: GuildShop[];
    onShopItemsUpdate: (items: GuildShop[]) => void;
}

const GuildShopComponent: React.FC<GuildShopProps> = ({ guildId, shopItems, onShopItemsUpdate }) => {
    const { handlers } = useAppContext();

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">길드 상점</h2>
            <div className="space-y-2">
                {shopItems.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">판매 중인 아이템이 없습니다.</p>
                ) : (
                    shopItems.map((item) => (
                        <div key={item.id} className="p-4 bg-gray-800/50 rounded-lg flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Item {item.itemTemplateId}</h3>
                                <p className="text-yellow-400 font-semibold">{item.price.toLocaleString()} 골드</p>
                                {item.stock !== -1 && (
                                    <p className="text-sm text-gray-400">
                                        재고: {item.stock - (item.purchasedBy?.length || 0)}/{item.stock}
                                    </p>
                                )}
                            </div>
                            <Button
                                onClick={async () => {
                                    try {
                                        const result: any = await handlers.handleAction({
                                            type: 'PURCHASE_GUILD_SHOP_ITEM',
                                            payload: { shopItemId: item.id },
                                        });
                                        if (result?.error) {
                                            alert(result.error);
                                        } else {
                                            // Reload shop items
                                            window.location.reload(); // Simple reload for now
                                        }
                                    } catch (error: any) {
                                        alert(error.message || '구매에 실패했습니다.');
                                    }
                                }}
                                colorScheme="green"
                                className="!py-2 !px-4"
                                disabled={item.stock !== -1 && (item.purchasedBy?.length || 0) >= item.stock}
                            >
                                구매
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GuildShopComponent;

