import React from 'react';
import { FederatedDashboard } from '../components/federated/FederatedDashboard';
import { ContributionLeaderboard } from '../components/federated/ContributionLeaderboard';
import { GradientVisualizer } from '../components/federated/GradientVisualizer';
import { useFederatedStore } from '../store/federatedStore';

export const Federated: React.FC = () => {
  const privacyBudget = useFederatedStore((state) => state.privacyBudget);

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
            <FederatedDashboard />
          </div>
          <div className="card">
            <GradientVisualizer />
          </div>
        </div>

        <div className="column-stack">
          <div className="card">
            <ContributionLeaderboard />
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
