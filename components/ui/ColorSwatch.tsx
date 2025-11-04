
import React from 'react';

interface ColorSwatchProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-2 transition-all ${isSelected ? 'border-highlight ring-2 ring-highlight' : 'border-secondary hover:border-highlight'}`}
      style={{ backgroundColor: color }}
      aria-label={`Select color ${color}`}
    />
  );
};

export default ColorSwatch;
