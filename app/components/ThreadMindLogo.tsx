import { useEffect, useRef } from "react";

interface ThreadMindLogoProps {
  size?: number;
  className?: string;
}

// Persists across Remix client-side navigations (module is not re-executed).
// Resets only on a full page reload — exactly when we want the animation to play.
let hasAnimated = false;

export default function ThreadMindLogo({
  size = 32,
  className = "",
}: ThreadMindLogoProps) {
  const shouldAnimate = !hasAnimated;
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      hasAnimated = true;
    }
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ThreadMind logo"
      role="img"
    >
      {shouldAnimate && (
        <style>{`
          @keyframes tm-draw-thread {
            from { stroke-dashoffset: 60; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes tm-fade-eye {
            from { opacity: 0; transform: scaleX(0.6); }
            to   { opacity: 1; transform: scaleX(1); }
          }
          .tm-eye {
            transform-origin: 16px 16px;
            animation: tm-fade-eye 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0s both;
          }
          .tm-thread {
            stroke-dasharray: 60;
            stroke-dashoffset: 0;
            animation: tm-draw-thread 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
          }
        `}</style>
      )}

      {/* Background: deep navy — editorial, not generic */}
      <rect width="32" height="32" rx="7" fill="#0D1B2A" />

      {/* Needle eye: horizontal ellipse — precision, focus */}
      <ellipse
        cx="16"
        cy="16"
        rx="8.5"
        ry="3.75"
        stroke="rgba(255, 255, 255, 0.80)"
        strokeWidth="1.5"
        className={shouldAnimate ? "tm-eye" : undefined}
      />

      {/* Thread: amber sine-wave passing through the eye */}
      {/* Extends outside the ellipse on both sides — like a real thread through a needle */}
      <path
        d="M 2.5 16 C 6.5 10.5 10.5 21.5 16 16 C 21.5 10.5 25.5 21.5 29.5 16"
        stroke="#F59E0B"
        strokeWidth="1.75"
        strokeLinecap="round"
        pathLength="60"
        className={shouldAnimate ? "tm-thread" : undefined}
      />

      {/* Central node: the mind at the thread's inflection */}
      <circle cx="16" cy="16" r="1.5" fill="#F59E0B" opacity="0.9" />
    </svg>
  );
}
