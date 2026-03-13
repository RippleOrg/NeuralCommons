import { useState, useCallback, useRef } from 'react';
import { useUIStore } from '../store/uiStore';

export type AttackType = 'data_poisoning' | 'model_inversion' | 'gradient_leakage';

export interface AttackSimulationResult {
  attackType: AttackType;
  attackSuccess: boolean;
  detectedAt: number;
  defenseActivated: string;
  privacyBudgetProtected: number;
  gradientRejectionRate: number;
  logs: AttackLog[];
}

export interface AttackLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface AdversarialMetrics {
  attacksDetected: number;
  gradientsRejected: number;
  privacyBudgetProtected: number;
  falsePositiveRate: number;
}

export function useAdversarial() {
  const uiStore = useUIStore();
  const [simulating, setSimulating] = useState(false);
  const [currentAttack, setCurrentAttack] = useState<AttackType | null>(null);
  const [simulationResult, setSimulationResult] = useState<AttackSimulationResult | null>(null);
  const [metrics, setMetrics] = useState<AdversarialMetrics>({
    attacksDetected: 0,
    gradientsRejected: 0,
    privacyBudgetProtected: 0,
    falsePositiveRate: 0.02,
  });
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const logRef = useRef<AttackLog[]>([]);

  const addLog = useCallback((level: AttackLog['level'], message: string) => {
    const log: AttackLog = { timestamp: Date.now(), level, message };
    logRef.current = [...logRef.current.slice(-100), log];
    setLogs([...logRef.current]);
  }, []);

  const simulateAttack = useCallback(
    async (attackType: AttackType): Promise<AttackSimulationResult> => {
      setSimulating(true);
      setCurrentAttack(attackType);
      logRef.current = [];

      try {
        addLog('warn', `[ATTACK] Initiating ${attackType.replace(/_/g, ' ')} attack...`);
        await delay(300);

        let result: AttackSimulationResult;

        switch (attackType) {
          case 'data_poisoning':
            result = await simulateDataPoisoning(addLog);
            break;
          case 'model_inversion':
            result = await simulateModelInversion(addLog);
            break;
          case 'gradient_leakage':
            result = await simulateGradientLeakage(addLog);
            break;
        }

        setSimulationResult(result);
        setMetrics((prev) => ({
          attacksDetected: prev.attacksDetected + (result.detectedAt > 0 ? 1 : 0),
          gradientsRejected: prev.gradientsRejected + Math.floor(result.gradientRejectionRate * 100),
          privacyBudgetProtected: prev.privacyBudgetProtected + result.privacyBudgetProtected,
          falsePositiveRate: prev.falsePositiveRate,
        }));

        uiStore.addToast(
          result.attackSuccess
            ? `⚠ Attack partially succeeded: ${attackType}`
            : `✓ Attack neutralized: ${attackType}`,
          result.attackSuccess ? 'warning' : 'success'
        );

        return result;
      } finally {
        setSimulating(false);
        setCurrentAttack(null);
      }
    },
    [addLog, uiStore]
  );

  return {
    simulating,
    currentAttack,
    simulationResult,
    metrics,
    logs,
    simulateAttack,
  };
}

async function simulateDataPoisoning(addLog: (level: AttackLog['level'], message: string) => void): Promise<AttackSimulationResult> {
  addLog('error', '[ATTACK] Injecting malicious gradients into federation pool...');
  await delay(400);
  addLog('warn', '[DETECT] Anomaly detection triggered: gradient norm 8.4σ above threshold');
  await delay(300);
  addLog('info', '[DEFENSE] DP clipping applied: gradient norm bounded to L2=1.0');
  await delay(200);
  addLog('info', '[DEFENSE] Federated aggregation using robust FedAvg with outlier rejection');
  await delay(300);
  addLog('success', '[BLOCKED] 94.3% of poisoned gradients neutralized by DP noise');

  return {
    attackType: 'data_poisoning',
    attackSuccess: false,
    detectedAt: Date.now(),
    defenseActivated: 'Differential Privacy + Gradient Clipping',
    privacyBudgetProtected: 0.08,
    gradientRejectionRate: 0.943,
    logs: [],
  };
}

async function simulateModelInversion(addLog: (level: AttackLog['level'], message: string) => void): Promise<AttackSimulationResult> {
  addLog('error', '[ATTACK] Attempting model inversion to reconstruct EEG signals...');
  await delay(400);
  addLog('warn', '[DETECT] Suspicious inference pattern detected: 847 queries in 2s');
  await delay(300);
  addLog('info', '[DEFENSE] Rate limiting activated: max 10 queries/second per address');
  await delay(200);
  addLog('info', '[DEFENSE] Output perturbation: adding ε-DP noise to model outputs');
  await delay(300);
  addLog('success', '[BLOCKED] Signal reconstruction infeasible: SNR < -20dB after DP noise');

  return {
    attackType: 'model_inversion',
    attackSuccess: false,
    detectedAt: Date.now(),
    defenseActivated: 'Rate Limiting + Output Perturbation',
    privacyBudgetProtected: 0.12,
    gradientRejectionRate: 0.0,
    logs: [],
  };
}

async function simulateGradientLeakage(addLog: (level: AttackLog['level'], message: string) => void): Promise<AttackSimulationResult> {
  addLog('error', '[ATTACK] Deep Leakage from Gradients (DLG) attack initiated...');
  await delay(400);
  addLog('warn', '[DETECT] Gradient reconstruction attempt detected');
  await delay(300);
  addLog('info', '[DEFENSE] Applying Gaussian noise σ=0.83 to all gradient layers');
  await delay(200);
  addLog('info', '[DEFENSE] Gradient compression: top-k sparsification at k=0.1%');
  await delay(300);
  addLog('warn', '[PARTIAL] Attacker recovered ~12% signal structure (below 20% threshold)');
  addLog('success', '[CONTAINED] Privacy guarantee maintained: ε=0.1, δ=1e-5');

  return {
    attackType: 'gradient_leakage',
    attackSuccess: false,
    detectedAt: Date.now(),
    defenseActivated: 'Gaussian Noise + Gradient Sparsification',
    privacyBudgetProtected: 0.1,
    gradientRejectionRate: 0.88,
    logs: [],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
