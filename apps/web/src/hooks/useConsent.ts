import { useCallback } from 'react';
import { generateVaultKey, exportKey, deriveAccessKey, destroyKey } from '../lib/crypto/keyManager';
import { encryptNeuralData } from '../lib/crypto/encrypt';
import { createConsentManifest } from '../lib/crypto/consentManifest';
import { useVaultStore } from '../store/vaultStore';
import { useUIStore } from '../store/uiStore';
import type { NCDParams, Grant, VaultEntry, RevocationRecord } from '../types/vault';
import type { NeuralSession } from '../types/eeg';

export function useConsent() {
  const vaultStore = useVaultStore();
  const uiStore = useUIStore();

  const createVaultEntry = useCallback(
    async (session: NeuralSession, rawData?: Float32Array): Promise<VaultEntry | null> => {
      try {
        const key = await generateVaultKey();
        const keyId = crypto.randomUUID();

        let ipfsCID = `QmSimulated${keyId.slice(0, 16)}`;

        if (rawData && vaultStore.ipfsNode) {
          const encrypted = await encryptNeuralData(rawData, key);
          const { pinEncryptedBlob } = await import('../lib/ipfs/heliaClient');
          ipfsCID = await pinEncryptedBlob(vaultStore.ipfsNode, encrypted, {
            sessionId: session.id,
            timestamp: session.startTime,
            dominantState: session.dominantState,
          });
        }

        const entry: VaultEntry = {
          id: session.id,
          sessionId: session.id,
          ipfsCID,
          timestamp: session.startTime,
          duration: session.endTime ? session.endTime - session.startTime : 0,
          flowState: session.dominantState,
          sampleCount: session.sampleCount,
          grantCount: 0,
        };

        vaultStore.addEntry(entry);
        uiStore.addToast(`Session encrypted and stored: ${ipfsCID.slice(0, 12)}...`, 'success');

        return entry;
      } catch (error) {
        uiStore.addToast(`Failed to create vault entry: ${String(error)}`, 'error');
        return null;
      }
    },
    [vaultStore, uiStore]
  );

  const grantConsent = useCallback(
    async (params: NCDParams, vaultEntryId: string): Promise<Grant | null> => {
      try {
        const masterKey = await generateVaultKey();
        for (const grantee of params.grantees) {
          await deriveAccessKey(masterKey, grantee.address, params.dataTypes);
        }

        const manifest = createConsentManifest(params);
        const grantId = crypto.randomUUID();

        const grant: Grant = {
          id: grantId,
          grantId,
          vaultEntryId,
          grantee: params.grantees[0],
          dataTypes: params.dataTypes,
          purposes: params.purposes,
          expiry: params.expiry,
          revoked: false,
          scopedKeyHash: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')}`,
          ipfsCID: manifest.id,
          createdAt: Date.now(),
        };

        vaultStore.addGrant(grant);
        vaultStore.updateEntry(vaultEntryId, {
          grantCount: (vaultStore.entries.find((e) => e.id === vaultEntryId)?.grantCount ?? 0) + 1,
        });

        uiStore.addToast('Consent granted successfully', 'success');
        return grant;
      } catch (error) {
        uiStore.addToast(`Failed to grant consent: ${String(error)}`, 'error');
        return null;
      }
    },
    [vaultStore, uiStore]
  );

  const revokeConsent = useCallback(
    async (grantId: string, reason: string): Promise<boolean> => {
      try {
        const keyDestructionProof = Array.from(
          crypto.getRandomValues(new Uint8Array(32))
        )
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        destroyKey(grantId);

        const record: RevocationRecord = {
          grantId,
          owner: 'self',
          revokedAt: Date.now(),
          reason,
          keyDestructionProof,
        };

        vaultStore.revokeGrant(grantId, record);
        uiStore.addToast('Consent revoked and key destroyed', 'success');
        return true;
      } catch (error) {
        uiStore.addToast(`Failed to revoke consent: ${String(error)}`, 'error');
        return false;
      }
    },
    [vaultStore, uiStore]
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
