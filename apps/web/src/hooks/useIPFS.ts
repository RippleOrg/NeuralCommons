import { useEffect, useRef, useCallback } from 'react';
import { createHeliaNode } from '../lib/ipfs/heliaClient';
import { useVaultStore } from '../store/vaultStore';
import type { HeliaNode } from '../lib/ipfs/heliaClient';
import type { EncryptedBlob } from '../types/vault';

export function useIPFS() {
  const store = useVaultStore();
  const nodeRef = useRef<HeliaNode | null>(null);
  const peerCountInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const node = await createHeliaNode();
        if (!mounted) {
          await node.stop();
          return;
        }
        nodeRef.current = node;
        store.setIPFSNode(node);

        // Poll peer count
        peerCountInterval.current = setInterval(() => {
          if (nodeRef.current) {
            store.setPeerCount(nodeRef.current.getPeerCount());
          }
        }, 2000);
      } catch (error) {
        console.error('Failed to create Helia node:', error);
      }
    };

    void init();

    return () => {
      mounted = false;
      if (peerCountInterval.current) {
        clearInterval(peerCountInterval.current);
      }
      if (nodeRef.current) {
        void nodeRef.current.stop();
        nodeRef.current = null;
        store.setIPFSNode(null);
      }
    };
  }, [store]);

  const pin = useCallback(
    async (blob: EncryptedBlob, metadata: Record<string, unknown>): Promise<string> => {
      if (!nodeRef.current) throw new Error('IPFS node not ready');

      store.setPinning(true);
      try {
        const { pinEncryptedBlob } = await import('../lib/ipfs/heliaClient');
        const cid = await pinEncryptedBlob(nodeRef.current, blob, metadata);
        return cid;
      } finally {
        store.setPinning(false);
      }
    },
    [store]
  );

  const fetch = useCallback(
    async (cid: string): Promise<EncryptedBlob> => {
      if (!nodeRef.current) throw new Error('IPFS node not ready');
      const { fetchBlob } = await import('../lib/ipfs/heliaClient');
      return fetchBlob(nodeRef.current, cid);
    },
    []
  );

  return {
    node: store.ipfsNode,
    ready: store.ipfsNode !== null,
    pinning: store.pinning,
    peerCount: store.peerCount,
    pin,
    fetch,
  };
}
