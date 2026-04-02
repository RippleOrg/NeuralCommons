import { useCallback } from 'react';
import { deriveAccessKey, destroyKey, generateVaultKey, storeKey } from '../lib/crypto/keyManager';
import { encryptJsonPayload } from '../lib/crypto/encrypt';
import { createConsentManifest } from '../lib/crypto/consentManifest';
import {
  anchorDatasetOnChain,
  ensureVaultRegistration,
  grantAccessOnChain,
  revokeAccessOnChain,
} from '../lib/contracts/service';
import { getRuntimeConfig } from '../lib/runtime';
import { buildDatasetBundle, buildDefaultManifestParams } from '../lib/sessionPackage';
import { persistDatasetBundle } from '../lib/storage/provider';
import { useVaultStore } from '../store/vaultStore';
import { useUIStore } from '../store/uiStore';
import { useWallet } from './useWallet';
import type { Grant, NCDParams, RevocationRecord, VaultEntry } from '../types/vault';
import type { NeuralSession } from '../types/eeg';

const FALLBACK_OWNER = '0x0000000000000000000000000000000000000000';

export function useConsent() {
  const vaultStore = useVaultStore();
  const uiStore = useUIStore();
  const { address } = useWallet();
  const runtimeConfig = getRuntimeConfig();

  const createVaultEntry = useCallback(
    async (session: NeuralSession): Promise<VaultEntry | null> => {
      if (!address) {
        throw new Error('Connect a Sepolia wallet before sealing a session.');
      }

      if (!session.endTime) {
        throw new Error('Stop the current session before sealing it into the vault.');
      }

      if (session.features.length === 0) {
        throw new Error('No EEG features were captured for this session.');
      }

      const ownerAddress = address ?? FALLBACK_OWNER;

      try {
        const vaultKey = await generateVaultKey();
        const keyId = storeKey(vaultKey);
        const encrypted = await encryptJsonPayload(
          {
            dominantState: session.dominantState,
            features: session.features,
            sampleCount: session.sampleCount,
          },
          vaultKey
        );

        const manifestParams = buildDefaultManifestParams(session, ownerAddress);
        const bundle = await buildDatasetBundle({
          session,
          ownerAddress,
          encrypted,
          manifestParams,
          litRecipients: [],
        });

        const storage = await persistDatasetBundle(bundle);
        const storageReference = storage.provider === 'storacha' ? storage.cid : storage.uri;

        await ensureVaultRegistration(storageReference);
        await anchorDatasetOnChain({
          storageReference,
          datasetHash: bundle.datasetHash,
          sampleCount: session.sampleCount,
          featureCount: session.features.length,
          flowState: session.dominantState,
        });

        const entry: VaultEntry = {
          id: session.id,
          sessionId: session.id,
          ipfsCID: storageReference,
          storageUri: storage.uri,
          storageProvider: storage.provider,
          timestamp: session.startTime,
          duration: session.endTime - session.startTime,
          flowState: session.dominantState,
          sampleCount: session.sampleCount,
          featureCount: session.features.length,
          datasetHash: bundle.datasetHash,
          grantCount: 0,
          manifestId: bundle.manifest.id,
          provenanceCID: bundle.provenance?.cid,
        };

        vaultStore.addEntry(entry);
        uiStore.logActivity({
          title: 'Vault sealed',
          message: storage.degraded
            ? `Session ${session.id.slice(0, 8)} fell back to local encrypted retention because remote archival was unavailable.`
            : `Session ${session.id.slice(0, 8)} stored with ${storage.provider === 'storacha' ? 'Storacha' : 'local'} encrypted retention.`,
          tone: storage.degraded ? 'warning' : 'success',
        });
        uiStore.addToast(
          storage.degraded
            ? `Session sealed locally after Storacha fallback: ${storage.note ?? 'remote archival unavailable'}`
            : `Session sealed into the vault via ${storage.provider}`,
          storage.degraded ? 'warning' : 'success'
        );

        // Keep the key in memory for the current browser session only.
        vaultStore.updateEntry(entry.id, {
          encryptedMetaCID: keyId,
        });

        return entry;
      } catch (error) {
        uiStore.addToast(`Failed to create vault entry: ${String(error)}`, 'error');
        return null;
      }
    },
    [address, uiStore, vaultStore]
  );

  const grantConsent = useCallback(
    async (params: NCDParams, vaultEntryId: string): Promise<Grant | null> => {
      const ownerAddress = address ?? FALLBACK_OWNER;

      try {
        if (!address) {
          throw new Error('Connect a Sepolia wallet before granting consent.');
        }

        const masterKey = await generateVaultKey();
        const scopedKeys = await Promise.all(
          params.grantees.map((grantee) => deriveAccessKey(masterKey, grantee.address, params.dataTypes))
        );
        const keyIds = scopedKeys.map((key) => storeKey(key));
        const scopedKeyMaterial = keyIds.join(',');
        const manifest = createConsentManifest({
          ...params,
          ownerDID: params.ownerDID || `did:pkh:eip155:${runtimeConfig.chainId}:${ownerAddress}`,
        });
        const currentEntry = vaultStore.entries.find((entry) => entry.id === vaultEntryId);
        if (!currentEntry) {
          throw new Error('Vault entry not found');
        }

        const grantId = await grantAccessOnChain({
          grantee: params.grantees[0].address as `0x${string}`,
          dataTypes: params.dataTypes,
          purposes: params.purposes,
          expiry: params.expiry,
          storageReference: currentEntry.ipfsCID,
          scopedKeyHash: scopedKeyMaterial,
        });

        const grant: Grant = {
          id: grantId,
          grantId,
          vaultEntryId,
          grantee: params.grantees[0],
          dataTypes: params.dataTypes,
          purposes: params.purposes,
          expiry: params.expiry,
          revoked: false,
          scopedKeyHash: scopedKeyMaterial,
          ipfsCID: currentEntry.ipfsCID,
          createdAt: Date.now(),
          permissionNetwork: 'lit',
        };

        vaultStore.addGrant(grant);
        vaultStore.updateEntry(vaultEntryId, {
          grantCount: (currentEntry?.grantCount ?? 0) + 1,
        });

        uiStore.logActivity({
          title: 'Consent granted',
          message: `Access granted to ${grant.grantee.address} for ${grant.dataTypes.join(', ')}.`,
          tone: 'info',
        });
        uiStore.addToast('Consent granted successfully', 'success');
        return grant;
      } catch (error) {
        uiStore.addToast(`Failed to grant consent: ${String(error)}`, 'error');
        return null;
      }
    },
    [address, uiStore, vaultStore]
  );

  const revokeConsent = useCallback(
    async (grantId: string, reason: string): Promise<boolean> => {
      try {
        const grant = vaultStore.grants.find((item) => item.grantId === grantId);
        if (!grant) {
          throw new Error('Grant not found');
        }

        grant.scopedKeyHash
          .split(',')
          .filter(Boolean)
          .forEach((keyId) => destroyKey(keyId));

        const keyDestructionProof = crypto.randomUUID().replace(/-/g, '').padEnd(64, '0').slice(0, 64);

        await revokeAccessOnChain(grantId, reason, keyDestructionProof);

        const record: RevocationRecord = {
          grantId,
          owner: address ?? FALLBACK_OWNER,
          revokedAt: Date.now(),
          reason,
          keyDestructionProof,
        };

        vaultStore.revokeGrant(grantId, record);
        uiStore.logActivity({
          title: 'Consent revoked',
          message: `Grant ${grantId.slice(0, 8)} was revoked and the scoped key material was destroyed.`,
          tone: 'warning',
        });
        uiStore.addToast('Consent revoked and key destroyed', 'success');
        return true;
      } catch (error) {
        uiStore.addToast(`Failed to revoke consent: ${String(error)}`, 'error');
        return false;
      }
    },
    [address, uiStore, vaultStore]
  );

  return {
    entries: vaultStore.entries,
    grants: vaultStore.grants,
    revocations: vaultStore.revocations,
    createVaultEntry,
    grantConsent,
    revokeConsent,
  };
}
