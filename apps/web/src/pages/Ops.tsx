import React from 'react';
import { getProviderStatuses, getRuntimeConfig } from '../lib/runtime';

export const Ops: React.FC = () => {
  const config = getRuntimeConfig();
  const providers = getProviderStatuses(config);

  return (
    <div className="page-grid">
      <section className="section-head">
        <div>
          <h2 className="page-title">Operations</h2>
          <p className="page-subtitle">
            Production configuration for storage, permissioning, coordination, and cognitive inference.
          </p>
        </div>
      </section>

      <section className="two-col">
        {Object.values(providers).map((provider) => (
          <div key={provider.label} className="card">
            <div className="card-header">
              <div className="card-title">{provider.label}</div>
              <span className={`badge ${provider.healthy ? 'badge-green' : 'badge-amber'}`}>
                {provider.healthy ? 'ready' : 'setup'}
              </span>
            </div>
            <p className="card-copy">{provider.detail}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Runtime Configuration</div>
        </div>
        <div className="config-grid">
          <div className="metric-row"><span>Environment</span><strong>{config.appEnv}</strong></div>
          <div className="metric-row"><span>Storage mode</span><strong>{config.storageMode}</strong></div>
          <div className="metric-row"><span>IPFS gateway</span><strong>{config.ipfsGateway}</strong></div>
          <div className="metric-row"><span>Lit network</span><strong>{config.litNetwork}</strong></div>
          <div className="metric-row"><span>Lit chain</span><strong>{config.litChain}</strong></div>
          <div className="metric-row"><span>Coordination mode</span><strong>{config.coordinationMode}</strong></div>
          <div className="metric-row"><span>NEAR contract</span><strong>{config.nearContractId ?? 'local mode'}</strong></div>
          <div className="metric-row"><span>Impulse deployment</span><strong>{config.impulseDeploymentId ?? 'auto / fallback'}</strong></div>
        </div>
      </section>
    </div>
  );
};
