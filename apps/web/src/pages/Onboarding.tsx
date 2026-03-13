import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Shield, Network, Lock, Wifi } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useEEG } from '../hooks/useEEG';
import { useIPFS } from '../hooks/useIPFS';

const STEPS = [
  { id: 0, label: 'Welcome', icon: Brain },
  { id: 1, label: 'Connect EEG', icon: Wifi },
  { id: 2, label: 'Create Vault', icon: Lock },
  { id: 3, label: 'Privacy', icon: Shield },
  { id: 4, label: 'Federation', icon: Network },
];

export const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [epsilon, setEpsilon] = useState(0.1);
  const navigate = useNavigate();
  const { connected, connect, connecting } = useEEG();
  const { ready: ipfsReady, peerCount } = useIPFS();

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else navigate('/dashboard');
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Neural network background */}
      <NeuralBackground />

      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div
              key={s.id}
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '2px',
                background: s.id <= step ? 'var(--neural-cyan)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s ease',
              }}
              aria-label={`Step ${s.id + 1}: ${s.label} ${s.id <= step ? '(completed)' : '(pending)'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {step === 0 && <WelcomeStep />}
            {step === 1 && <ConnectEEGStep connected={connected} connecting={connecting} onConnect={connect} />}
            {step === 2 && <CreateVaultStep ipfsReady={ipfsReady} />}
            {step === 3 && (
              <PrivacyStep epsilon={epsilon} onEpsilonChange={setEpsilon} />
            )}
            {step === 4 && <FederationStep peerCount={peerCount} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={prev} aria-label="Previous step">
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button variant="primary" onClick={next} aria-label={step < STEPS.length - 1 ? 'Next step' : 'Enter app'}>
            {step < STEPS.length - 1 ? 'Next →' : 'Enter NeuralCommons →'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const WelcomeStep: React.FC = () => (
  <div className="text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="flex justify-center mb-6"
    >
      <svg viewBox="0 0 80 80" width="80" height="80">
        <polygon
          points="40,4 74,22 74,58 40,76 6,58 6,22"
          fill="none"
          stroke="var(--neural-cyan)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 8px var(--neural-cyan))' }}
        />
        <text x="40" y="50" textAnchor="middle" fill="var(--neural-cyan)" fontFamily="Syne" fontSize="22" fontWeight="800">
          NC
        </text>
      </svg>
    </motion.div>
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        fontWeight: 800,
        color: 'var(--text-primary)',
        marginBottom: '16px',
      }}
    >
      NeuralCommons
    </h1>
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '1rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
        marginBottom: '8px',
      }}
    >
      A decentralized platform for cognitive sovereignty.
    </p>
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}
    >
      Own your neural data. Govern its use. Train AI without giving up privacy.
    </p>
  </div>
);

const ConnectEEGStep: React.FC<{
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
}> = ({ connected, connecting, onConnect }) => (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
      Connect EEG Device
    </h2>
    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
      Connect a Muse 2 headband via Bluetooth, or use our signal simulator.
    </p>

    <div className="space-y-3">
      <div
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${connected ? 'var(--neural-green)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span className={`status-dot ${connected ? 'active' : 'inactive'}`} aria-hidden="true" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: connected ? 'var(--neural-green)' : 'var(--text-muted)' }}>
          {connected ? 'EEG Device Connected' : 'No device connected'}
        </span>
      </div>

      {!connected && (
        <Button
          variant="primary"
          onClick={onConnect}
          loading={connecting}
          style={{ width: '100%' }}
          aria-label="Connect or simulate EEG device"
        >
          {import.meta.env.VITE_SIMULATE_EEG === 'true' ? 'Start Simulation' : 'Connect Muse 2'}
        </Button>
      )}
    </div>
  </div>
);

const CreateVaultStep: React.FC<{ ipfsReady: boolean }> = ({ ipfsReady }) => (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
      Create Neural Vault
    </h2>
    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
      Your vault is a personal encrypted storage on IPFS. Only you hold the keys.
    </p>
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${ipfsReady ? 'var(--neural-green)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
      }}
    >
      <div style={{ color: ipfsReady ? 'var(--neural-green)' : 'var(--text-muted)', marginBottom: '8px' }}>
        {ipfsReady ? '✓ IPFS Node Ready' : '⟳ Connecting to IPFS...'}
      </div>
      <div style={{ color: 'var(--text-secondary)' }}>Encryption: AES-GCM-256</div>
      <div style={{ color: 'var(--text-secondary)' }}>Key storage: Browser memory only</div>
      <div style={{ color: 'var(--text-secondary)' }}>Key derivation: HKDF-SHA256</div>
    </div>
  </div>
);

const PrivacyStep: React.FC<{
  epsilon: number;
  onEpsilonChange: (v: number) => void;
}> = ({ epsilon, onEpsilonChange }) => (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
      Privacy Settings
    </h2>
    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
      Choose your differential privacy budget. Lower ε = stronger privacy but less model accuracy.
    </p>

    <div className="mb-4">
      <label
        htmlFor="epsilon-slider"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}
      >
        EPSILON (ε) = {epsilon.toFixed(2)} — {epsilon <= 0.1 ? 'Strong privacy' : epsilon <= 0.5 ? 'Balanced' : 'More accuracy'}
      </label>
      <input
        id="epsilon-slider"
        type="range"
        min="0.01"
        max="1.0"
        step="0.01"
        value={epsilon}
        onChange={(e) => onEpsilonChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--neural-cyan)' }}
        aria-label="Differential privacy epsilon value"
      />
      <ProgressBar value={epsilon * 100} color={epsilon <= 0.1 ? 'var(--neural-green)' : epsilon <= 0.5 ? 'var(--neural-cyan)' : 'var(--neural-amber)'} />
    </div>

    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
      δ = 1e-5 (fixed) · Gaussian mechanism · RDP composition
    </div>
  </div>
);

const FederationStep: React.FC<{ peerCount: number }> = ({ peerCount }) => (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
      Join Federation
    </h2>
    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
      Connect to the libp2p network and contribute to the shared AI model — without sharing your raw data.
    </p>

    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${peerCount > 0 ? 'var(--neural-teal)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: peerCount > 0 ? 'var(--neural-teal)' : 'var(--text-muted)',
      }}
    >
      {peerCount > 0 ? `✓ ${peerCount} peers discovered` : '⟳ Searching for peers...'}
    </div>

    <div className="mt-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
      <div>Protocol: libp2p GossipSub</div>
      <div>Topic: /neuralcommons/federated/v1</div>
      <div>Privacy: Differential privacy on all gradients</div>
    </div>
  </div>
);

const NeuralBackground: React.FC = () => {
  const nodes = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
  }));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.3,
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        {nodes.map((n, i) => {
          const connected = nodes.slice(i + 1, i + 3);
          return (
            <g key={n.id}>
              {connected.map((c) => (
                <line
                  key={`${n.id}-${c.id}`}
                  x1={`${n.x}%`}
                  y1={`${n.y}%`}
                  x2={`${c.x}%`}
                  y2={`${c.y}%`}
                  stroke="rgba(99,179,237,0.2)"
                  strokeWidth="0.5"
                />
              ))}
              <motion.circle
                cx={`${n.x}%`}
                cy={`${n.y}%`}
                r="3"
                fill="var(--neural-cyan)"
                className="neural-node"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 + n.delay, delay: n.delay }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
