import type { LiveGameSession } from '../../types/index.js';
import { Player } from '../../types/index.js';

export const NO_CAPTURE_TARGET = 999;

export function getCaptureTarget(game: LiveGameSession, player: Player): number | undefined {
    const effective = game.effectiveCaptureTargets;
    if (effective && typeof effective[player] === 'number') {
        return effective[player]!;
    }

    const baseTarget = game.settings?.captureTarget;
    return typeof baseTarget === 'number' ? baseTarget : undefined;
}

export function hasCaptureTarget(game: LiveGameSession, player: Player): boolean {
    const target = getCaptureTarget(game, player);
    return typeof target === 'number' && target !== NO_CAPTURE_TARGET;
}

