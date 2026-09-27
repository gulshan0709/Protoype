import React from "react";
import { useTheme } from "../shared/theme/Theme";

/** Web-only SVG/CSS keeps drag feedback and loading motion off the JS thread. */
export function RefreshIndicator({
  pull,
  refreshing,
}: {
  pull: number;
  refreshing: boolean;
}) {
  const theme = useTheme();
  const progress = Math.min(pull / 90, 1);
  const visible = pull > 0 || refreshing;
  const ready = progress === 1;
  return (
    <>
      <style>{`
        .vizenta-refresh { display:flex; align-items:center; gap:12px; padding:10px 18px 10px 10px;
          border:1px solid; border-radius:999px; pointer-events:none; font-family:Inter,system-ui,sans-serif;
          will-change:transform,opacity; transition:transform 240ms cubic-bezier(.2,.8,.2,1),opacity 180ms ease,box-shadow 240ms ease; }
        .vizenta-refresh[data-dragging="true"] { transition:transform 70ms linear,opacity 120ms ease,box-shadow 240ms ease; }
        .vizenta-refresh-icon { position:relative; display:grid; place-items:center; width:38px; height:38px; flex-shrink:0; }
        .vizenta-refresh-ring { position:absolute; inset:0; transform:rotate(-90deg); }
        .vizenta-refresh-progress { transition:stroke-dashoffset 80ms linear; }
        .vizenta-refresh-arrow { transition:transform 220ms cubic-bezier(.2,.8,.2,1); }
        .vizenta-refresh[data-ready="true"] .vizenta-refresh-arrow { transform:rotate(180deg); }
        .vizenta-refresh[data-loading="true"] .vizenta-refresh-ring { animation:vizenta-refresh-orbit 850ms linear infinite; }
        .vizenta-refresh[data-loading="true"] .vizenta-refresh-center { animation:vizenta-refresh-breathe 1300ms ease-in-out infinite; transform-origin:center; }
        .vizenta-refresh-label { font-size:12px; font-weight:600; letter-spacing:.1px; white-space:nowrap; }
        @keyframes vizenta-refresh-orbit { to { transform:rotate(270deg); } }
        @keyframes vizenta-refresh-breathe { 0%,100% { opacity:.55; transform:scale(.82); } 50% { opacity:1; transform:scale(1); } }
        @media (prefers-reduced-motion:reduce) {
          .vizenta-refresh,.vizenta-refresh * { animation:none !important; transition:none !important; }
        }
      `}</style>
      <div
        className="vizenta-refresh"
        data-testid="pull-refresh-status"
        data-dragging={pull > 0 && !refreshing}
        data-ready={ready}
        data-loading={refreshing}
        role="status"
        aria-live="polite"
        aria-hidden={!visible}
        style={{
          color: theme.text,
          background: theme.surface,
          borderColor: ready || refreshing ? theme.link : theme.border,
          boxShadow: visible
            ? `0 8px 28px ${theme.overlay}, 0 0 0 4px ${theme.link}12`
            : "none",
          opacity: visible ? 1 : 0,
          transform: visible
            ? `translateY(${refreshing ? 16 : Math.min(pull * 0.2, 24)}px) scale(${refreshing ? 1 : 0.85 + progress * 0.15})`
            : "translateY(-70px) scale(.8)",
        }}
      >
        <span className="vizenta-refresh-icon" aria-hidden="true">
          <svg
            className="vizenta-refresh-ring"
            viewBox="0 0 38 38"
            width="38"
            height="38"
            fill="none"
          >
            <circle
              cx="19"
              cy="19"
              r="16"
              stroke={theme.border}
              strokeWidth="2.5"
            />
            <circle
              className="vizenta-refresh-progress"
              cx="19"
              cy="19"
              r="16"
              stroke={theme.link}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="100.53"
              strokeDashoffset={100.53 * (1 - (refreshing ? 0.72 : progress))}
            />
          </svg>
          {refreshing ? (
            <svg
              className="vizenta-refresh-center"
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
            >
              <path
                d="m4 5 6 11 6-11"
                stroke={theme.link}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              className="vizenta-refresh-arrow"
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
            >
              <path
                d="M10 4v12m-5-5 5 5 5-5"
                stroke={theme.link}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="vizenta-refresh-label">
          {refreshing
            ? "Refreshing…"
            : ready
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
    </>
  );
}
