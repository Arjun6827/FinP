import React, { useState } from 'react';

/**
 * Premium Tooltip Component
 * Usage: <Tooltip text="Your tooltip text" position="top|bottom|left|right">
 *          <button>Hover me</button>
 *        </Tooltip>
 */
export default function Tooltip({ text, position = 'top', children }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[6px] border-t-[#1e293b] border-x-[5px] border-x-transparent border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[6px] border-b-[#1e293b] border-x-[5px] border-x-transparent border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[6px] border-l-[#1e293b] border-y-[5px] border-y-transparent border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[6px] border-r-[#1e293b] border-y-[5px] border-y-transparent border-l-0',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div
          className={`absolute z-[9999] pointer-events-none ${positionClasses[position]}`}
          style={{ animation: 'tooltipFadeIn 0.15s ease-out forwards' }}
        >
          {/* Tooltip Box */}
          <div className="bg-[#1e293b] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap tracking-wide">
            {text}
          </div>
          {/* Arrow */}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
