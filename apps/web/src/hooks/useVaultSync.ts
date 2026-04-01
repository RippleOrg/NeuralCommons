import { useEffect } from 'react';
import type { Address } from 'viem';
import { fetchOwnerGrants, fetchRevocationHistory, fetchVaultEntries } from '../lib/contracts/service';
import { useWallet } from './useWallet';
import { useVaultStore } from '../store/vaultStore';

export function useVaultSync() {
  const { address } = useWallet();
  const setEntries = useVaultStore((state) => state.setEntries);
  const setGrants = useVaultStore((state) => state.setGrants);
  const setRevocations = useVaultStore((state) => state.setRevocations);

  useEffect(() => {
    let active = true;

    if (!address) {
      setEntries([]);
      setGrants([]);
      setRevocations([]);
      return () => {
        active = false;
      };
    }

    void (async () => {
      const entries = await fetchVaultEntries(address as Address);
      const grants = await fetchOwnerGrants(address as Address, entries);
      const revocations = await fetchRevocationHistory();

      if (!active) {
        return;
      }

      setEntries(entries);
      setGrants(grants);
      setRevocations(revocations);
    })();

    return () => {
      active = false;
    };
  }, [address, setEntries, setGrants, setRevocations]);
}