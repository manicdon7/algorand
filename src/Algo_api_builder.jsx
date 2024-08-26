import React, { useState, useEffect } from 'react';
import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import axios from 'axios';
import { request, gql } from 'graphql-request';
import { Switch } from '@headlessui/react';

const API_KEY = process.env.REACT_APP_API_KEY;

const AlgoApiBuilder = () => {
  const [userWalletAddress, setUserWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [assetBalances, setAssetBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [genesisData, setGenesisData] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [peraWallet] = useState(new PeraWalletConnect());

  useEffect(() => {
    const savedAddress = window.localStorage.getItem('userWalletAddress');
    if (savedAddress) {
      setUserWalletAddress(savedAddress);
      fetchAccountData(savedAddress);
      fetchGenesisData();
    }

    peraWallet.reconnectSession()
      .then(accounts => {
        if (accounts.length > 0) {
          const connectedAddress = accounts[0];
          setUserWalletAddress(connectedAddress);
          window.localStorage.setItem('userWalletAddress', connectedAddress);
          fetchAccountData(connectedAddress);
        }
      })
      .catch(error => {
        console.error('Failed to reconnect Pera Wallet:', error);
      });
  }, [peraWallet]);

  const handleConnectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      const selectedAccount = newAccounts[0];
      setUserWalletAddress(selectedAccount);
      window.localStorage.setItem('userWalletAddress', selectedAccount);
      fetchAccountData(selectedAccount);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    }
  };

  const fetchAccountData = async (address) => {
    try {
      const algodServer = 'https://testnet-api.algonode.cloud';
      const algodClient = new algosdk.Algodv2('', algodServer, '');

      const accountInfo = await algodClient.accountInformation(address).do();
      setBalance(algosdk.microalgosToAlgos(accountInfo.amount));

      const assets = accountInfo.assets.map(asset => ({
        id: asset['asset-id'],
        amount: asset.amount,
        isFrozen: asset['is-frozen'],
      }));
      setAssetBalances(assets);

      fetchTransactionHistory(address);

      const pendingTxns = await algodClient.pendingTransactionByAddress(address).do();
      setPendingTransactions(pendingTxns.truncatedTxns?.transactions || []);
    } catch (error) {
      console.error('Failed to fetch account data:', error);
    }
  };

  const fetchTransactionHistory = async (address) => {
    const query = gql`
      query (
        $network: AlgorandNetwork!, 
        $address: String!, 
        $limit: Int!, 
        $offset: Int!, 
        $from: ISO8601DateTime, 
        $till: ISO8601DateTime
      ) {
        algorand(network: $network) {
          transactions(
            options: {desc: "block.timestamp.time", limit: $limit, offset: $offset}
            date: {since: $from, till: $till}
            txSender: {is: $address}
          ) {
            block {
              timestamp {
                time(format: "%Y-%m-%d %H:%M:%S")
              }
              height
            }
            hash
            type
            fee
            fee_usd: fee(in: USD)
            currency {
              tokenId
              symbol
            }
          }
        }
      }
    `;
  
    const getDynamicDates = () => {
      const currentDate = new Date();
      const pastDate = new Date();
      
      // Set the past date to 10 years ago
      pastDate.setFullYear(pastDate.getFullYear() - 10);
    
      return {
        from: pastDate.toISOString(), // Convert to ISO8601 format
        till: currentDate.toISOString() // Convert to ISO8601 format
      };
    };
    
    const { from, till } = getDynamicDates();
    
    const variables = {
      network: 'algorand_testnet', // Network should be of type AlgorandNetwork
      address,
      limit: 10, // Adjust the limit as needed
      offset: 0, // Adjust the offset for pagination
      from, // Dynamically set the past date
      till, // Dynamically set the current date
    };
    
  
    try {
      const headers = {
        Authorization: `Bearer ${API_KEY}`, // Ensure you replace API_KEY with your actual token
      };
  
      const endpoint = 'https://graphql.bitquery.io';
      const data = await request(endpoint, query, variables, headers);
      console.log('Transaction History:', data.algorand.transactions);
  
      // Handle the transactions data as needed
      setTransactions(data.algorand.transactions);
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
    }
  };
  
  const fetchGenesisData = async () => {
    try {
      const baseUrl = 'https://testnet-api.algonode.cloud';
      const response = await axios.get(`${baseUrl}/genesis`);

      console.log('Genesis Data:', response.data);
      setGenesisData(response.data);
    } catch (error) {
      console.error('Failed to fetch genesis data:', error);
    }
  };

  const handleSendTransaction = async () => {
    try {
      const algodServer = 'https://testnet-api.algonode.cloud';
      const algodClient = new algosdk.Algodv2('', algodServer, '');

      const params = await algodClient.getTransactionParams().do();

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: userWalletAddress,
        to: recipientAddress,
        amount: algosdk.algosToMicroalgos(sendAmount),
        suggestedParams: params,
      });

      const transactions = [{ txn: txn }];
      const signedTxn = await peraWallet.signTransaction([transactions]);

      if (signedTxn) {
        const signedTxnBytes = signedTxn.map((signed) => new Uint8Array(signed));
        const response = await algodClient.sendRawTransaction(signedTxnBytes).do();
        alert(`Transaction successful with ID: ${response.txId}`);
      }
    } catch (error) {
      if (error.message && error.message.includes('cancelled')) {
        alert('Transaction was canceled.');
      } else {
        alert('Failed to send transaction. Check the console for more details.');
      }
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen transition-all bg-gradient-to-r from-purple-500 via-pink-500 to-red-500`}>
      <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 min-h-screen p-6 transition-all">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Algorand Pera Wallet DApp</h1>
          <Switch
            checked={darkMode}
            onChange={setDarkMode}
            className={`${darkMode ? 'bg-blue-600' : 'bg-gray-300'}
              relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Enable dark mode</span>
            <span
              className={`${darkMode ? 'translate-x-6' : 'translate-x-1'}
                inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>

        <div className="flex flex-col items-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all duration-300 mb-4"
            onClick={handleConnectWallet}
          >
            {userWalletAddress ? 'Connected' : 'Connect Wallet'}
          </button>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center mb-8 w-full max-w-md transition-all">
            <p className="text-lg font-semibold mb-2">Wallet Address:</p>
            <p className="break-words">{userWalletAddress || 'N/A'}</p>
            <p className="mt-4 text-lg font-semibold">Balance: {balance !== null ? `${balance} ALGO` : 'N/A'}</p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-white">Send Transaction</h2>
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full mb-4 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Amount (in ALGO)"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              className="w-full mb-4 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg w-full shadow-lg transition-all duration-300"
              onClick={handleSendTransaction}
            >
              Send Transaction
            </button>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Transaction History</h2>
          {transactions.length > 0 ? (
            <ul className="space-y-4">
              {transactions.map((txn, index) => (
                <li key={index} className="p-4 rounded-lg bg-white dark:bg-gray-700 shadow-md">
                  <p><strong>Transaction Hash:</strong> {txn.hash}</p>
                  <p><strong>Block Height:</strong> {txn.block.height}</p>
                  <p><strong>Timestamp:</strong> {txn.block.timestamp.time}</p>
                  <p><strong>Transaction Type:</strong> {txn.type}</p>
                  <p><strong>Currency:</strong> {txn.currency.symbol}</p>
                  <p><strong>Fee:</strong> {txn.fee} ALGO</p>
                  <p><strong>Fee (in USD):</strong> ${txn.fee_usd}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-white">No transactions found for this account.</p>
          )}
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Pending Transactions</h2>
          {pendingTransactions.length > 0 ? (
            <ul className="space-y-4">
              {pendingTransactions.map((txn, index) => (
                <li key={index} className="p-4 rounded-lg bg-white dark:bg-gray-700 shadow-md">
                  <p><strong>Transaction ID:</strong> {txn.txn.txid}</p>
                  <p><strong>Amount:</strong> {algosdk.microalgosToAlgos(txn.txn['amt'] || 0)} ALGO</p>
                  <p><strong>Sender:</strong> {txn.txn.snd}</p>
                  <p><strong>Receiver:</strong> {txn.txn['rcv']}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-white">No pending transactions found for this account.</p>
          )}
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-white">Algorand Genesis Information</h2>
          {genesisData ? (
            <pre className="bg-gray-200 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
              {JSON.stringify(genesisData, null, 2)}
            </pre>
          ) : (
            <p className="text-white">Loading genesis information...</p>
          )}
        </div>
      </div>
    </div>
); 
};

export default AlgoApiBuilder;