
import React, { useState, useMemo } from 'react';
// FIX: Import missing types from the centralized types file.
import { ServerAction, AdminProps, InventoryItem, InventoryItemType, User } from '../../types/index.js';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { EQUIPMENT_POOL, CONSUMABLE_ITEMS, MATERIAL_ITEMS } from '../../constants';

interface ItemSelectionModalProps {
    onAddItem: (item: { name: string; quantity: number, type: InventoryItemType }) => void;
    onClose: () => void;
}

const ItemSelectionModal: React.FC<ItemSelectionModalProps> = ({ onAddItem, onClose }) => {
    type ItemTab = 'equipment' | 'consumable' | 'material';
    const [activeTab, setActiveTab] = useState<ItemTab>('equipment');
    const [selectedItem, setSelectedItem] = useState<{ name: string; type: InventoryItemType } | null>(null);
    const [quantity, setQuantity] = useState(1);

    const itemsForTab = useMemo(() => {
        switch (activeTab) {
            case 'equipment': return EQUIPMENT_POOL;
            case 'consumable': return CONSUMABLE_ITEMS;
            case 'material': return Object.values(MATERIAL_ITEMS);
            default: return [];
        }
    }, [activeTab]);

    const handleAddItem = () => {
        if (selectedItem && quantity > 0) {
            onAddItem({ ...selectedItem, quantity });
            setSelectedItem(null);
            setQuantity(1);
        }
    };

    return (
        <DraggableWindow title="아이템 첨부" onClose={onClose} windowId="mail-item-selection" initialWidth={600}>
            <div className="h-[60vh] flex flex-col">
                <div className="flex bg-tertiary/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    <button onClick={() => setActiveTab('equipment')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'equipment' ? 'bg-accent' : 'text-tertiary'}`}>장비</button>
                    <button onClick={() => setActiveTab('consumable')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'consumable' ? 'bg-accent' : 'text-tertiary'}`}>소모품</button>
                    <button onClick={() => setActiveTab('material')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'material' ? 'bg-accent' : 'text-tertiary'}`}>재료</button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-4 gap-2">
                    {itemsForTab.map(item => (
                        <div
                            key={item.name}
                            onClick={() => setSelectedItem({ name: item.name, type: item.type })}
                            className={`p-2 rounded-lg border-2 ${selectedItem?.name === item.name ? 'border-accent ring-2 ring-accent' : 'border-color bg-secondary/50'} cursor-pointer flex flex-col items-center`}
                        >
                            <img src={item.image!} alt={item.name} className="w-16 h-16 object-contain" />
                            <span className="text-xs text-center mt-1">{item.name}</span>
                        </div>
                    ))}
                </div>
                <div className="flex-shrink-0 mt-4 pt-4 border-t border-color flex items-center justify-between">
                    <div>
                        <label>수량: </label>
                        <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} className="bg-tertiary w-20 p-1 rounded" />
                    </div>
                    <Button onClick={handleAddItem} disabled={!selectedItem}>선택 아이템 추가</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};


// FIX: Add missing props to the interface as they are used in the component.
interface MailSystemPanelProps extends AdminProps {
    allUsers: User[];
    onAction: (action: ServerAction) => void;
    onBack: () => void;
}

