import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label, disabled = false }) => {
  const toggleId = React.useId();

  return (
    <label htmlFor={toggleId} className={`flex items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <div className="relative">
        <input 
          id={toggleId}
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={e => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={`block w-12 h-6 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-secondary'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
      </div>
      {label && <span className="ml-3 text-secondary font-medium">{label}</span>}
    </label>
  );
};

export default ToggleSwitch;
