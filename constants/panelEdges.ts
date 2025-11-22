import { PanelEdgeStyle } from '../types/index.js';

type EdgeImages = { topLeft: string | null; topRight: string | null; bottomLeft: string | null; bottomRight: string | null };

export const PANEL_EDGE_IMAGE_MAP: Record<PanelEdgeStyle, EdgeImages> = {
    none: { topLeft: null, topRight: null, bottomLeft: null, bottomRight: null },
    default: {
        topLeft: 'url("/images/panel/panel_top_left.png")',
        topRight: 'url("/images/panel/panel_top_right.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right.png")',
    },
    style1: {
        topLeft: 'url("/images/panel/panel_top_left1.png")',
        topRight: 'url("/images/panel/panel_top_right1.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left1.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right1.png")',
    },
    style2: {
        topLeft: 'url("/images/panel/panel_top_left2.png")',
        topRight: 'url("/images/panel/panel_top_right2.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left2.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right2.png")',
    },
    style3: {
        topLeft: 'url("/images/panel/panel_top_left3.png")',
        topRight: 'url("/images/panel/panel_top_right3.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left3.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right3.png")',
    },
    style4: {
        topLeft: 'url("/images/panel/panel_top_left4.png")',
        topRight: 'url("/images/panel/panel_top_right4.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left4.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right4.png")',
    },
    style5: {
        topLeft: 'url("/images/panel/panel_top_left5.png")',
        topRight: 'url("/images/panel/panel_top_right5.png")',
        bottomLeft: 'url("/images/panel/panel_bottom_left5.png")',
        bottomRight: 'url("/images/panel/panel_bottom_right5.png")',
    },
};

export const getPanelEdgeImages = (style: PanelEdgeStyle): EdgeImages => {
    return PANEL_EDGE_IMAGE_MAP[style] || PANEL_EDGE_IMAGE_MAP.default;
};


