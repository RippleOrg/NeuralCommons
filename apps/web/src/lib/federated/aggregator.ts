import type { SerializedGradients, DPGradients, FederationMessage } from '../../types/federated';

type GradientCallback = (gradients: DPGradients, contributorId: string) => void;

const FEDERATED_TOPIC = '/neuralcommons/federated/v1';

/**
 * FederatedAggregator manages gradient collection and FedAvg aggregation.
 * It can broadcast directly to an attached pubsub service and otherwise acts as
 * the in-browser coordination bus for the current runtime.
 */
export class FederatedAggregator {
  private callbacks: GradientCallback[] = [];
  public contributionScores: Map<string, number> = new Map();
  private pendingGradients: Map<string, DPGradients> = new Map();
  private messageHandlers: Map<string, ((msg: FederationMessage) => void)[]> = new Map();
  private libp2pNode: unknown = null;

  constructor() {
    this.messageHandlers.set(FEDERATED_TOPIC, []);
  }

  /**
   * Attach to a libp2p node for real peer-to-peer gradient exchange
   */
  attachLibp2p(node: unknown): void {
    this.libp2pNode = node;
  }

  /**
   * Broadcast local DP gradients to the network
   */
  async broadcastGradients(dpGradients: DPGradients, contributorId: string): Promise<void> {
    const message: FederationMessage = {
      type: 'GRADIENT_UPDATE',
      from: contributorId,
      timestamp: Date.now(),
      payload: dpGradients,
    };

    // If we have a real libp2p node, publish to GossipSub
    if (this.libp2pNode) {
      try {
        const node = this.libp2pNode as {
          services?: { pubsub?: { publish: (topic: string, data: Uint8Array) => Promise<void> } };
        };
        if (node.services?.pubsub) {
          const encoder = new TextEncoder();
          await node.services.pubsub.publish(
            FEDERATED_TOPIC,
            encoder.encode(JSON.stringify(message))
          );
        }
      } catch {
        // Fall through to local simulation
      }
    }

    // Also store locally and notify callbacks
    this.pendingGradients.set(contributorId, dpGradients);
    this.updateContributionScore(contributorId, dpGradients);

    for (const callback of this.callbacks) {
      callback(dpGradients, contributorId);
    }
  }

  /**
   * Register a callback for incoming gradient updates
   */
  onGradients(callback: GradientCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((c) => c !== callback);
    };
  }

  /**
   * FedAvg aggregation: weighted average by dataset size
   */
  aggregateFedAvg(gradientsList: SerializedGradients[]): SerializedGradients {
    if (gradientsList.length === 0) {
      throw new Error('No gradients to aggregate');
    }

    if (gradientsList.length === 1) {
      return gradientsList[0];
    }

    const totalDatasetSize = gradientsList.reduce((sum, g) => sum + g.datasetSize, 0);
    const aggregated: Record<string, Float32Array> = {};

    // Get all weight names from first gradient set
    const weightNames = Object.keys(gradientsList[0].weights);

    for (const name of weightNames) {
      const firstGrad = gradientsList[0].weights[name];
      if (!firstGrad) continue;

      const size = firstGrad.length;
      const result = new Float32Array(size);

      for (const grad of gradientsList) {
        const layerGrad = grad.weights[name];
        if (!layerGrad || layerGrad.length !== size) continue;

        const weight = totalDatasetSize > 0 ? grad.datasetSize / totalDatasetSize : 1 / gradientsList.length;
        for (let i = 0; i < size; i++) {
          result[i] += layerGrad[i] * weight;
        }
      }

      aggregated[name] = result;
    }

    return {
      weights: aggregated,
      datasetSize: totalDatasetSize,
      round: (gradientsList[0].round ?? 0) + 1,
      contributorId: 'aggregated',
    };
  }

  /**
   * Get pending gradients for aggregation
   */
  getPendingGradients(): DPGradients[] {
    return Array.from(this.pendingGradients.values());
  }

  /**
   * Clear pending gradients after aggregation
   */
  clearPendingGradients(): void {
    this.pendingGradients.clear();
  }

  /**
   * Update contribution score for a contributor
   */
  private updateContributionScore(contributorId: string, gradients: DPGradients): void {
    const existing = this.contributionScores.get(contributorId) ?? 0;
    // Score based on dataset size and privacy budget remaining
    const contribution = gradients.datasetSize * (1 - Math.min(gradients.epsilon, 1));
    this.contributionScores.set(contributorId, existing + Math.max(0.1, contribution));
  }
}
