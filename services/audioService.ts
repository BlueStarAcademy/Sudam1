/// <reference lib="dom" />

import { ItemGrade } from '../types.js';
import type { SoundSettings } from '../types.js';
import { defaultSettings } from '../hooks/useAppSettings.js';

class AudioService {
    private audioContext: AudioContext | null = null;
    private isInitializing = false;
    private scanBgmSourceNode: AudioBufferSourceNode | null = null;
    private timerWarningSourceNode: AudioBufferSourceNode | null = null;
    private audioBuffers = new Map<string, AudioBuffer>();
    private soundsPath = '/sound/';
    private settings: SoundSettings = defaultSettings.sound;

    public isReady(): boolean {
        return !!this.audioContext && this.audioContext.state === 'running';
    }

    public async initialize() {
        if (this.isReady() || this.isInitializing) return;
        this.isInitializing = true;
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (error) {
            console.error("Audio context initialization failed:", error);
        } finally {
            this.isInitializing = false;
        }
    }

    public updateSettings(newSettings: SoundSettings) {
        this.settings = newSettings;
    }

    private async loadSound(url: string): Promise<AudioBuffer | null> {
        if (!this.audioContext) await this.initialize();
        if (!this.audioContext) return null;
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url)!;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound: ${url}`, error);
            return null;
        }
    }

    private async playSound(buffer: AudioBuffer, volume = 1, loop = false): Promise<AudioBufferSourceNode | null> {
        if (!this.audioContext) {
            await this.initialize();
            if (!this.audioContext) return null;
        }
        
        // 모바일 환경에서 AudioContext가 suspended 상태일 수 있으므로 resume 시도
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.error("Failed to resume audio context:", error);
                return null;
            }
        }
        
        if (this.audioContext.state !== 'running') return null;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
        return source;
    }
    
    private async play(soundName: string, category: keyof SoundSettings['categoryMuted'], volume: number, loop = false): Promise<AudioBufferSourceNode | null> {
        if (this.settings.masterMuted || this.settings.categoryMuted[category]) return null;
        try {
            const buffer = await this.loadSound(`${this.soundsPath}${soundName}.mp3`);
            if (buffer) return await this.playSound(buffer, volume * this.settings.masterVolume, loop);
        } catch (e) {
            console.error(`Could not play sound ${soundName}`, e);
        }
        return null;
    }

    // Public methods based on user request
    public placeStone() { this.play('move', 'stone', 0.7).catch(() => {}); }
    public rollDice(count: number) { this.play('dice', 'item', 0.6).catch(() => {}); if (count > 1) { setTimeout(() => this.play('dice', 'item', 0.6).catch(() => {}), 500); } }
    public enhancementFail() { this.play('failure', 'notification', 0.7).catch(() => {}); }
    public revealHiddenStone() { this.play('hidden', 'item', 0.8).catch(() => {}); }
    public async playScanBgm() { this.stopScanBgm(); this.scanBgmSourceNode = await this.play('scanbgm', 'item', 0.4, true); }
    public stopScanBgm() { if (this.scanBgmSourceNode) { try { this.scanBgmSourceNode.stop(); } catch(e) {} this.scanBgmSourceNode = null; } }
    public scanSuccess() { this.play('find', 'item', 0.7).catch(() => {}); }
    public stoneCollision() { this.play('hit', 'stone', 0.4).catch(() => {}); }
    public launchMissile() { this.play('rocket', 'item', 0.7).catch(() => {}); }
    public gameLose() { this.play('lose', 'notification', 0.6).catch(() => {}); }
    public gameWin() { this.play('win', 'notification', 0.6).catch(() => {}); }
    public levelUp() { this.play('levelup', 'notification', 0.7).catch(() => {}); }
    public disassemblyJackpot() { this.play('jackpot2', 'notification', 0.8).catch(() => {}); }
    public gachaEpicOrHigher() { this.play('jackpot', 'notification', 0.7).catch(() => {}); }
    public gameStart() { this.play('gamestart', 'notification', 0.6).catch(() => {}); }
    public myTurn() { this.play('myturn', 'turn', 0.7).catch(() => {}); }
    public scanFail() { this.play('scanfail', 'item', 0.6).catch(() => {}); }

    public async timerWarning() {
        this.stopTimerWarning();
        this.timerWarningSourceNode = await this.play('timer10', 'countdown', 0.7);
    }
    
    public stopTimerWarning() {
        if (this.timerWarningSourceNode) {
            try {
                this.timerWarningSourceNode.stop();
            } catch(e) {
                // Ignore error, e.g. if sound has already finished
            }
            this.timerWarningSourceNode = null;
        }
    }

    public timeoutFoul() { this.play('bip', 'notification', 0.8).catch(() => {}); }
    public enhancementSuccess() { this.play('success', 'notification', 0.7).catch(() => {}); }
    public combinationGreatSuccess() { this.play('jackpot', 'notification', 0.7).catch(() => {}); }
    public combinationSuccess() { this.play('success', 'notification', 0.7).catch(() => {}); }
    public stoneFallOff() { this.play('fall', 'stone', 0.5).catch(() => {}); }
    public claimReward() { this.play('reward', 'notification', 0.7).catch(() => {}); }
}

export const audioService = new AudioService();