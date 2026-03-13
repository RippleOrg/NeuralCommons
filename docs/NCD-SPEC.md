# NCD Specification v0.1

## Abstract

The Neural Consent Descriptor (NCD) is a JSON-LD based standard for expressing granular, revocable, and auditable consent over neural/cognitive data. It enables data owners to precisely define who can access their brain signal data, for what purposes, under which privacy constraints, and for how long.

## Motivation

Neural data is uniquely sensitive — it can reveal cognitive state, emotional responses, medical conditions, and other deeply personal information. Unlike traditional data consent frameworks, neural data requires:

1. **Granular type control** — different brain signals (raw EEG vs band powers vs flow state) carry different privacy risks
2. **Purpose limitation** — access must be bound to specific stated purposes
3. **Cryptographic revocation** — revocation must destroy access, not just withdraw permission
4. **Privacy budget tracking** — differential privacy budgets must be allocated per grantee
5. **Decentralized verification** — consent should be verifiable without a central authority

## Data Model

### NCD URI Grammar

```
ncd://{ownerDID}/{sessionHash}/{grantId}
```

- `ownerDID` — W3C DID of the data owner (e.g., `did:pkh:eip155:84532:0xabc...`)
- `sessionHash` — SHA-256 hash of the session's IPFS CID
- `grantId` — UUID v4 identifying the specific consent grant

### JSON-LD Context

```json
{
  "@context": {
    "@vocab": "https://neuralcommons.org/ncd/v0.1#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "NeuralConsentDescriptor": "https://neuralcommons.org/ncd/v0.1#NeuralConsentDescriptor",
    "ownerDID": "schema:identifier",
    "dataTypes": "https://neuralcommons.org/ncd/v0.1#dataTypes",
    "grantees": "https://neuralcommons.org/ncd/v0.1#grantees",
    "purposes": "https://neuralcommons.org/ncd/v0.1#purposes",
    "expiry": { "@type": "xsd:dateTime" },
    "issuedAt": { "@type": "xsd:dateTime" },
    "privacyBudget": "https://neuralcommons.org/ncd/v0.1#privacyBudget"
  }
}
```

