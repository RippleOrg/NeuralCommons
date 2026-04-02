# NeuralCommons

NeuralCommons is a cognitive sovereignty platform for neural data capture, encrypted memory, programmable consent, federated learning, and safe AI coordination. It turns raw EEG sessions into user-owned encrypted vault bundles, anchors provenance and revocation onchain, persists memory to Storacha when available, wraps access with Lit-compatible policies, and keeps cognitive inference online through multi-provider AI fallbacks.

Built for the PL Genesis: Frontier of Collaboration Hackathon 2026.

## Why It Matters

Neural data is among the most intimate classes of data people can generate. Today, most neurotech products centralize storage, blur consent boundaries, and give users limited visibility into how signals are reused. NeuralCommons proposes a different default:

- users own their cognitive traces
- consent is explicit, revocable, and auditable
- collaboration happens through privacy-preserving federated learning instead of raw data extraction
- storage and access control are decentralized instead of platform-custodial
- the product still works under degraded conditions through local-first fallbacks

This makes NeuralCommons both a neurotech product and a coordination system for safe human-AI collaboration.

## Submission Highlights

| Area | What NeuralCommons Ships |
| --- | --- |
| Neurotech | Live Muse-compatible EEG ingestion, cognitive-state classification, consented neural data packaging, safety/adversarial testing surfaces |
| ImpulseAI | Hosted cognitive inference path with graceful fallback to OpenRouter and then to a built-in heuristic classifier |
| Storacha | Encrypted dataset archival path to Storacha via API, with local encrypted retention fallback when remote storage is unavailable |
| Lit Protocol | Lit-compatible access envelopes for vault keys and programmable recipient conditions for neural data sharing |
| Onchain coordination | Sepolia contracts for vault ownership, grant issuance, revocation, governance, and bounty alignment |

## Judging Criteria Alignment

### Technical Execution

- Fastify API with provider-aware health reporting and AI fallback routing
- React + Vite control plane with lazy-loaded pages, runtime health checks, and an app-level error boundary
- Solidity contracts for vault creation, grant lifecycle, revocation registry, DAO proposals, and bounty approvals
- Browser crypto, Lit-ready key wrapping, federated learning, and differential privacy primitives
- Demo-safe EEG fallback mode when real hardware is unavailable

### Impact / Usefulness

- Gives users real ownership and revocation power over neural data
- Enables researchers and builders to collaborate without centralizing raw EEG sessions
- Makes neurotech safer by foregrounding consent, adversarial testing, and cognitive liberty
- Demonstrates a deployable pattern for privacy-preserving collective intelligence systems

### Completeness / Functionality

- Full frontend control plane
- Working Fastify API
- Passing smart-contract test suite
- Deployed Sepolia contract addresses committed in-repo
- Deployment configs for Vercel and Render
- Local-first fallbacks so the product remains operable when external services are absent

### Scalability / Future Potential

- Local-first storage and inference reduce operational brittleness
- Storacha persistence supports portable agent memory and shared knowledge layers
- Federated training architecture can scale to more peers without centralizing raw sessions
- Governance and bounty primitives provide a path toward a researcher/participant network economy

### Innovation / Creativity

- Treats neural data as sovereign, revocable infrastructure instead of a passive analytics feed
- Connects neurotech, decentralized storage, programmable cryptography, and agentic ML in one product
- Uses graceful degradation as part of the product design rather than treating offline mode as failure

## Track Alignment

### Neurotech Track

NeuralCommons directly addresses cognition, coordination, and computation:

- Muse-compatible EEG capture produces real signal windows and cognitive-state features
- vault bundles preserve provenance, consent metadata, and access boundaries
- safety surfaces include adversarial simulation and revocation controls
- federated training demonstrates collaborative intelligence without centralizing raw neural data
- the live capture path is built for Muse-compatible EEG hardware

This is framed around cognitive sovereignty: the user controls retention, sharing, and revocation of their own neural traces.

### ImpulseAI Track

NeuralCommons integrates hosted cognitive inference into the product rather than leaving modeling in a notebook:

- the frontend sends cognitive feature windows to the API
- the API tries Impulse first
- if Impulse is unavailable, the API falls back to OpenRouter
- if hosted providers are unavailable, a built-in heuristic classifier still returns a usable cognitive-state prediction
- the UI exposes model provenance, confidence, and reasoning

That means the inference workflow is productized, observable, and resilient.

### Storacha Track

NeuralCommons uses Storacha as persistent encrypted agent memory for neural sessions:

