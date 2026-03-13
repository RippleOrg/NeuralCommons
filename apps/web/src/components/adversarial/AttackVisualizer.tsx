import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdversarial } from '../../hooks/useAdversarial';

const NODES = [
  { id: 'eeg', label: 'EEG INPUT', x: 60, y: 120 },
  { id: 'dp', label: 'DP LAYER', x: 200, y: 120 },
  { id: 'model', label: 'MODEL', x: 340, y: 80 },
  { id: 'fed', label: 'FEDERATION', x: 340, y: 160 },
  { id: 'ipfs', label: 'IPFS', x: 480, y: 120 },
];

const EDGES = [
  { from: 'eeg', to: 'dp' },
  { from: 'dp', to: 'model' },
  { from: 'dp', to: 'fed' },
  { from: 'model', to: 'ipfs' },
  { from: 'fed', to: 'ipfs' },
];

export const AttackVisualizer: React.FC = () => {
  const { currentAttack, simulationResult, simulating } = useAdversarial();
  const [attackedNodes, setAttackedNodes] = useState<Set<string>>(new Set());
  const [defendedNodes, setDefendedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (simulating && currentAttack) {
      let attacked: string[] = [];
      switch (currentAttack) {
        case 'data_poisoning':
          attacked = ['fed', 'model'];
          break;
        case 'model_inversion':
          attacked = ['model', 'ipfs'];
          break;
        case 'gradient_leakage':
          attacked = ['dp', 'fed'];
          break;
      }
      setAttackedNodes(new Set(attacked));
      setDefendedNodes(new Set());
    }
  }, [simulating, currentAttack]);

  useEffect(() => {
    if (simulationResult && !simulating) {
      setTimeout(() => {
        setDefendedNodes(new Set(attackedNodes));
        setTimeout(() => {
          setAttackedNodes(new Set());
          setDefendedNodes(new Set());
        }, 3000);
      }, 500);
    }
  }, [simulationResult, simulating, attackedNodes]);

  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

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
        System Architecture — Attack Propagation
      </div>
      <svg
        width="100%"
        viewBox="0 0 560 240"
        aria-label="Attack visualization diagram"
        role="img"
        style={{ overflow: 'visible' }}
      >
        {/* Edges */}
        {EDGES.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const isAttacked = attackedNodes.has(edge.from) || attackedNodes.has(edge.to);
          const isDefended = defendedNodes.has(edge.from) || defendedNodes.has(edge.to);

          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={from.x + 40}
              y1={from.y + 16}
              x2={to.x}
              y2={to.y + 16}
              stroke={isDefended ? 'var(--neural-green)' : isAttacked ? 'var(--neural-red)' : 'var(--border-active)'}
              strokeWidth={isAttacked || isDefended ? 2 : 1}
              animate={{
                stroke: isDefended ? 'var(--neural-green)' : isAttacked ? 'var(--neural-red)' : 'var(--border-active)',
              }}
              transition={{ duration: 0.3 }}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isAttacked = attackedNodes.has(node.id);
          const isDefended = defendedNodes.has(node.id);
          const color = isDefended
            ? 'var(--neural-green)'
            : isAttacked
            ? 'var(--neural-red)'
            : 'var(--border-active)';

          return (
            <g key={node.id}>
              <motion.rect
                x={node.x}
                y={node.y}
                width={80}
                height={32}
                rx={6}
                fill={
                  isDefended
                    ? 'rgba(104,211,145,0.1)'
                    : isAttacked
                    ? 'rgba(252,129,129,0.15)'
                    : 'var(--bg-elevated)'
                }
                stroke={color}
                strokeWidth={1.5}
                animate={{ stroke: color }}
                transition={{ duration: 0.3 }}
                style={{
                  filter: (isAttacked || isDefended) ? `drop-shadow(0 0 6px ${color})` : 'none',
                }}
              />
              <text
                x={node.x + 40}
                y={node.y + 20}
                textAnchor="middle"
                fill={color}
                fontFamily="Space Mono, monospace"
                fontSize="8"
                fontWeight="700"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