### Consent Manifest JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://neuralcommons.org/ncd/v0.1/schema.json",
  "title": "NeuralConsentDescriptor",
  "type": "object",
  "required": ["@context", "id", "type", "ownerDID", "dataTypes", "grantees", "expiry", "purposes", "issuedAt"],
  "properties": {
    "@context": { "type": "object" },
    "id": { "type": "string", "pattern": "^ncd://" },
    "type": { "type": "string", "const": "NeuralConsentDescriptor" },
    "ownerDID": { "type": "string" },
    "dataTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["raw_eeg", "band_powers", "flow_state", "feature_vector", "model_gradients"]
      },
      "minItems": 1
    },
    "grantees": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["address"],
        "properties": {
          "address": { "type": "string" },
          "name": { "type": "string" },
          "organization": { "type": "string" }
        }
      }
    },
    "expiry": { "type": "string", "format": "date-time" },
    "purposes": { "type": "array", "items": { "type": "string" } },
    "revocable": { "type": "boolean" },
    "privacyBudget": {
      "type": "object",
      "required": ["epsilon", "delta"],
      "properties": {
        "epsilon": { "type": "number", "minimum": 0, "maximum": 10 },
        "delta": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "issuedAt": { "type": "string", "format": "date-time" },
    "proof": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "created": { "type": "string" },
        "verificationMethod": { "type": "string" },
        "proofPurpose": { "type": "string" },
        "jws": { "type": "string" }
      }
    }
  }
}
```

## Signing

NCDs are signed using Ed25519 (or ECDSA P-256) over the SHA-256 hash of the canonical JSON (RFC 8785 — JSON Canonicalization Scheme).

```
signature = Sign(privateKey, SHA-256(JCS(manifest)))
```

The `proof.jws` field contains the Base64url-encoded DER signature.

## Revocation Mechanism

Revocation is performed at two levels:

1. **Cryptographic**: The scoped access key derived for the grantee is destroyed in the key manager (`destroyKey(keyId)`)
2. **On-chain**: The `ConsentVault.revokeAccess()` function records the revocation with a `keyDestructionProof` (hash of the destroyed key's material)
3. **Registry**: The `RevocationRegistry` maintains an append-only log of all revocations, queryable by `grantId`

Revocation is irreversible by design. A new grant must be created if access should be restored.

## Privacy Budget Accounting

Each NCD carries a `privacyBudget` field specifying the ε and δ parameters for differential privacy:

```json
{
  "privacyBudget": {
    "epsilon": 0.1,
    "delta": 1e-5
  }
}
```

Budget consumption is tracked per grantee using the RDP (Rényi Differential Privacy) accountant. Total budget across rounds is approximated as:

```
ε_total ≈ ε_per_round × √(2k × ln(1/δ))
```

where k is the number of rounds and δ is the failure probability.

## Example Manifests

### Minimal Manifest

```json
{
  "@context": {
    "@vocab": "https://neuralcommons.org/ncd/v0.1#",
    "schema": "https://schema.org/"
  },
  "id": "ncd://did:pkh:eip155:84532:0xabc/sha256:xyz/grant-001",
  "type": "NeuralConsentDescriptor",
  "ownerDID": "did:pkh:eip155:84532:0xabc123",
  "dataTypes": ["band_powers"],
  "grantees": [{ "address": "0xresearcher123" }],
  "expiry": "2026-12-31T23:59:59Z",
  "purposes": ["neuroscience_research"],
  "revocable": true,
  "privacyBudget": { "epsilon": 0.1, "delta": 1e-5 },
  "issuedAt": "2026-01-01T00:00:00Z"
}
```

### Full Manifest (with proof)

```json
{
  "@context": {
    "@vocab": "https://neuralcommons.org/ncd/v0.1#",
    "schema": "https://schema.org/"
  },
  "id": "ncd://did:pkh:eip155:84532:0xabc/sha256:xyz/grant-002",
  "type": "NeuralConsentDescriptor",
  "ownerDID": "did:pkh:eip155:84532:0xabc123",
  "dataTypes": ["raw_eeg", "band_powers", "flow_state", "feature_vector"],
  "grantees": [
    { "address": "0xresearcher456", "name": "Dr. Smith", "organization": "MIT BCS" }
  ],
  "expiry": "2027-06-30T23:59:59Z",
  "purposes": ["alzheimers_detection", "bci_research"],
  "revocable": true,
  "privacyBudget": { "epsilon": 0.05, "delta": 1e-6 },
  "issuedAt": "2026-03-01T10:00:00Z",
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-03-01T10:00:01Z",
    "verificationMethod": "did:pkh:eip155:84532:0xabc123#key-1",
    "proofPurpose": "assertionMethod",
    "jws": "MEQCIBKmJr8Xk..."
  }
}
```

### Revoked Manifest

```json
{
  "@context": {
    "@vocab": "https://neuralcommons.org/ncd/v0.1#",
    "schema": "https://schema.org/"
  },
  "id": "ncd://did:pkh:eip155:84532:0xabc/sha256:xyz/grant-003",
  "type": "NeuralConsentDescriptor",
  "ownerDID": "did:pkh:eip155:84532:0xabc123",
  "dataTypes": ["band_powers"],
  "grantees": [{ "address": "0xformerpartner" }],
  "expiry": "2026-06-01T00:00:00Z",
  "purposes": ["product_development"],
  "revocable": true,
  "privacyBudget": { "epsilon": 0.2, "delta": 1e-5 },
  "issuedAt": "2025-01-01T00:00:00Z",
  "revocationRecord": {
    "revokedAt": "2025-06-15T14:30:00Z",
    "reason": "Partnership terminated",
    "keyDestructionProof": "0xdeadbeef..."
  }
}
```
