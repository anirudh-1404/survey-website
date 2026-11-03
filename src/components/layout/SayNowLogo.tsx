import React from "react";

interface SayNowLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  size?: number;
}

/**
 * SayNow Official Brand Mark:
 * A modern, stylish neon emblem featuring a bold speech bubble with an integrated
 * dynamic lightning spark / pulse broadcast wave — symbolizing expressing your voice "NOW".
 * Rendered with radiant rose-red neon gradients, crisp white highlights, and subtle glow.
 */
export function SayNowIcon({
  className = "h-8 w-8",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_0_14px_rgba(255,23,77,0.65)] ${className}`}
      {...(size ? { width: size, height: size } : {})}
      aria-hidden="true"
    >
      <defs>
        {/* Vibrant Rose-to-Orange Neon Gradient */}
        <linearGradient
          id="sayNowGradient"
          x1="2"
          y1="2"
          x2="38"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ff4d79" />
          <stop offset="45%" stopColor="#ff174d" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>

        {/* Glow & Spark Gradient */}
        <linearGradient
          id="sayNowSparkGrad"
          x1="12"
          y1="10"
          x2="28"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#ffe4ea" />
          <stop offset="100%" stopColor="#ff174d" />
        </linearGradient>

        <linearGradient
          id="sayNowBubbleFill"
          x1="6"
          y1="6"
          x2="34"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2a0d16" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#120408" stopOpacity="0.9" />
        </linearGradient>

        {/* Subtle drop glow */}
        <filter id="sayNowGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="1.6"
            floodColor="#ff174d"
            floodOpacity="0.8"
          />
        </filter>
      </defs>

      {/* Speech Bubble Base with Tail */}
      <path
        d="M 20 5 C 11.16 5 4 11.72 4 20 C 4 23.45 5.25 26.63 7.38 29.17 L 5.5 35.5 L 12.32 33.72 C 14.65 34.8 17.24 35 20 35 C 28.84 35 36 28.28 36 20 C 36 11.72 28.84 5 20 5 Z"
        fill="url(#sayNowBubbleFill)"
        stroke="url(#sayNowGradient)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Internal "NOW" Dynamic Voice Pulse Waves (Soundwaves / Spark) */}
      <g filter="url(#sayNowGlow)">
        {/* Left Wave Bar */}
        <path
          d="M 13 18 L 13 22"
          stroke="url(#sayNowGradient)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Dynamic Center Voice Bolt ("N / Instant Spark") */}
        <path
          d="M 18 13 L 23 20 L 19 21 L 24 28"
          stroke="url(#sayNowSparkGrad)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Wave Bar */}
        <path
          d="M 28 17 L 28 23"
          stroke="url(#sayNowGradient)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* Ambient Live Broadcast Dot at top-right */}
      <circle cx="29" cy="11" r="2.2" fill="#ff174d" filter="url(#sayNowGlow)" />
      <circle cx="29" cy="11" r="1.1" fill="#ffffff" />
    </svg>
  );
}

/**
 * Full SayNow Brand Typography Logo:
 * Combines the SayNow emblem with sleek, stylish dual-tone typography ("Say" in crisp bright white, "Now" in glowing neon rose).
 */
export function SayNowLogo({
  className = "flex items-center gap-2.5",
  iconClassName = "h-8 w-8",
  textClassName = "text-xl",
  showText = true,
  size,
}: SayNowLogoProps) {
  return (
    <div className={`group select-none inline-flex items-center ${className}`}>
      <SayNowIcon className={iconClassName} size={size} />
      {showText && (
        <span
          className={`font-black tracking-tight leading-none ${textClassName} flex items-baseline`}
        >
          <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-sans">
            Say
          </span>
          <span className="relative ml-0.5 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600 bg-clip-text text-transparent font-extrabold italic tracking-tighter drop-shadow-[0_0_12px_rgba(255,23,77,0.5)]">
            Now
            <span className="inline-block ml-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse align-baseline shadow-[0_0_8px_#ff174d]" />
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Backwards compatibility alias for PulseIcon so existing calls render the new SayNow brand mark.
 */
export const PulseIcon = SayNowIcon;
