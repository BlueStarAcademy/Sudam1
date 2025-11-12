import { useCallback, useRef } from 'react';

/**
 * 버튼 클릭을 1초 동안 스로틀링하는 커스텀 훅
 * 연속 클릭을 방지하여 오류를 예방합니다.
 * 
 * @param onClick 원본 클릭 핸들러
 * @param throttleMs 스로틀 시간 (기본값: 1000ms)
 * @returns 스로틀링된 클릭 핸들러와 현재 비활성화 상태
 */
export const useButtonClickThrottle = (
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>,
    throttleMs: number = 1000
) => {
    const isThrottlingRef = useRef(false);
    const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const throttledOnClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            if (isThrottlingRef.current || !onClick) {
                return;
            }

            // 즉시 스로틀링 시작
            isThrottlingRef.current = true;

            // 기존 타이머가 있으면 클리어
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }

            try {
                // 클릭 핸들러 실행
                const result = onClick(e);
                
                // Promise인 경우 처리
                if (result instanceof Promise) {
                    result.catch((error) => {
                        console.error('[useButtonClickThrottle] Error in onClick handler:', error);
                    }).finally(() => {
                        // Promise 완료 후에도 스로틀링 시간 유지
                        throttleTimerRef.current = setTimeout(() => {
                            isThrottlingRef.current = false;
                            throttleTimerRef.current = null;
                        }, throttleMs);
                    });
                } else {
                    // 동기 함수인 경우
                    throttleTimerRef.current = setTimeout(() => {
                        isThrottlingRef.current = false;
                        throttleTimerRef.current = null;
                    }, throttleMs);
                }
            } catch (error) {
                console.error('[useButtonClickThrottle] Error in onClick handler:', error);
                // 에러 발생 시에도 스로틀링 시간 유지
                throttleTimerRef.current = setTimeout(() => {
                    isThrottlingRef.current = false;
                    throttleTimerRef.current = null;
                }, throttleMs);
            }
        },
        [onClick, throttleMs]
    );

    return {
        onClick: throttledOnClick,
        isThrottling: isThrottlingRef.current,
    };
};

