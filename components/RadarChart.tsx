import React from 'react';
import { CoreStat } from '../types.js';

interface RadarChartDataset {
    stats: Record<string, number>;
    color: string;
    fill: string;
}

interface RadarChartProps {
    datasets: RadarChartDataset[];
    maxStatValue?: number;
    size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ datasets, maxStatValue = 200, size = 250 }) => {
    const center = size / 2;
    const statKeys = Object.values(CoreStat);
    const numAxes = statKeys.length;
    const angleSlice = (Math.PI * 2) / numAxes;

    const getPoint = (value: number, index: number): { x: number; y: number } => {
        const angle = angleSlice * index - Math.PI / 2;
        const radius = (Math.min(value, maxStatValue) / maxStatValue) * (center * 0.8);
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle),
        };
    };

    const axisLines = [];
    const labels = [];
    const gridLines = [];
    
    const labelFontSize = size < 150 ? 8 : 10;

    for (let i = 0; i < numAxes; i++) {
        const endPoint = getPoint(maxStatValue, i);
        axisLines.push(
            <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
            />
        );

        const labelPoint = getPoint(maxStatValue * 1.15, i);
        labels.push(
            <text
                key={`label-${i}`}
                x={labelPoint.x}
                y={labelPoint.y}
                fontSize={labelFontSize}
                fill="rgba(255, 255, 255, 0.7)"
                textAnchor="middle"
                dy=".3em"
            >
                {statKeys[i]}
            </text>
        );
    }
    
    for (let i = 1; i <= 4; i++) {
        const percentage = i * 0.25;
        const gridPoints = statKeys.map((_, j) => getPoint(maxStatValue * percentage, j));
        gridLines.push(
            <polygon
                key={`grid-${i}`}
                points={gridPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="0.5"
            />
        );
    }


    return (
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
            <g>
                {gridLines}
                {axisLines}
                {labels}
            </g>
            {datasets.map((dataset, i) => {
                const statPoints = statKeys.map((key, j) => getPoint(dataset.stats[key] || 0, j));
                const statPath = statPoints.map(p => `${p.x},${p.y}`).join(' ');

                return (
                    <polygon
                        key={`dataset-${i}`}
                        points={statPath}
                        fill={dataset.fill}
                        stroke={dataset.color}
                        strokeWidth="2"
                    />
                );
            })}
        </svg>
    );
};

export default RadarChart;