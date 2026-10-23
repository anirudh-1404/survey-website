import React from "react";

interface PulseIconProps {
  className?: string;
  size?: number;
}

/**
 * PULSE Official Brand Mark — Concept B (Opinion Radar & Pulse Scanner):
 * A high-tech circular radar dial tracking live civic sentiment and public opinions,
 * rendered in vibrant glowing neon rose with active radar sweep optics.
 */
export function PulseIcon({ className = "h-8 w-8", size }: PulseIconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_0_12px_rgba(255,30,86,0.7)] ${className}`}
      {...(size ? { width: size, height: size } : {})}
      aria-hidden="true"
    >
      <defs>
        {/* Radiant Neon Rose Gradients */}
        <linearGradient
          id="radarNeonGrad"
          x1="4"
          y1="4"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ff4d79" />
          <stop offset="50%" stopColor="#ff174d" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>

        <linearGradient
          id="radarBeamGrad"
          x1="18"
          y1="18"
          x2="30"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#ff6584" />
          <stop offset="100%" stopColor="#ff174d" />
        </linearGradient>

        {/* Ambient Neon Glow Filter */}
        <filter id="radarNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="1.8"
            floodColor="#ff174d"
            floodOpacity="0.85"
          />
        </filter>

        {/* Sweep Sector Glow */}
        <radialGradient
          id="radarSweepAura"
          cx="18"
          cy="18"
          r="15"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ff174d" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#ff174d" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ff174d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle Ambient Pulse Background */}
      <circle cx="18" cy="18" r="15.5" fill="url(#radarSweepAura)" />

      {/* Concentric Radar Circles with Active Scanning Notch */}
      <g filter="url(#radarNeonGlow)">
        {/* Outer Ring (with scanner aperture notch at top-right ~45 deg) */}
        <path
          d="M 27 9 A 14.5 14.5 0 1 0 29.5 13.5"
          stroke="url(#radarNeonGrad)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Middle Ring */}
        <circle
          cx="18"
          cy="18"
          r="10"
          stroke="url(#radarNeonGrad)"
          strokeWidth="2.2"
          strokeOpacity="0.95"
        />

        {/* Inner Ring */}
        <circle
          cx="18"
          cy="18"
          r="5.5"
          stroke="url(#radarNeonGrad)"
          strokeWidth="2.0"
          strokeOpacity="0.9"
        />

        {/* Radar Alignment Coordinates / Data Points */}
        <circle cx="18" cy="8" r="1.2" fill="#ff7597" />
        <circle cx="18" cy="28" r="1.2" fill="#ff7597" />
        <circle cx="8" cy="18" r="1.2" fill="#ff7597" />
        <circle cx="28" cy="18" r="1.2" fill="#ff7597" />

        {/* Dynamic Sweeping Radar Beam (Angle 45°) */}
        <line
          x1="18"
          y1="18"
          x2="28.5"
          y2="7.5"
          stroke="url(#radarBeamGrad)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>

      {/* Center Emitter Core (Dual Layer for Brilliant White Hot-Center) */}
      <circle
        cx="18"
        cy="18"
        r="3.2"
        fill="#ff174d"
        filter="url(#radarNeonGlow)"
      />
      <circle cx="18" cy="18" r="1.5" fill="#ffffff" />
    </svg>
  );
}
