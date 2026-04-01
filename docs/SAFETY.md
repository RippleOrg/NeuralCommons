# NeuralCommons Safety & Ethics

## Cognitive Liberty Principles

NeuralCommons is built on the principle that **mental privacy is a fundamental human right**. The platform adheres to:

1. **Mental self-determination**: Users have absolute control over their neural data. No data leaves the device without explicit cryptographic consent.
2. **Right to cognitive opacity**: Users can choose to not participate in federated learning while still using the vault functionality.
3. **Informed consent**: All consent grants require explicit user action. The NCD standard mandates clear statement of purposes.
4. **Revocability**: Any consent can be revoked at any time, destroying the cryptographic access key.

## Data Minimization

The platform follows strict data minimization principles:

- **Raw EEG data** is encrypted immediately upon capture and is only accessible to the user's own key
- **Feature vectors** (12 dimensions) rather than raw signals are used for federated learning
- **Band powers** are computed locally and only shared if the user explicitly grants access
- **Gradient updates** are DP-sanitized before any network transmission
- Keys are stored in **browser memory only** — never in localStorage, cookies, or any persistent storage

## Consent Hierarchy

```
Level 0: No consent (default)
  → No data leaves device, no IPFS storage

Level 1: Personal vault only
  → Encrypted storage on IPFS
  → User retains sole access

Level 2: Federated learning only
  → Band powers/features contribute to global model
  → DP-sanitized gradients only
  → No raw data transmitted

Level 3: Research access (per-session grants)
  → Selected sessions shared with specific researchers
  → Scoped access keys per grantee
  → Time-limited, purpose-bound

Level 4: Full access (not recommended)
  → All data types available to grantees
  → Highest epsilon budget required
```

## Adversarial Robustness Analysis

### Attacks Considered

| Attack Type | Risk Level | Mitigation | Status |
|-------------|-----------|------------|--------|
| Data poisoning | High | DP clipping + norm outlier rejection | Implemented |
| Model inversion | Medium | Output perturbation + rate limiting | Partial |
| Gradient leakage (DLG) | High | Gaussian noise + gradient sparsification | Implemented |
| Membership inference | Medium | DP guarantee bounds MIA advantage | Via DP |
| Reconstruction attacks | High | AES-GCM on all stored data | Implemented |
| Sybil attacks | Medium | Contribution scoring + DAO governance | Partial |

### Differential Privacy Guarantee

Under our default parameters (ε=0.1, δ=1e-5), the platform provides:

- **Bounded MIA advantage**: Any adversary's advantage in membership inference is bounded by ≈ 2ε × e^ε ≈ 0.22
- **Reconstruction resistance**: Signal reconstruction from gradients requires SNR below -20dB after noise addition
- **Budget tracking**: The RDP accountant ensures total privacy budget is not exceeded across composition

## Known Limitations

1. **Web Crypto API**: The platform relies on browser-native cryptography. Keys are in-memory and lost on page refresh. Production deployments should integrate hardware wallet key derivation.

2. **IPFS persistence**: Without a dedicated pinning service (Pinata, Filecoin), IPFS content may not persist if the local node goes offline.

3. **Browser coordination limits**: WebRTC and browser-side federation still have latency and reliability limitations compared to native coordination networks. Production deployments should anchor rounds to a chain or dedicated coordination service rather than rely on ephemeral peer discovery alone.

4. **Model accuracy vs. privacy**: At ε=0.1, model accuracy is significantly reduced compared to non-DP baselines. Users should understand this tradeoff.

5. **Smart contract audits**: The Solidity contracts have not been professionally audited. Do not deploy to mainnet without a security audit.

6. **EEG data validity**: The Muse 2 consumer headband provides lower signal quality than medical-grade EEG. Flow state classification accuracy may be limited.

## Reporting Security Issues

If you discover a security vulnerability in NeuralCommons, please report it privately before public disclosure. Do not file public GitHub issues for security vulnerabilities.

Contact: security@neuralcommons.org (hypothetical)

## License

MIT License — see repository root for full text.
