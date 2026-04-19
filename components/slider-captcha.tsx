'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SliderCaptchaProps {
  onSuccess: () => void;
  onReset?: () => void;
}

export function SliderCaptcha({ onSuccess, onReset }: SliderCaptchaProps) {
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [verified, setVerified] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const sliderWidth = 40;
  const trackPadding = 2;
  const maxSlide = 220;

  const handleStart = useCallback((clientX: number) => {
    if (verified) return;
    setIsDragging(true);
    setStartTime(Date.now());
    startXRef.current = clientX - sliderX;
  }, [sliderX, verified]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || verified) return;
    let newX = clientX - startXRef.current;
    newX = Math.max(0, Math.min(newX, maxSlide));
    setSliderX(newX);
  }, [isDragging, verified]);

  const handleEnd = useCallback(() => {
    if (!isDragging || verified) return;
    setIsDragging(false);

    const elapsed = Date.now() - startTime;
    const progress = sliderX / maxSlide;

    // 验证逻辑：滑到90%以上且用时超过300ms
    if (progress >= 0.9 && elapsed > 300) {
      setVerified(true);
      setSliderX(maxSlide);
      onSuccess();
    } else {
      // 验证失败，弹回
      setSliderX(0);
    }
  }, [isDragging, verified, sliderX, startTime, onSuccess]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Global mouse/touch up
  useEffect(() => {
    const onGlobalMove = (e: MouseEvent) => handleMove(e.clientX);
    const onGlobalUp = () => handleEnd();
    const onGlobalTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onGlobalTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onGlobalMove);
      window.addEventListener('mouseup', onGlobalUp);
      window.addEventListener('touchmove', onGlobalTouchMove);
      window.addEventListener('touchend', onGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('mouseup', onGlobalUp);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const progress = sliderX / maxSlide;

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        className="relative w-full h-10 rounded-md overflow-hidden bg-muted border border-border"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Background fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-md transition-colors duration-200"
          style={{
            width: `${sliderX + sliderWidth / 2}px`,
            background: verified
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #3b82f6, #6366f1)',
          }}
        />

        {/* Text hint */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-sm font-medium transition-opacity duration-200 ${
              verified ? 'text-white opacity-100' : progress > 0.3 ? 'opacity-0' : 'text-muted-foreground'
            }`}
          >
            {verified ? '✓ 验证成功' : '请拖动滑块完成验证'}
          </span>
        </div>

        {/* Puzzle pieces decoration */}
        {!verified && progress > 0.1 && (
          <>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm border-2 border-white/60 bg-white/20"
              style={{ left: `${progress * 60 + 20}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border-2 border-white/40 bg-white/10"
              style={{ left: `${progress * 40 + 50}%` }}
            />
          </>
        )}

        {/* Slider thumb */}
        <div
          className={`absolute top-0 h-full flex items-center justify-center cursor-grab active:cursor-grabbing rounded-md shadow-md transition-colors duration-200 ${
            verified
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-white hover:bg-gray-50 border border-gray-200'
          }`}
          style={{
            width: `${sliderWidth}px`,
            left: `${sliderX + trackPadding}px`,
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className={`flex flex-col items-center gap-0.5 ${verified ? 'text-white' : 'text-gray-400'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {verified ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <polyline points="15 18 9 12 15 6" />
                  <line x1="9" y1="12" x2="21" y2="12" />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
