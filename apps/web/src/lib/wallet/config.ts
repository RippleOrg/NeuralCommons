import { QueryClient } from '@tanstack/react-query';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  safeWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getRuntimeConfig } from '../runtime';

const runtimeConfig = getRuntimeConfig();

export const appChains = [sepolia] as const;

const walletFactories = [
  metaMaskWallet,
  rabbyWallet,
  injectedWallet,
  safeWallet,
  ...(runtimeConfig.walletConnectProjectId ? [walletConnectWallet] : []),
];

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: walletFactories,
    },
  ],
  {
    appName: 'NeuralCommons',
    projectId: runtimeConfig.walletConnectProjectId ?? '',
  }
);

export const wagmiConfig = createConfig({
  chains: appChains,
  connectors,
  transports: {
    [sepolia.id]: http(runtimeConfig.rpcUrl),
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
