export function parseHash(hash) {
    const path = hash.replace(/^#\/?/, '');
    const [view, ...rest] = path.split('/');
    switch (view) {
        case 'lobby': return { view: 'lobby', params: { type: rest[0] || 'strategic' } };
        case 'waiting': return { view: 'waiting', params: { mode: rest[0] ? decodeURIComponent(rest[0]) : null } };
        case 'game': return { view: 'game', params: { id: rest[0] } };
        case 'tournament': return { view: 'tournament', params: {} };
        case 'singleplayer': return { view: 'singleplayer', params: {} };
        case 'admin': return { view: 'admin', params: {} };
        case 'register': return { view: 'register', params: {} };
        case 'profile': return { view: 'profile', params: {} };
        default: return { view: 'login', params: {} };
    }
}
