import { useState, useCallback, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { useFederatedStore } from '../store/federatedStore';
import { useVaultStore } from '../store/vaultStore';
import { getProviderStatuses } from '../lib/runtime';

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
    falsePositiveRate: 0.01,
  });
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const logRef = useRef<AttackLog[]>([]);

  const addLog = useCallback((level: AttackLog['level'], message: string) => {
    const next = { timestamp: Date.now(), level, message };
    logRef.current = [...logRef.current, next].slice(-100);
    setLogs([...logRef.current]);
  }, []);

  const simulateAttack = useCallback(
    async (attackType: AttackType): Promise<AttackSimulationResult> => {
      setSimulating(true);
      setCurrentAttack(attackType);
      logRef.current = [];

      try {
        const result = await runAudit(attackType, addLog);
        setSimulationResult(result);
        setMetrics((previous) => ({
          attacksDetected: previous.attacksDetected + 1,
          gradientsRejected: previous.gradientsRejected + Math.round(result.gradientRejectionRate * 100),
          privacyBudgetProtected: previous.privacyBudgetProtected + result.privacyBudgetProtected,
          falsePositiveRate: previous.falsePositiveRate,
        }));

        uiStore.addToast(
          result.attackSuccess
            ? `Security gap found in ${attackType.replace(/_/g, ' ')}`
            : `Security audit passed for ${attackType.replace(/_/g, ' ')}`,
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

async function runAudit(
  attackType: AttackType,
  addLog: (level: AttackLog['level'], message: string) => void
): Promise<AttackSimulationResult> {
  const federated = useFederatedStore.getState();
  const vault = useVaultStore.getState();
  const providerStatuses = getProviderStatuses();
  const activeGrants = vault.grants.filter((grant) => !grant.revoked);
  const rawEegGrants = activeGrants.filter((grant) => grant.dataTypes.includes('raw_eeg'));

  addLog('info', `Running ${attackType.replace(/_/g, ' ')} audit against live configuration...`);
  await delay(200);

  if (attackType === 'data_poisoning') {
    const contributions = Array.from(federated.contributions.values());
    const highestContribution = Math.max(0, ...contributions);
    const concentration = contributions.length > 0
      ? highestContribution / contributions.reduce((sum, value) => sum + value, 1)
      : 0;

    addLog('info', `Observed ${contributions.length} contributors in the current federation ledger.`);
    addLog(
      concentration > 0.5 ? 'warn' : 'success',
      concentration > 0.5
        ? 'One contributor dominates the round; enable stricter weighting before accepting peer updates.'
        : 'Contribution weighting is sufficiently distributed for the current round.'
    );

    return {
      attackType,
      attackSuccess: concentration > 0.5,
      detectedAt: Date.now(),
      defenseActivated: 'Contribution concentration audit',
      privacyBudgetProtected: Math.max(0, 1 - federated.privacyBudget.totalEpsilon),
      gradientRejectionRate: concentration > 0.5 ? 0.35 : 0.9,
      logs: [],
    };
  }

  if (attackType === 'model_inversion') {
    addLog(
      rawEegGrants.length > 0 ? 'warn' : 'success',
      rawEegGrants.length > 0
        ? `${rawEegGrants.length} active grants include raw EEG access; restrict scopes to feature vectors where possible.`
        : 'No active grants expose raw EEG payloads.'
    );
    addLog(
      providerStatuses.permissions.configured ? 'success' : 'warn',
      providerStatuses.permissions.detail
    );

    return {
      attackType,
      attackSuccess: rawEegGrants.length > 0,
      detectedAt: Date.now(),
      defenseActivated: 'Scope minimization + Lit access envelopes',
      privacyBudgetProtected: Math.max(0, 1 - federated.privacyBudget.totalEpsilon),
      gradientRejectionRate: rawEegGrants.length > 0 ? 0.25 : 0.8,
      logs: [],
    };
  }

  const epsilonSpent = federated.privacyBudget.totalEpsilon;
  addLog(
    epsilonSpent > 0.8 ? 'warn' : 'success',
    `Current cumulative epsilon is ${epsilonSpent.toFixed(3)} out of ${federated.privacyBudget.maxEpsilon.toFixed(1)}.`
  );
  addLog(
    providerStatuses.storage.configured ? 'success' : 'warn',
    providerStatuses.storage.detail
  );

  return {
    attackType,
    attackSuccess: epsilonSpent > 0.8,
    detectedAt: Date.now(),
    defenseActivated: 'Differential privacy budget tracking',
    privacyBudgetProtected: Math.max(0, 1 - epsilonSpent),
    gradientRejectionRate: epsilonSpent > 0.8 ? 0.4 : 0.88,
    logs: [],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
