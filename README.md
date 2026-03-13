# NeuralCommons — Cognitive Sovereignty Infrastructure

> Own your neural data. Govern its use. Train AI without giving up privacy.

NeuralCommons is a decentralized platform for cognitive sovereignty — built for researchers, self-quantifiers, and privacy advocates who want to contribute to brain-computer interface (BCI) research without surrendering their mental autonomy.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       NeuralCommons                             │
│                                                                  │
│  [EEG Device] → [FFT/DSP] → [Encrypt] → [IPFS]                │
│       ↓                          ↓           ↓                  │
│  [Flow State]    [Consent NCD] [Vault]  [Provenance DAG]        │
│       ↓                          ↓           ↓                  │
│  [DP Gradients] → [GossipSub] → [FedAvg] → [Global Model]      │
│                                    ↓                            │
│                          [DataDAO Governance]                    │
│                                    ↓                            │
│                         [BountyPool Rewards]                    │
└────────────────────────────────────────────────────────────────┘
```

## Features

- 🧠 **EEG Signal Processing** — FFT-based band power analysis, flow state classification, Muse 2 Bluetooth support
- 🔐 **Cryptographic Neural Vault** — AES-GCM-256 encryption, HKDF scoped access, IPFS storage
- 📜 **Neural Consent Descriptors (NCD)** — JSON-LD standard for expressing granular, revocable neural data consent
- 🤝 **Federated Learning** — TensorFlow.js local training, FedAvg aggregation, differential privacy
- ⛓️ **Smart Contracts** — ConsentVault, RevocationRegistry, DataDAO, BountyPool on Base Sepolia
- 🛡️ **Adversarial Robustness** — DP gradient clipping, poisoning detection, model inversion resistance

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env and set VITE_SIMULATE_EEG=true for demo mode

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```
VITE_SIMULATE_EEG=true          # Use simulated EEG instead of real device
VITE_IPFS_GATEWAY=              # IPFS gateway URL (default: ipfs.io)
VITE_CONSENT_VAULT_ADDRESS=     # Deployed ConsentVault contract address
VITE_REVOCATION_REGISTRY_ADDRESS= # Deployed RevocationRegistry address
VITE_DATA_DAO_ADDRESS=          # Deployed DataDAO address
VITE_BOUNTY_POOL_ADDRESS=       # Deployed BountyPool address
VITE_WALLETCONNECT_PROJECT_ID=  # WalletConnect project ID
VITE_CHAIN_ID=84532             # Chain ID (84532 = Base Sepolia)
```

## Deploy Contracts

```bash
# Set private key in .env
PRIVATE_KEY=0x...

# Deploy to Base Sepolia
npm run deploy:contracts
```

## Demo Walkthrough

1. **Connect EEG** — Click "Connect Muse 2" or use the simulator (`VITE_SIMULATE_EEG=true`)
2. **Record Session** — Navigate to Vault → New Session to encrypt and store a session
3. **Grant Consent** — Click "Manage Consent" on a vault card to create a time-limited access grant
4. **Train Locally** — Navigate to Federation → Train Local to compute DP-sanitized gradients
5. **Broadcast** — Click "Broadcast Gradients" to contribute to the global model via GossipSub

## Monorepo Structure

```
neuralcommons/
├── apps/web/              React + Vite frontend
└── packages/contracts/    Solidity smart contracts (Hardhat)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript |
| State | Zustand |
| EEG | Web Bluetooth API, FFT.js |
| ML | TensorFlow.js |
| Crypto | Web Crypto API (AES-GCM, HKDF, ECDSA) |
| Storage | IPFS (Helia), IPLD |
| P2P | libp2p, GossipSub, WebRTC |
| Web3 | viem, wagmi, Web3Modal |
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Chain | Base Sepolia (chainId: 84532) |

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — System design, data flow, security model
- [NCD Specification](./docs/NCD-SPEC.md) — Neural Consent Descriptor v0.1 standard
- [Safety & Ethics](./docs/SAFETY.md) — Cognitive liberty principles, known limitations

## License

MIT
NeuralCommons is a privacy-preserving, decentralized platform where individuals own, govern, and selectively share their neural/cognitive data — while collectively training AI models through federated learning — without any centralized authority ever touching raw brain signals.
