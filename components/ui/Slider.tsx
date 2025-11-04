import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({ value, min, max, step = 1, onChange, disabled = false }) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer disabled:opacity-50"
    />
  );
};

export default Slider;