- encrypted neural bundles are serialized and uploaded through the API
- stored bundles can act as durable cross-device memory instead of ephemeral session state
- local encrypted archival remains active if Storacha credentials or network access are unavailable
- the architecture supports future shared-memory and decentralized RAG patterns over stored neural artifacts

This aligns especially well with the persistent memory and decentralized knowledge-base challenge directions.

### Lit Protocol Track

NeuralCommons uses Lit-compatible access envelopes to make neural data sharing programmable:

- vault keys can be wrapped with recipient conditions
- access is modeled as revocable, scoped consent rather than a one-time export
- the product positions Lit as the programmable trust layer for sensitive neural information
- this enables privacy-preserving collaboration without giving any single participant raw permanent custody

## Architecture

```text
Muse EEG
        |
        v
  Browser signal processing
        |
        +--> local flow-state classification
        |
        +--> encrypted neural vault bundle
                 |
                 +--> local encrypted archive
                 +--> API -> Storacha replication
                 +--> Lit envelope for scoped access
                 +--> Sepolia dataset anchor + grant lifecycle
        |
        +--> federated learning + differential privacy
        |
        +--> API inference router
                 |
                 +--> Impulse AI
                 +--> OpenRouter
                 +--> local heuristic fallback
```

## Core Product Flows

### 1. Capture

- Connect a Muse-compatible headset over Web Bluetooth
- Start a session and record feature windows in-browser

### 2. Seal

- Generate a vault key in the browser
- Encrypt session payloads with AES-GCM
- Build a consent manifest and provenance record
- Store locally first, then replicate to Storacha when configured
- Anchor the dataset reference on Sepolia

### 3. Govern Access

- Create onchain grants through `ConsentVault`
- Revoke grants and publish revocations to `RevocationRegistry`
- Destroy scoped key material when consent is revoked

### 4. Learn Collaboratively

- Train locally on feature vectors
- Apply differential privacy before sharing gradients
- Aggregate through the federated coordination layer
- Track privacy budget and peer participation in the UI

### 5. Infer Reliably

- Query the API for cognitive-state inference
- Route to Impulse first, then OpenRouter
- Fall back to a local heuristic model when hosted providers fail

## Fallback Strategy

| Capability | Primary Path | Fallback |
| --- | --- | --- |
| EEG input | Muse headset over Web Bluetooth | Local-first session workflows keep the rest of the product usable when hardware is unavailable |
| Dataset persistence | Storacha via API | Browser local encrypted archive |
| AI inference | Impulse AI | OpenRouter, then local heuristic |
| Key access control | Lit envelope | Local encrypted payload retention |
| Coordination | NEAR / remote coordination config | Local coordination ledger |

This fallback layer is deliberate: judges can still exercise the full product even if external credentials are unavailable.

## Sepolia Deployment

Current committed Sepolia deployment:

| Contract | Address |
| --- | --- |
| ConsentVault | `0xc634a5CCf4A008B6085a1735024aA443207723A8` |
| RevocationRegistry | `0x6a2a12F68bb9A121E68765e4631151Cb463c2222` |
| DataDAO | `0x5f5D961153800c2A4F00876F9D3D79A0723507a3` |
| BountyPool | `0xAb85d120b59a394770088Eb7c0f8D17F61438451` |

Deployment artifacts live in:

- `packages/contracts/deployments.sepolia.json`
- `packages/contracts/deployments.json`

## Repository Layout

```text
apps/web               React + Vite control plane
apps/api               Fastify API for AI routing and Storacha uploads
packages/contracts     Hardhat contracts for consent, revocation, governance, bounties
docs/                  architecture, safety, and NCD references
```

## Tech Stack

- React 18
- Vite 5
- TypeScript
- Zustand
- Fastify
- Wagmi + RainbowKit
- Solidity + Hardhat
- Sepolia
- Storacha
- Lit Protocol SDK
- TensorFlow.js
- Recharts

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- a Sepolia wallet if you want to exercise contract writes
- optionally a Muse-compatible headset for live EEG capture

### Install

```bash
npm install
cp .env.example .env
```

### Run

Frontend:

```bash
npm run dev --workspace=@neuralcommons/web
```

API:

```bash
npm run dev --workspace=@neuralcommons/api
```

Whole workspace:

```bash
npm run dev
```

## Environment Variables

### Frontend

The frontend has safe defaults for chain metadata and the committed Sepolia contract addresses. Add these when you want remote services enabled:

