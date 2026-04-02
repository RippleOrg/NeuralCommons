import React, { useEffect, useState } from 'react';
import { serializeGradients } from '../../lib/federated/model';

interface LayerCell {
  layer: string;
  value: number;
}

interface GradientVisualizerProps {
  rounds: number;
  model: unknown | null;
}

export const GradientVisualizer: React.FC<GradientVisualizerProps> = ({ rounds, model }) => {
  const [cells, setCells] = useState<LayerCell[]>([]);

  useEffect(() => {
    if (!model) {
      setCells([]);
      return;
    }

    const serialized = serializeGradients(model as never);
    const newCells = Object.entries(serialized.weights).map(([layer, values]) => ({
      layer,
      value: values.length
        ? values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length
        : 0,
    }));
    setCells(newCells);
  }, [model, rounds]);

  const maxVal = Math.max(...cells.map((c) => c.value), 0.001);

  const getColor = (value: number) => {
    const t = Math.min(1, value / maxVal);
    if (t < 0.33) return `rgba(99,179,237,${0.2 + t * 0.8})`;
    if (t < 0.66) return `rgba(246,173,85,${0.2 + t * 0.8})`;
    return `rgba(252,129,129,${0.2 + t * 0.8})`;
  };

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Gradient Magnitudes — Round #{rounds}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
        }}
        role="img"
        aria-label="Gradient magnitude heatmap"
      >
        {cells.map((cell) => (
          <div
            key={cell.layer}
            title={`${cell.layer}: ${cell.value.toFixed(4)}`}
            style={{
              height: '40px',
              background: getColor(cell.value),
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.5s ease',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                padding: '2px',
              }}
            >
              {cell.layer.split('/')[0].slice(0, 7)}
            </span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-between mt-2">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--neural-cyan)' }}>low</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--neural-amber)' }}>med</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--neural-red)' }}>high</span>
      </div>
    </div>
  );
};
