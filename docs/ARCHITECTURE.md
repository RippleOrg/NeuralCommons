# NeuralCommons Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NeuralCommons Platform                       │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  EEG MODULE  │───▶│ CRYPTO VAULT │───▶│   IPFS STORAGE       │   │
│  │              │    │              │    │                      │   │
│  │ • FFT/DSP    │    │ • AES-GCM256 │    │ • Helia Node         │   │
│  │ • Band Power │    │ • HKDF Keys  │    │ • UnixFS Storage     │   │
│  │ • Flow State │    │ • Consent    │    │ • DAG Provenance      │   │
│  │ • Artifacts  │    │   Manifests  │    │                      │   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
│         │                                          │                  │
│         ▼                                          ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  FEDERATED   │◀──▶│   LIBP2P     │    │  SMART CONTRACTS     │   │
│  │  LEARNING    │    │  NETWORK     │    │                      │   │
│  │              │    │              │    │ • ConsentVault.sol   │   │
│  │ • TF.js Model│    │ • WebRTC     │    │ • RevocationReg.sol  │   │
│  │ • FedAvg     │    │ • GossipSub  │    │ • DataDAO.sol        │   │
│  │ • Diff. Priv │    │ • Bootstrap  │    │ • BountyPool.sol     │   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    React + Vite Frontend                      │    │
│  │  Dashboard │ Vault │ Federation │ Governance │ Adversarial   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### Module 1: EEG Signal Processing

- **`fft.ts`**: Cooley-Tukey FFT with Hann windowing; computes power spectral density across 5 frequency bands (δ/θ/α/β/γ)
- **`bandpower.ts`**: Relative band power computation and normalization
- **`artifacts.ts`**: Muscle artifact detection (high-frequency ratio), blink detection (amplitude threshold), signal quality scoring
- **`flowState.ts`**: Rule-based flow state classifier using band power ratios; 12-dimensional feature extraction
- **`SignalSimulator.ts`**: 8-channel, 250Hz synthetic EEG generator with realistic 1/f noise, mode-specific power profiles, and artifact injection

### Module 2: Cryptographic Vault

- **`keyManager.ts`**: In-memory AES-GCM-256 key store; HKDF-based scoped key derivation for per-grantee access control; keys NEVER touch localStorage
- **`encrypt.ts`**: AES-GCM encryption/decryption for Float32Array neural data; random 96-bit IV per encryption
- **`consentManifest.ts`**: JSON-LD NCD manifest creation and ECDSA P-256 signing; canonical JSON hashing

### Module 3: IPFS Storage

- **`heliaClient.ts`**: Helia-compatible IPFS interface; falls back to HTTP API or deterministic mock CIDs
- **`vaultStore.ts`**: Local CID registry with IPFS pinning workflow
- **`provenance.ts`**: IPLD-style provenance DAG linking sessions → features → consent → model version

### Module 4: Federated Learning

- **`model.ts`**: TensorFlow.js Sequential model (Input(12)→Dense(32)→Dropout→Dense(16)→Dense(5,softmax)); gradient serialization
- **`differentialPrivacy.ts`**: L2 gradient clipping + calibrated Gaussian noise; ε-δ DP guarantee via RDP composition
- **`aggregator.ts`**: FedAvg with dataset-size weighting; GossipSub integration; contribution scoring

### Module 5: Smart Contracts

- **`ConsentVault.sol`**: On-chain consent registry; scoped grants with expiry; revocation with key destruction proof
- **`RevocationRegistry.sol`**: Append-only revocation log; callable only by ConsentVault
- **`DataDAO.sol`**: Proposal/vote/execute governance; quorum of 3; >50% for passage
- **`BountyPool.sol`**: ETH bounty escrow; claim/approve workflow; DAO-controlled release

## Data Flow

```
EEG Headband (Muse 2 / Simulator)
    ↓ Bluetooth GATT / synthetic
Signal Processing (FFT, band powers, flow state)
    ↓ FeatureVector
Encryption (AES-GCM-256, HKDF-scoped key)
    ↓ EncryptedBlob
IPFS Storage (Helia UnixFS)
    ↓ CID
Consent Manifest (NCD JSON-LD + ECDSA signature)
    ↓ ConsentManifest
Smart Contract (ConsentVault.sol on Base Sepolia)
    ↓ grantId
Federated Learning (gradient computation + DP noise)
    ↓ DPGradients
GossipSub Broadcast → Peers
    ↓ FedAvg aggregation
Updated Global Model
    ↓ model update proposal
DataDAO Governance → vote → execute
```

## Security Model

### Threat 1: Data Leakage from IPFS
**Mitigation**: All data is AES-GCM-256 encrypted before IPFS pinning. The encryption key never leaves the browser's in-memory key store.

### Threat 2: Unauthorized Access
**Mitigation**: Scoped access keys are derived via HKDF per grantee+scope. The on-chain `ConsentVault` provides a second layer of access control verification.

### Threat 3: Gradient Leakage (Deep Leakage from Gradients)
**Mitigation**: Gaussian noise calibrated to (ε, δ)-DP guarantees is added to all gradients before broadcast. L2 clipping bounds per-sample sensitivity.

### Threat 4: Data Poisoning
**Mitigation**: FedAvg with dataset-size weighting reduces influence of small malicious contributors. Outlier gradient rejection based on norm distance from median.

### Threat 5: Consent Revocation Attacks
**Mitigation**: Revocation destroys the cryptographic key (not just the permission record). The RevocationRegistry provides an append-only on-chain audit trail. Key destruction proofs are stored immutably.

## Differential Privacy Analysis

The platform uses the Gaussian mechanism for (ε, δ)-DP:

- **Clipping norm**: C = 1.0 (L2 sensitivity)
- **Noise multiplier**: σ = C × √(2 ln(1.25/δ)) / ε
- **Composition**: Advanced composition via RDP accountant
- **Default parameters**: ε = 0.1, δ = 1e-5 per round

Privacy budget is tracked cumulatively. Users can configure their ε budget in the onboarding flow, trading accuracy for stronger privacy.