const MailSystemPanel: React.FC<MailSystemPanelProps> = ({ allUsers, onAction, onBack }) => {
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
    const [targetSpecifier, setTargetSpecifier] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [gold, setGold] = useState(0);
    const [diamonds, setDiamonds] = useState(0);
    const [actionPoints, setActionPoints] = useState(0);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [attachedItems, setAttachedItems] = useState<{ name: string, quantity: number, type: InventoryItemType }[]>([]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setTargetSpecifier(query);
        if (query.length > 1) {
            const matches = allUsers
                .filter(u => u.nickname.toLowerCase().includes(query.toLowerCase()) || u.username.toLowerCase().includes(query.toLowerCase()))
                .map(u => u.nickname)
                .slice(0, 5);
            setSearchResults(matches);
        } else {
            setSearchResults([]);
        }
    };
    
    const handleSendMail = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            alert('제목과 메시지를 모두 입력해주세요.');
            return;
        }
        if (targetType === 'specific' && !targetSpecifier.trim()) {
            alert('특정 사용자 발송 시 닉네임 또는 아이디를 입력해주세요.');
            return;
        }

        onAction({
            type: 'ADMIN_SEND_MAIL',
            payload: {
                targetSpecifier: targetType === 'all' ? 'all' : targetSpecifier,
                title,
                message,
                expiresInDays,
                attachments: { gold, diamonds, actionPoints, items: attachedItems }
            }
        });

        setTitle('');
        setMessage('');
        setGold(0);
        setDiamonds(0);
        setActionPoints(0);
        setExpiresInDays(7);
        setTargetSpecifier('');
        setAttachedItems([]);
    };

    return (
        <div className="max-w-4xl mx-auto bg-primary text-primary">
            {isItemModalOpen && <ItemSelectionModal onClose={() => setIsItemModalOpen(false)} onAddItem={(item) => setAttachedItems(prev => [...prev, item])} />}
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">우편 발송 시스템</h1>
                <button onClick={onBack} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5">
                    <img src="/images/button/back.png" alt="Back" className="w-10 h-10 sm:w-12 sm:h-12" />
                </button>
            </header>

            <div className="bg-panel border border-color p-6 rounded-lg shadow-lg text-on-panel">
                <form onSubmit={handleSendMail} className="space-y-4 text-sm">
                    <div>
                        <label className="block mb-1 font-medium text-secondary">받는 사람</label>
                        <div className="flex gap-4">
                            <label className="flex items-center"><input type="radio" name="targetType" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="mr-2" />전체 사용자</label>
                            <label className="flex items-center"><input type="radio" name="targetType" value="specific" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="mr-2" />특정 사용자</label>
                        </div>
                    </div>

                    {targetType === 'specific' && (
                        <div className="relative">
                            <label className="block mb-1 font-medium text-secondary">닉네임 또는 아이디</label>
                            <input 
                                type="text"
                                value={targetSpecifier}
                                onChange={handleSearchChange}
                                className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5"
                                required
                            />
                            {searchResults.length > 0 && (
                                <ul className="absolute z-10 w-full bg-secondary border border-color rounded-lg mt-1">
                                    {searchResults.map(name => (
                                        <li key={name} onClick={() => { setTargetSpecifier(name); setSearchResults([]); }} className="px-4 py-2 hover:bg-accent cursor-pointer">{name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    
                    <div>
                        <label className="block mb-1 font-medium text-secondary">제목</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium text-secondary">메시지</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} required className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5"></textarea>
                    </div>
                    <div>
                        <label className="block mb-1 font-medium text-secondary">수령 제한일 (0일 = 무제한)</label>
                        <input type="number" min="0" value={expiresInDays} onChange={e => setExpiresInDays(parseInt(e.target.value, 10) || 0)} className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block mb-1 font-medium text-secondary">⚡ 행동력</label>
                            <input type="number" min="0" value={actionPoints} onChange={e => setActionPoints(parseInt(e.target.value, 10) || 0)} className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5" />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-secondary">💰 금화</label>
                            <input type="number" min="0" value={gold} onChange={e => setGold(parseInt(e.target.value, 10) || 0)} className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5" />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-secondary">💎 다이아</label>
                            <input type="number" min="0" value={diamonds} onChange={e => setDiamonds(parseInt(e.target.value, 10) || 0)} className="bg-secondary border border-color text-primary rounded-lg block w-full p-2.5" />
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-color">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block font-medium text-secondary">첨부된 아이템 ({attachedItems.length})</label>
                             <Button type="button" onClick={() => setIsItemModalOpen(true)} colorScheme="blue" className="!py-1 !text-xs">아이템 첨부</Button>
                        </div>
                        <div className="bg-tertiary/50 p-2 rounded-md min-h-[50px] space-y-1">
                            {attachedItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-primary/50 p-1 rounded">
                                    <span>{item.name} x {item.quantity}</span>
                                    <button type="button" onClick={() => setAttachedItems(prev => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-400 font-bold px-2">X</button>
                                </div>
                            ))}
                            {attachedItems.length === 0 && <p className="text-tertiary text-center text-xs py-2">첨부된 아이템이 없습니다.</p>}
                        </div>
                    </div>

                    
                    <Button type="submit" className="w-full py-3" colorScheme="green">발송하기</Button>
                </form>
            </div>
        </div>
    );
};

export default MailSystemPanel;