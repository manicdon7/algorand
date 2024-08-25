import React, { useState, useEffect } from 'react';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// Define and export the ConnectButton component
export function ConnectButton() {
  return <w3m-button />;
}

// 1. Get projectId
const projectId = 'd11f3042e02e3799bbd7de9a4a0ecd57';

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

const sepolia = {
    chainId: 11155111, // Chain ID for Sepolia
    name: 'Sepolia',
    currency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io', // Sepolia-specific Etherscan URL
    rpcUrl: 'https://rpc.sepolia.org' // Sepolia RPC URL
  };

  const algorandTestnet = {
    chainId: 'algorand-testnet', // Algorand Testnet does not use traditional chain IDs like Ethereum, so you can use a descriptive identifier.
    name: 'Algorand Testnet',
    currency: 'ALGO',
    explorerUrl: 'https://testnet.algoexplorer.io', // Algorand Testnet Explorer URL
    rpcUrl: 'https://testnet-api.algonode.cloud' // Popular RPC URL for Algorand Testnet
  };
  
  
// 3. Create a metadata object
const metadata = {
  name: 'Algorand Wallet',
  description: 'My Algo Wallet',
  url: 'https://mywebsite.com', // origin must match your domain & subdomain
  icons: ['https://avatars.mywebsite.com/']
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true, // Optional - true by default
  enableInjected: true, // Optional - true by default
  enableCoinbase: true, // Optional - true by default
  rpcUrl: '...', // used for the Coinbase SDK
  defaultChainId: 1 // used for the Coinbase SDK
});

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [mainnet, sepolia, algorandTestnet],
  projectId,
  enableAnalytics: true 
});

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletProvider, setWalletProvider] = useState(null);

  const handleConnect = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert('No Ethereum provider found');
        return;
      }

      const provider = ethereum;
      setWalletProvider(provider);

      await provider.request({ method: 'eth_requestAccounts' });
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  useEffect(() => {
    if (walletProvider) {
      const handleDisconnect = () => {
        setIsConnected(false);
        console.log('Disconnected from the wallet');
        alert('Wallet disconnected. Please reconnect.');
      };
  
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          console.log('No accounts available, disconnected');
        } else {
          setIsConnected(true);
        }
      };
  
      // Attach event listeners
      walletProvider.on('disconnect', handleDisconnect);
      walletProvider.on('accountsChanged', handleAccountsChanged);
  
      // Cleanup event listeners on component unmount
      return () => {
        if (walletProvider.removeListener) {
          walletProvider.removeListener('disconnect', handleDisconnect);
          walletProvider.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletProvider]);
  
  return (
    <div>
      <header>
        <h1>Web3Modal Example</h1>
      </header>
      <main>
        <ConnectButton />
      </main>
    </div>
  );
}

export default App;
