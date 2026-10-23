import React from "react";

interface PulseIconProps {
  className?: string;
  size?: number;
}

/**
 * PULSE official brand mark:
 * An architectural monogram 'P' constructed from ascending survey/poll data bars,
 * integrated with a glowing neon vote checkmark symbolizing verified public opinion.
 */
export function PulseIcon({ className = "h-7 w-7", size }: PulseIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(size ? { width: size, height: size } : {})}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="pulseBarGrad"
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient
          id="pulseCheckGrad"
          x1="12"
          y1="8"
          x2="26"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffe4e6" />
          <stop offset="40%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <filter id="pulseGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="1.5"
            floodColor="#f43f5e"
            floodOpacity="0.75"
          />
        </filter>
      </defs>

      {/* Survey polling bars forming the 'P' framework */}
      <rect x="4" y="15" width="2.5" height="13" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="8" y="10" width="2.5" height="18" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="12" y="5" width="2.5" height="23" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="16" y="5" width="2.5" height="5" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="20" y="6" width="2.5" height="5" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="23.5" y="9" width="2.5" height="9" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="20" y="17" width="2.5" height="5" rx="1.25" fill="url(#pulseBarGrad)" />
      <rect x="16" y="18" width="2.5" height="5" rx="1.25" fill="url(#pulseBarGrad)" />

      {/* Glowing Survey Vote Checkmark in loop of 'P' */}
      <path
        d="M13.5 15.5L17 19L25.5 8.5"
        stroke="url(#pulseCheckGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#pulseGlow)"
      />
    </svg>
  );
}
