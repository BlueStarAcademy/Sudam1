


import React, { useState } from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { useAppContext } from '../hooks/useAppContext.js';
import { Theme, SoundCategory, PanelEdgeStyle } from '../types.js';
import ToggleSwitch from './ui/ToggleSwitch.js';
import Slider from './ui/Slider.js';
import ColorSwatch from './ui/ColorSwatch.js';
import { getPanelEdgeImages } from '../constants/panelEdges.js';

interface SettingsModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

type SettingsTab = 'graphics' | 'sound' | 'features';

const THEMES: { id: Theme; name: string; colors: string[] }[] = [
    { id: 'black', name: '슬레이트', colors: ['#0f172a', '#1e293b', '#e2e8f0', '#eab308'] },
    { id: 'white', name: '서리빛 노르딕', colors: ['#edf1f6', '#cbd5e1', '#1f2937', '#d4b373'] },
    { id: 'sky', name: '안개 낀 새벽', colors: ['#1f2a37', '#3a465e', '#4ea8d1', '#f6c453'] },
    { id: 'blue', name: '노을 빛 라벤더', colors: ['#1e1f2e', '#4c4b69', '#a887ff', '#f6d8a6'] },
    { id: 'green', name: '깊은 숲의 숨', colors: ['#17251d', '#2c4632', '#7abf8b', '#e3c970'] },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, isTopmost }) => {
    const { settings, updateTheme, updateSoundSetting, updateFeatureSetting, updatePanelColor, updateTextColor, updatePanelEdgeStyle, resetGraphicsToDefault } = useAppContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>('graphics');
    
    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'graphics', label: '그래픽' },
        { id: 'sound', label: '사운드' },
        { id: 'features', label: '기능' },
    ];

    const soundCategories: { key: SoundCategory, label: string }[] = [
        { key: 'stone', label: '착수/충돌/낙하 소리' },
        { key: 'notification', label: '획득/레벨업 알림' },
        { key: 'item', label: '아이템 사용 소리' },
        { key: 'countdown', label: '초읽기/카운트다운 소리' },
        { key: 'turn', label: '내 턴 알림 소리' },
    ];

    const PANEL_EDGE_OPTIONS: { id: PanelEdgeStyle; label: string; description?: string }[] = [
        { id: 'none', label: '엣지 없음' },
        { id: 'default', label: '클래식 엣지' },
        { id: 'style1', label: '에메랄드' },
        { id: 'style2', label: '코발트' },
        { id: 'style3', label: '크림슨' },
        { id: 'style4', label: '자수정' },
        { id: 'style5', label: '황금' },
    ];

    const renderEdgePreview = (style: PanelEdgeStyle) => {
        const edges = getPanelEdgeImages(style);
        const backgroundImage = [edges.topLeft, edges.topRight, edges.bottomLeft, edges.bottomRight]
            .map(img => img ?? 'none')
            .join(', ');
        return (
            <div
                className="w-20 h-14 rounded-lg border border-color bg-panel"
                style={{
                    backgroundImage,
                    backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat',
                    backgroundPosition: 'top left, top right, bottom left, bottom right',
                    backgroundSize: '28px 28px',
                }}
            />
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'graphics':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-text-secondary">UI 테마</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                {THEMES.map(theme => (
                                    <label key={theme.id} className="flex items-center p-3 bg-tertiary/50 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent">
                                        <input
                                            type="radio"
                                            name="theme"
                                            value={theme.id}
                                            checked={settings.graphics.theme === theme.id}
                                            onChange={() => updateTheme(theme.id)}
                                            className="w-5 h-5 text-accent bg-secondary border-color focus:ring-accent"
                                        />
                                    <span className="ml-3 text-text-primary text-sm sm:text-base whitespace-nowrap">{theme.name}</span>
                                        <div className="ml-auto flex -space-x-2">
                                            {theme.colors.map((color, i) => (
                                                <div key={i} style={{ backgroundColor: color }} className="w-6 h-6 rounded-full border-2 border-primary"></div>
                                            ))}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-color">
                            <h3 className="text-lg font-semibold text-text-secondary mb-3">패널 엣지 스타일</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-center p-6 bg-tertiary/60 border border-color rounded-xl">
                                    {renderEdgePreview(settings.graphics.panelEdgeStyle ?? 'default')}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {PANEL_EDGE_OPTIONS.map(option => (
                                        <label
                                            key={option.id}
                                            className="flex items-center gap-2 rounded-lg bg-tertiary/40 border border-transparent transition-all cursor-pointer has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent has-[:checked]:bg-tertiary/60 px-2.5 py-2"
                                        >
                                            <input
                                                type="radio"
                                                name="panelEdgeStyle"
                                                value={option.id}
                                                checked={(settings.graphics.panelEdgeStyle ?? 'default') === option.id}
                                                onChange={() => updatePanelEdgeStyle(option.id)}
                                                className="w-4 h-4 text-accent bg-secondary border-color focus:ring-accent flex-shrink-0"
                                            />
                                            <span className="text-sm text-text-primary whitespace-nowrap flex-1">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'sound':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-text-secondary mb-2">마스터 볼륨</h3>
                            <div className="flex items-center gap-4">
                                <span className="w-12 text-center font-mono text-text-primary text-lg">{(settings.sound.masterVolume * 10).toFixed(0)}</span>
                                <Slider 
                                    min={0} 
                                    max={1} 
                                    step={0.1}
                                    value={settings.sound.masterVolume} 
                                    onChange={(v) => updateSoundSetting('masterVolume', v)}
                                    disabled={settings.sound.masterMuted}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-text-secondary">효과음 전체</h3>
                            <ToggleSwitch
                                checked={!settings.sound.masterMuted}
                                onChange={(checked) => updateSoundSetting('masterMuted', !checked)}
                            />
                        </div>
                        <div className="space-y-3 pt-4 border-t border-color">
                             <h3 className="text-lg font-semibold text-text-secondary mb-2">효과음 세부 조절</h3>
                             {soundCategories.map(({key, label}) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-text-secondary">{label}</span>
                                    <ToggleSwitch
                                        checked={!settings.sound.categoryMuted[key]}
                                        onChange={(checked) => updateSoundSetting('categoryMuted', {...settings.sound.categoryMuted, [key]: !checked})}
                                        disabled={settings.sound.masterMuted}
                                    />
                                </div>
                             ))}
                        </div>
                    </div>
                );
            case 'features':
                return (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-secondary mb-4">게임 플레이</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">모바일 착점 시 [착수] 버튼 생성</span>
                            <ToggleSwitch
                                checked={settings.features.mobileConfirm}
                                onChange={(checked) => updateFeatureSetting('mobileConfirm', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">돌 미리보기 (마우스 호버)</span>
                            <ToggleSwitch
                                checked={settings.features.stonePreview}
                                onChange={(checked) => updateFeatureSetting('stonePreview', checked)}
                            />
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-text-secondary">마지막 놓은 자리 표시</span>
                            <ToggleSwitch
                                checked={settings.features.lastMoveMarker}
                                onChange={(checked) => updateFeatureSetting('lastMoveMarker', checked)}
                            />
                        </div>
                        <h3 className="text-lg font-semibold text-text-secondary mb-4 pt-4 border-t border-color">알림</h3>
                         <div className="flex items-center justify-between">
                            <span className="text-text-secondary">퀘스트 완료 알림</span>
                            <ToggleSwitch
                                checked={settings.features.questNotifications}
                                onChange={(checked) => updateFeatureSetting('questNotifications', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">채팅 내용 알림 (빨간 점)</span>
                            <ToggleSwitch
                                checked={settings.features.chatNotifications}
                                onChange={(checked) => updateFeatureSetting('chatNotifications', checked)}
                            />
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <DraggableWindow title="설정" onClose={onClose} windowId="settings" initialWidth={600} isTopmost={isTopmost}>
            <div className="h-[calc(var(--vh,1vh)*60)] flex flex-col">
                <div className="flex bg-tertiary/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex-grow overflow-y-auto pr-2 p-2">
                    {renderContent()}
                </div>
                 <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-color flex-shrink-0">
                    <Button onClick={onClose} colorScheme="gray">닫기</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SettingsModal;