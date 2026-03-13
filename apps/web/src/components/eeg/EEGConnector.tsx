import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Bluetooth, Zap } from 'lucide-react';
import { useEEG } from '../../hooks/useEEG';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const EEGConnector: React.FC = () => {
  const { connected, connecting, connect, disconnect } = useEEG();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={connected ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Brain size={20} color={connected ? 'var(--neural-green)' : 'var(--text-muted)'} />
          </motion.div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700 }}>
              EEG Device
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        {connected && <Badge variant="green">LIVE</Badge>}
      </div>

      {error && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--neural-red)',
            marginBottom: '12px',
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {!connected ? (
          <>
            <Button
              variant="primary"
              onClick={handleConnect}
              loading={connecting}
              disabled={connecting}
              aria-label="Connect EEG device via Bluetooth"
            >
              <Bluetooth size={12} className="mr-1" />
              Connect Muse 2
            </Button>
            <Button
              variant="secondary"
              onClick={handleConnect}
              loading={connecting}
              aria-label="Start EEG simulation"
            >
              <Zap size={12} className="mr-1" />
              Simulate
            </Button>
          </>
        ) : (
          <Button
            variant="danger"
            onClick={disconnect}
            aria-label="Disconnect EEG device"
          >
            Disconnect
          </Button>
        )}
      </div>
    </Card>
  );
};
