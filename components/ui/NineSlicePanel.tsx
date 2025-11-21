import React, { ReactNode } from 'react';

interface NineSlicePanelProps {
    children: ReactNode;
    className?: string;
}

const NineSlicePanel: React.FC<NineSlicePanelProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-panel rounded-lg border border-color ${className}`}>
            {children}
        </div>
    );
};

export default NineSlicePanel;

