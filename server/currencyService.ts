import { User, CurrencyLog } from '.././types/index.js';

export function addCurrencyLog(
    user: User,
    type: 'gold_gain' | 'gold_spend' | 'diamond_gain' | 'diamond_spend',
    amount: number,
    reason: string
) {
    if (amount === 0) return;

    if (!user.currencyLogs) {
        user.currencyLogs = [];
    }
    const log: CurrencyLog = {
        timestamp: Date.now(),
        type,
        amount: Math.abs(amount), // Always store positive amount
        reason,
        balanceAfter: {
            gold: user.gold,
            diamonds: user.diamonds
        }
    };
    user.currencyLogs.unshift(log);
    
    // Keep a reasonable number of logs to prevent user object bloat, e.g., 200.
    if (user.currencyLogs.length > 200) {
        user.currencyLogs.length = 200;
    }
}

export function grantGold(user: User, amount: number, reason: string) {
    if (amount <= 0) return;
    user.gold += amount;
    addCurrencyLog(user, 'gold_gain', amount, reason);
}

export function spendGold(user: User, amount: number, reason: string) {
    if (user.isAdmin) return;
    if (amount <= 0) return;
    user.gold -= amount;
    addCurrencyLog(user, 'gold_spend', amount, reason);
}

export function grantDiamonds(user: User, amount: number, reason: string) {
    if (amount <= 0) return;
    user.diamonds += amount;
    addCurrencyLog(user, 'diamond_gain', amount, reason);
}

export function spendDiamonds(user: User, amount: number, reason: string) {
    if (user.isAdmin) return;
    if (amount <= 0) return;
    user.diamonds -= amount;
    addCurrencyLog(user, 'diamond_spend', amount, reason);
}

export function pruneCurrencyLogs(user: User): boolean {
    if (!user.currencyLogs || user.currencyLogs.length === 0) {
        return false;
    }
    
    const originalLength = user.currencyLogs.length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    user.currencyLogs = user.currencyLogs.filter(log => log.timestamp >= weekAgo);
    
    return user.currencyLogs.length !== originalLength;
}