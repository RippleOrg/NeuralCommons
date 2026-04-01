import { getRuntimeConfig } from '../runtime';
import type { CoordinationRoundReceipt } from '../../types/runtime';

function base64EncodeJson(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

async function callNearRpc(method: string, params: Record<string, unknown>) {
  const config = getRuntimeConfig();
  if (!config.nearRpcUrl) {
    throw new Error('NEAR RPC is not configured');
  }

  const response = await fetch(config.nearRpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'neuralcommons',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`NEAR RPC failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message ?? 'NEAR RPC returned an error');
  }

  return result.result;
}

export async function fetchNearCoordinationState() {
  const config = getRuntimeConfig();

  if (config.coordinationMode !== 'near' || !config.nearContractId || !config.nearRpcUrl) {
    return null;
  }

  try {
    const roundResult = await callNearRpc('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: config.nearContractId,
      method_name: 'get_latest_round',
      args_base64: base64EncodeJson({}),
    });

    const proposalResult = await callNearRpc('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: config.nearContractId,
      method_name: 'list_proposals',
      args_base64: base64EncodeJson({ limit: 20 }),
    });

    return {
      latestRound: roundResult?.result ? JSON.parse(new TextDecoder().decode(new Uint8Array(roundResult.result))) : null,
      proposals: proposalResult?.result ? JSON.parse(new TextDecoder().decode(new Uint8Array(proposalResult.result))) : [],
    };
  } catch {
    return null;
  }
}

export async function createLocalCoordinationReceipt(roundId: number, datasetHash: string): Promise<CoordinationRoundReceipt> {
  return {
    roundId: `round-${roundId}`,
    anchor: `near-local-${datasetHash.slice(0, 24)}`,
    publishedAt: Date.now(),
  };
}
