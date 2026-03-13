import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEEGStore } from '../../store/eegStore';
import type { FlowStateMode } from '../../types/eeg';

const STATE_COLORS: Record<FlowStateMode, string> = {
  flow: 'var(--neural-cyan)',
  focus: 'var(--neural-teal)',
  relaxed: 'var(--neural-green)',
  stressed: 'var(--neural-red)',
  neutral: 'var(--text-muted)',
};

const STATE_LABELS: Record<FlowStateMode, string> = {
  flow: 'FLOW',
  focus: 'FOCUS',
  relaxed: 'RELAX',
  stressed: 'STRESS',
  neutral: 'NEUTRAL',
};

const BAND_LABELS: Array<'delta' | 'theta' | 'alpha' | 'beta' | 'gamma'> = [
  'delta', 'theta', 'alpha', 'beta', 'gamma',
];

const SIZE = 180;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 72;

function polarToXY(angle: number, radius: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arcPath(startAngle: number, endAngle: number, radius: number) {
  const start = polarToXY(startAngle, radius);
  const end = polarToXY(endAngle, radius);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export const FlowStateIndicator: React.FC = () => {
  const { flowState, bandPowers } = useEEGStore();

  const state = flowState?.state ?? 'neutral';
  const confidence = flowState?.confidence ?? 0;
  const color = STATE_COLORS[state];
  const arcEndAngle = -120 + confidence * 240;

  const maxBandPower = Math.max(...Object.values(bandPowers), 0.001);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label={`Flow state: ${state}, confidence: ${Math.round(confidence * 100)}%`}
        role="img"
      >
        {/* Background arc */}
        <path
          d={arcPath(-120, 120, R)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />

        {/* Confidence arc */}
        <motion.path
          d={arcPath(-120, arcEndAngle, R)}
          stroke={color}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          animate={{ d: arcPath(-120, arcEndAngle, R) }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />

        {/* Center glow */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={28}
          fill={color}
          fillOpacity={0.08}
          animate={{ r: [28, 32, 28] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />

        {/* State label */}
        <AnimatePresence mode="wait">
          <motion.text
            key={state}
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            fill={color}
            fontFamily="Syne, sans-serif"
            fontSize="14"
            fontWeight="800"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {STATE_LABELS[state]}
          </motion.text>
        </AnimatePresence>

        {/* Confidence percentage */}
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontFamily="Space Mono, monospace"
          fontSize="9"
        >
          {Math.round(confidence * 100)}%
        </text>
      </svg>

      {/* Band contribution bars */}
      <div style={{ width: '100%', maxWidth: '180px' }}>
        {BAND_LABELS.map((band) => {
          const power = bandPowers[band] ?? 0;
          const pct = Math.min(100, (power / maxBandPower) * 100);
          return (
            <div key={band} className="flex items-center gap-2 mb-1">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  width: '32px',
                  textTransform: 'uppercase',
                }}
              >
                {band.slice(0, 3)}
              </span>
              <div
                style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                  style={{
                    height: '100%',
                    background: color,
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
