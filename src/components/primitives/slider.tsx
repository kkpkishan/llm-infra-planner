import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => (
    <input
      type="range"
      className={cn(
        'w-full cursor-pointer appearance-none bg-transparent',
        // Track
        '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
        '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-bg-emphasis',
        // Thumb
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:shadow-sm',
        '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-sm',
        // Focus
        'focus-visible:outline-none [&::-webkit-slider-thumb:focus-visible]:ring-2 [&::-webkit-slider-thumb:focus-visible]:ring-ring',
        // Disabled
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Slider.displayName = 'Slider';

export { Slider };
