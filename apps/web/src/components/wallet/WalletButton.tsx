import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/Button';

export const WalletButton: React.FC = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <Button variant="primary" size="sm" onClick={openConnectModal}>
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button variant="danger" size="sm" onClick={openChainModal}>
              Wrong Network
            </Button>
          );
        }

        return (
          <Button variant="ghost" size="sm" onClick={openAccountModal}>
            {account.displayName}
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
};