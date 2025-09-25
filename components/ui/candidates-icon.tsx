import React from "react";

const CandidatesIcon = ({
  size = 20,
  color = "#6A6A6A"
}: {
  size?: string | number;
  color?: string;
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main profile card */}
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Profile avatar */}
      <circle
        cx="8.5"
        cy="10.5"
        r="2.5"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Candidate info lines */}
      <line
        x1="13"
        y1="8.5"
        x2="18"
        y2="8.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="11"
        x2="16.5"
        y2="11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="13.5"
        x2="15"
        y2="13.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Stack indicator - showing multiple candidates */}
      <rect
        x="4.5"
        y="3.5"
        width="15"
        height="1.5"
        rx="0.75"
        fill={color}
        opacity="0.4"
      />
      <rect
        x="6"
        y="2"
        width="12"
        height="1.5"
        rx="0.75"
        fill={color}
        opacity="0.2"
      />
      
      {/* Status indicator dot */}
      <circle
        cx="18.5"
        cy="6.5"
        r="1.5"
        fill={color}
        opacity="0.6"
      />
    </svg>
  );
};

export default CandidatesIcon;