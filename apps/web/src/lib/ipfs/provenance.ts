import type { HeliaNode } from './heliaClient';
import { buildProvenanceDAG } from './heliaClient';

export interface ProvenanceNode {
  cid: string;
  type: string;
  timestamp: string;
  links: Record<string, string>;
}

const provenanceCache = new Map<string, ProvenanceNode>();

/**
 * Record provenance for an EEG session
 */
export async function recordSessionProvenance(
  node: HeliaNode,
  sessionId: string,
  featuresCID: string,
  consentCID: string,
  modelVersion: string
): Promise<string> {
  const cid = await buildProvenanceDAG(node, {
    sessionId,
    features: featuresCID,
    consentManifest: consentCID,
    modelVersion,
  });

  provenanceCache.set(cid, {
    cid,
    type: 'NeuralSessionProvenance',
    timestamp: new Date().toISOString(),
    links: {
      session: sessionId,
      features: featuresCID,
      consent: consentCID,
      model: modelVersion,
    },
  });

  return cid;
}

/**
 * Retrieve provenance record by CID
 */
export function getProvenance(cid: string): ProvenanceNode | undefined {
  return provenanceCache.get(cid);
}

/**
 * List all provenance records
 */
export function listProvenance(): ProvenanceNode[] {
  return Array.from(provenanceCache.values());
}
