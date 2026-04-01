import { useAccount, useDisconnect, useEnsName } from 'wagmi';
import { useAccountModal, useChainModal, useConnectModal } from '@rainbow-me/rainbowkit';

export function useWallet() {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { openConnectModal } = useConnectModal();

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const displayName = ensName ?? truncatedAddress;

  return {
    address,
    isConnected,
    isConnecting,
    chain,
    isUnsupported: Boolean(chain && chain.id !== 11155111),
    displayName,
    ensName,
    truncatedAddress,
    connect: () => openConnectModal?.(),
    openAccount: () => openAccountModal?.(),
    openChain: () => openChainModal?.(),
    disconnect,
  };
}
