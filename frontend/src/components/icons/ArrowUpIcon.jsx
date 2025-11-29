import React from 'react';

const ArrowUpIcon = ({ size = 24, color = '#fff', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Arrow chevron/caret at top */}
      <path
        d="M4 15L12 7L20 15"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertical shaft - Made longer by extending from 7 to 21 (was 20) */}
      <path
        d="M12 7V50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ArrowUpIcon;
