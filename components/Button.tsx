
import React, { useEffect, useMemo, useRef, useState, isValidElement } from 'react';

type ColorScheme = 'blue' | 'red' | 'gray' | 'green' | 'yellow' | 'purple' | 'orange' | 'accent' | 'none';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  colorScheme?: ColorScheme;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  style?: React.CSSProperties;
  cooldownMs?: number;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  colorScheme = 'accent',
  disabled = false,
  className = '',
  type = 'button',
  title,
  style,
  cooldownMs = 1000
}) => {
  const baseClasses = "px-4 py-2 font-bold rounded-lg transition-all duration-150 ease-in-out border-2 border-amber-400/60 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)] active:translate-y-0.5 active:shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-primary disabled:bg-secondary disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap overflow-hidden";

  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  // 버튼 텍스트 크기 자동 조정 (단순 텍스트일 때만)
  useEffect(() => {
    // children이 단순한 문자열이나 숫자인지 확인
    // React 요소(JSX)나 배열이 포함된 경우는 폰트 크기 조정하지 않음
    const isSimpleText = (typeof children === 'string' || typeof children === 'number') && 
                         !isValidElement(children) && 
                         !Array.isArray(children);
    
    // 복잡한 JSX 구조(진행도 바, 아이콘 등)가 포함된 경우는 폰트 크기 조정하지 않음
    if (!isSimpleText) return;
    
    const adjustFontSize = () => {
      if (!buttonRef.current || !textRef.current) return;
      
      const button = buttonRef.current;
      const text = textRef.current;
      
      // 초기 폰트 크기 설정
      const baseFontSize = style?.fontSize || 'clamp(0.75rem, 2vw, 1rem)';
      if (typeof baseFontSize === 'string' && baseFontSize.includes('clamp')) {
        // clamp 값 파싱
        const match = baseFontSize.match(/clamp\(([^,]+),([^,]+),([^)]+)\)/);
        if (match) {
          const minSize = parseFloat(match[1].replace('rem', '').trim()) * 16; // rem to px
          const maxSize = parseFloat(match[3].replace('rem', '').trim()) * 16; // rem to px
          
          // 최대 크기부터 시작
          text.style.fontSize = `${maxSize}px`;
          
          // 텍스트가 버튼을 넘치면 크기 줄이기
          let fontSize = maxSize;
          while (text.scrollWidth > button.clientWidth && fontSize > minSize) {
            fontSize -= 1;
            text.style.fontSize = `${fontSize}px`;
          }
        }
      } else {
        // clamp가 아닌 경우 기본 로직
        let fontSize = 16; // 기본 1rem
        text.style.fontSize = `${fontSize}px`;
        
        while (text.scrollWidth > button.clientWidth && fontSize > 10) {
          fontSize -= 0.5;
          text.style.fontSize = `${fontSize}px`;
        }
      }
    };

    adjustFontSize();
    
    // 리사이즈 이벤트 리스너 추가
    const resizeObserver = new ResizeObserver(adjustFontSize);
    if (buttonRef.current) {
      resizeObserver.observe(buttonRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, style]);

  const handleClick = useMemo(() => {
    if (!onClick) return undefined;

    return (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isCoolingDown) return;

      setIsCoolingDown(true);
      try {
        const maybePromise = onClick(event);
        Promise.resolve(maybePromise).finally(() => {
          cooldownTimerRef.current = setTimeout(() => setIsCoolingDown(false), cooldownMs);
        });
      } catch (error) {
        cooldownTimerRef.current = setTimeout(() => setIsCoolingDown(false), cooldownMs);
        throw error;
      }
    };
  }, [onClick, disabled, isCoolingDown, cooldownMs]);

  const colorClasses: Record<ColorScheme, string> = {
    accent: 'bg-accent hover:bg-accent-hover text-white focus:ring-accent',
    blue: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400',
    red: 'bg-danger hover:bg-danger-hover text-white focus:ring-red-400',
    gray: 'bg-secondary hover:bg-tertiary text-secondary focus:ring-color',
    green: 'bg-success hover:opacity-90 text-white focus:ring-green-400',
    yellow: 'bg-yellow-500 hover:bg-yellow-400 text-black focus:ring-yellow-300',
    purple: 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-400',
    orange: 'bg-orange-500 hover:bg-orange-400 text-white focus:ring-orange-300',
    none: '', // 'none'은 className으로 스타일을 직접 지정할 때 사용
  };

  // 기본 폰트 크기 스타일 (반응형으로 조정, 고급스러운 크기)
  const defaultStyle: React.CSSProperties = {
    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
    fontWeight: 600,
    letterSpacing: '0.025em',
    ...style
  };

  // children이 복잡한 JSX 구조인지 확인
  const hasComplexChildren = Array.isArray(children) || isValidElement(children) || 
    (typeof children === 'object' && children !== null && !(typeof children === 'string' || typeof children === 'number'));

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      disabled={disabled || isCoolingDown}
      className={`${baseClasses} ${colorClasses[colorScheme]} ${className}`}
      title={title}
      style={defaultStyle}
    >
      {hasComplexChildren ? (
        children
      ) : (
        <span ref={textRef} className="inline-block">
          {children}
        </span>
      )}
    </button>
  );
};

export default Button;