```bash
VITE_STORAGE_MODE=local
VITE_STORAGE_API_URL=http://127.0.0.1:4100
VITE_IPFS_GATEWAY=https://w3s.link/ipfs/
VITE_WALLETCONNECT_PROJECT_ID=
VITE_LIT_NETWORK=datil
VITE_LIT_CHAIN=ethereum
VITE_COORDINATION_MODE=local
VITE_NEAR_RPC_URL=
VITE_NEAR_COORDINATION_CONTRACT_ID=
VITE_IMPULSE_PROXY_URL=http://127.0.0.1:4100/ai/infer
VITE_IMPULSE_API_URL=https://inference.impulselabs.ai
VITE_IMPULSE_DEPLOYMENT_ID=
```

### API

```bash
PORT=4100
HOST=0.0.0.0
PUBLIC_IPFS_GATEWAY=https://w3s.link/ipfs/
STORACHA_KEY=
STORACHA_PROOF=
IMPULSE_API_KEY=
IMPULSE_API_URL=https://inference.impulselabs.ai
IMPULSE_DEPLOYMENT_ID=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-06-17
OPENROUTER_HTTP_REFERER=http://127.0.0.1:5173
OPENROUTER_APP_NAME=NeuralCommons
```

### Contracts

```bash
PRIVATE_KEY=
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ALCHEMY_SEPOLIA_API=
ETHERSCAN_API_KEY=
BASESCAN_API_KEY=
```

## Deployment

### Contracts

Deploy:

```bash
npm run deploy:contracts
```

Seed bootstrap state:

```bash
npm run seed --workspace=@neuralcommons/contracts -- --network sepolia
```

### API on Render

This repo includes a Render blueprint at `render.yaml`.

Required Render environment variables:

- `STORACHA_KEY`
- `STORACHA_PROOF`
- `IMPULSE_API_KEY` and `IMPULSE_DEPLOYMENT_ID` if using Impulse
- `OPENROUTER_API_KEY` if using OpenRouter fallback
- `OPENROUTER_HTTP_REFERER` set to your deployed frontend URL

The service health check is `GET /health`.

### Frontend on Vercel

The frontend includes Vercel config at `apps/web/vercel.json`.

Recommended Vercel environment variables:

- `VITE_STORAGE_API_URL`
- `VITE_IMPULSE_PROXY_URL`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_LIT_NETWORK`
- `VITE_LIT_CHAIN`
- optional NEAR coordination vars if you want remote coordination enabled

SPA rewrites are configured so routes like `/vault` and `/governance` resolve correctly in production.

## Verification

Contracts:

```bash
npm run test --workspace=@neuralcommons/contracts
```

API:

```bash
npm run build --workspace=@neuralcommons/api
```

Frontend:

```bash
npm run build --workspace=@neuralcommons/web
```

Whole workspace:

```bash
npm run build
```

## Demo Script

Suggested 2-5 minute hackathon demo:

1. Open the dashboard and show the track-alignment cards plus provider health.
2. Connect a Muse-compatible device and start a short capture.
3. Record a short session and stop it.
4. Seal the session into the vault and show encrypted retention.
5. Grant access, then revoke it to demonstrate programmable consent.
6. Run cognitive inference and highlight the hosted-to-local fallback path.
7. Open Federated Learning and show local training, privacy budget, and round anchoring.
8. Open the Security Lab to show adversarial thinking and safety posture.

## Current State

- frontend and API both build successfully
- contract tests are passing
- the API exposes runtime health and heuristic AI fallback
- the frontend has local-first archival fallback and a healthier federation/runtime setup
- the frontend uses route-level lazy loading to reduce initial bundle pressure

## Known Limitations

- a real headset is still required for true live biometric capture
- Storacha replication depends on valid delegated credentials
- Lit envelopes are implemented as a programmable access path, but full production key ceremony can go deeper
- the wallet stack is still heavy and could be slimmed further for faster cold starts
- remote coordination is currently optional and defaults to local mode

## Roadmap After Hackathon

- richer multi-party UCAN/Storacha shared-memory flows
- stronger Lit-based decrypt authorization for every downstream read path
- dataset marketplaces and bounty-backed research requests
- production observability dashboards and audit exports
- more sophisticated Impulse models trained on broader consented datasets

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/NCD-SPEC.md`
- `docs/SAFETY.md`

NeuralCommons is designed to show that neurotech can be useful, collaborative, and privacy-preserving without sacrificing deployability.
