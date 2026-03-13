import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const displayName = ensName ?? truncatedAddress;

  const connectWallet = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return {
    address,
    isConnected,
    isConnecting,
    chain,
    displayName,
    ensName,
    truncatedAddress,
    connect: connectWallet,
    disconnect,
    connectors,
  };
}
