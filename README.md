# NeuralCommons

NeuralCommons is a Sepolia-backed cognitive sovereignty workspace for capturing EEG sessions, sealing them into encrypted vault bundles, granting and revoking access onchain, coordinating federated learning, and routing remote cognition inference through an API service with OpenRouter fallback.

## What is live

- Ethereum Sepolia is now the default EVM target across the frontend, contract tooling, and wallet UX.
- RainbowKit v2 is the wallet entrypoint for all contract-backed actions.
- `ConsentVault` stores real vault ownership, dataset anchors, grants, and revocations.
- `DataDAO` is used for live proposal creation and voting.
- `apps/api` proxies Storacha uploads and AI inference.
- Impulse inference now falls back to OpenRouter Gemini 2.5 Flash Lite when Impulse is unavailable or misconfigured.

## Sepolia deployment

Current public testnet deployment:

| Contract | Address |
| --- | --- |
| ConsentVault | `0xc634a5CCf4A008B6085a1735024aA443207723A8` |
| RevocationRegistry | `0x6a2a12F68bb9A121E68765e4631151Cb463c2222` |
| DataDAO | `0x5f5D961153800c2A4F00876F9D3D79A0723507a3` |
| BountyPool | `0xAb85d120b59a394770088Eb7c0f8D17F61438451` |

Deployment artifacts are written to:

- `packages/contracts/deployments.sepolia.json`
- `packages/contracts/deployments.json`

Seeded onchain state for the deployer wallet:

- 1 anchored dataset record
- 4 consent grants total
- 1 governance proposal

The seeded vault and grant history belongs to the deployment wallet. Any new real EEG sessions sealed from the app will belong to the wallet that is currently connected in the browser.

## Workspaces

```text
apps/web               React + Vite control plane
apps/api               Fastify API for Storacha + AI proxying
packages/contracts     Hardhat + Solidity consent/governance contracts
docs/                  Architecture, NCD spec, safety notes
```

## Core flows

### EEG capture

- Web Bluetooth is the primary runtime path.
- The main UX no longer depends on simulated EEG for the header, onboarding, or vault flow.
- Feature windows are recorded continuously during a live session and then sealed into encrypted bundles.

### Vault sealing

- Session payloads are encrypted in-browser with AES-GCM.
- A consent manifest and provenance metadata bundle are created for each sealed session.
- The app stores the bundle locally by default and can also archive it to Storacha through `apps/api`.
- The bundle is anchored onchain through `ConsentVault.anchorDataset`.

### Consent lifecycle

- Wallet-connected owners create grants through `ConsentVault.grantAccess`.
- Revocations are written through `ConsentVault.revokeAccess` and mirrored into `RevocationRegistry`.
- The vault store hydrates from chain state on app load.

### Governance

- Proposal creation and voting are wired to `DataDAO`.
- The deployer is bootstrapped as a DAO member so governance works immediately after deploy.

### AI inference

- Frontend inference requests go to `VITE_IMPULSE_PROXY_URL`.
- The API first attempts Impulse.
- If Impulse fails or lacks a deployment ID, the API falls back to OpenRouter.
- The fallback model defaults to `google/gemini-2.5-flash-lite-preview-06-17`.

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+
- A Sepolia-funded EVM wallet if you want to write onchain state
- A Chromium browser with Web Bluetooth support for live EEG capture

### Install

```bash
npm install
cp .env.example .env
```

### Run the apps

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

## Environment

The repo uses a root `.env` file for the web app, API service, and Hardhat tooling.

### Frontend runtime

Required for the live Sepolia deployment:

```bash
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Ethereum Sepolia
VITE_RPC_URL=https://rpc.sepolia.org
VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
VITE_CONSENT_VAULT_ADDRESS=0xc634a5CCf4A008B6085a1735024aA443207723A8
VITE_REVOCATION_REGISTRY_ADDRESS=0x6a2a12F68bb9A121E68765e4631151Cb463c2222
VITE_DATA_DAO_ADDRESS=0x5f5D961153800c2A4F00876F9D3D79A0723507a3
VITE_BOUNTY_POOL_ADDRESS=0xAb85d120b59a394770088Eb7c0f8D17F61438451
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

### API runtime

Storacha is optional. At least one AI backend must be configured if you want remote inference.

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

### Contract deployment runtime

```bash
PRIVATE_KEY=
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ALCHEMY_SEPOLIA_API=
ETHERSCAN_API_KEY=
```

## Deployment and seeding

Deploy the contracts to Sepolia:

```bash
npm run deploy:contracts
```

Seed the deployment with bootstrap chain state for the deployer wallet:

```bash
npm run seed --workspace=@neuralcommons/contracts -- --network sepolia
```

The seed script is idempotent. Once a vault, grant history, and governance proposal already exist, re-running it will skip those writes.

## Verification

Contract tests:

```bash
npm run test --workspace=@neuralcommons/contracts
```

API build:

```bash
npm run build --workspace=@neuralcommons/api
```

Frontend build:

```bash
npm run build --workspace=@neuralcommons/web
```

Whole workspace build:

```bash
npm run build
```

## Operational notes

- Storacha archival is implemented, but actual replication requires valid delegated Storacha credentials.
- WalletConnect wallet discovery is wired through RainbowKit, but `VITE_WALLETCONNECT_PROJECT_ID` still needs a real project ID if you want WalletConnect wallets to appear.
- The AI proxy supports fallback logic, but you still need either a valid Impulse deployment ID or an OpenRouter API key for successful remote inference.
- Local archive mode is still a real persistence path, not a demo path. It stores encrypted bundles in browser storage until remote archival is configured.
- NEAR coordination remains optional. Without NEAR settings, coordination remains local while EVM consent and governance stay live on Sepolia.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/NCD-SPEC.md`
- `docs/SAFETY.md`

## Current limits

- Real EEG capture still depends on Muse-compatible hardware and browser Bluetooth support.
- The seeded Sepolia data is operational bootstrap state, not a personal biometric baseline.
- The frontend still emits chunk-size warnings because the wallet and analytics vendors remain large; the build is successful, but there is more code-splitting work left if load performance becomes a priority.
