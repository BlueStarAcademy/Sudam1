import React from 'react';
import Button from '../Button.js';

type ButtonProps = React.ComponentProps<typeof Button>;

type ResourceVariant = 'gold' | 'diamonds' | 'action' | 'materials' | 'accent' | 'neutral';

interface ResourceActionButtonProps extends Omit<ButtonProps, 'colorScheme'> {
    variant?: ResourceVariant;
}

const VARIANT_CLASSES: Record<ResourceVariant, { base: string; hover: string }> = {
    gold: {
        base: 'border-amber-300 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 text-slate-900 shadow-[0_18px_40px_-20px_rgba(251,191,36,0.85)]',
        hover: 'hover:from-amber-300 hover:via-amber-200 hover:to-amber-500',
    },
    diamonds: {
        base: 'border-sky-300 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-slate-100 shadow-[0_18px_42px_-20px_rgba(56,189,248,0.85)]',
        hover: 'hover:from-sky-300 hover:via-blue-400 hover:to-indigo-500',
    },
    action: {
        base: 'border-cyan-300 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-900 shadow-[0_18px_42px_-20px_rgba(34,211,238,0.75)]',
        hover: 'hover:from-cyan-300 hover:via-sky-300 hover:to-blue-400',
    },
    materials: {
        base: 'border-emerald-300 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-600 text-slate-900 shadow-[0_18px_42px_-20px_rgba(16,185,129,0.8)]',
        hover: 'hover:from-emerald-300 hover:via-lime-300 hover:to-emerald-500',
    },
    accent: {
        base: 'border-fuchsia-300 bg-gradient-to-r from-fuchsia-400 via-rose-400 to-amber-400 text-white shadow-[0_18px_44px_-18px_rgba(244,114,182,0.75)]',
        hover: 'hover:from-fuchsia-300 hover:via-rose-300 hover:to-amber-300',
    },
    neutral: {
        base: 'border-slate-400 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-slate-100 shadow-[0_18px_40px_-22px_rgba(148,163,184,0.75)]',
        hover: 'hover:from-slate-500 hover:via-slate-600 hover:to-slate-700',
    },
};

const disabledClasses = 'opacity-55 cursor-not-allowed saturate-75 shadow-none';

const ResourceActionButton: React.FC<ResourceActionButtonProps> = ({
    variant = 'gold',
    className = '',
    disabled,
    children,
    ...rest
}) => {
    const { base, hover } = VARIANT_CLASSES[variant];
    const composedClassName = [
        'w-full justify-center rounded-xl font-semibold tracking-wide transition-all duration-200 px-4 py-2 border',
        base,
        !disabled ? hover : disabledClasses,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <Button
            colorScheme="none"
            disabled={disabled}
            className={composedClassName}
            {...rest}
        >
            {children}
        </Button>
    );
};

export default ResourceActionButton;

