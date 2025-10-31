
import React from 'react';

type ColorScheme = 'blue' | 'red' | 'gray' | 'green' | 'yellow' | 'purple' | 'orange' | 'accent';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  colorScheme?: ColorScheme;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  colorScheme = 'accent',
  disabled = false,
  className = '',
  type = 'button',
  title
}) => {
  const baseClasses = "px-4 py-2 font-bold rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary disabled:bg-secondary disabled:opacity-70 disabled:cursor-not-allowed";

  const colorClasses: Record<ColorScheme, string> = {
    accent: 'bg-accent hover:bg-accent-hover text-white focus:ring-accent',
    blue: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400',
    red: 'bg-danger hover:bg-danger-hover text-white focus:ring-red-400',
    gray: 'bg-secondary hover:bg-tertiary text-secondary focus:ring-color',
    green: 'bg-success hover:opacity-90 text-white focus:ring-green-400',
    yellow: 'bg-yellow-500 hover:bg-yellow-400 text-black focus:ring-yellow-300',
    purple: 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-400',
    orange: 'bg-orange-500 hover:bg-orange-400 text-white focus:ring-orange-300',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${colorClasses[colorScheme]} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button;
