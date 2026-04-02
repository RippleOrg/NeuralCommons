import React from 'react';
import { FederatedDashboard } from '../components/federated/FederatedDashboard';
import { ContributionLeaderboard } from '../components/federated/ContributionLeaderboard';
import { GradientVisualizer } from '../components/federated/GradientVisualizer';
import { useFederated } from '../hooks/useFederated';

export const Federated: React.FC = () => {
  const federated = useFederated();
  const privacyBudget = federated.privacyBudget;

  return (
    <div className="page-grid">
      <section className="section-head">
        <div>
          <h2 className="page-title">Federated Learning</h2>
          <p className="page-subtitle">
            Train on locally captured feature vectors, add differential privacy, and anchor round metadata through the coordination layer.
          </p>
        </div>
        <div className="header-actions">
          <div className="badge badge-green">ε {privacyBudget.totalEpsilon.toFixed(3)}</div>
          <div className="badge badge-violet">δ {privacyBudget.totalDelta.toExponential(1)}</div>
        </div>
      </section>

      <section className="two-col federated-layout">
        <div className="column-stack">
          <div className="card card-accent">
            <FederatedDashboard
              training={federated.training}
              trainLocal={federated.trainLocal}
              broadcastGradients={federated.broadcastGradients}
              localAccuracy={federated.localAccuracy}
              globalAccuracy={federated.globalAccuracy}
              localLoss={federated.localLoss}
              privacyBudget={federated.privacyBudget}
              rounds={federated.rounds}
              accuracyHistory={federated.accuracyHistory}
              peers={federated.peers}
            />
          </div>
          <div className="card">
            <GradientVisualizer model={federated.model} rounds={federated.rounds} />
          </div>
        </div>

        <div className="column-stack">
          <div className="card">
            <ContributionLeaderboard contributions={federated.contributions} peers={federated.peers} />
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Round Discipline</div>
            </div>
            <div className="stack-sm">
              <div className="metric-row">
                <span>Clip norm</span>
                <strong>1.0</strong>
              </div>
              <div className="metric-row">
                <span>Noise mechanism</span>
                <strong>Gaussian</strong>
              </div>
              <div className="metric-row">
                <span>Transport</span>
                <strong>Anchored rounds</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
