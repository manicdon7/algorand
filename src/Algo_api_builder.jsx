import React, { useState, useEffect } from 'react';
import algosdk, { Algodv2 } from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import axios from 'axios';
import { request, gql } from 'graphql-request';

const API_KEY = 'BQYprhw0lsQDm1T1nKKi6izOwlettE7C';

const AlgoApiBuilder = () => {
  const [userWalletAddress, setUserWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [assetBalances, setAssetBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [genesisData, setGenesisData] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
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

      // Fetch account balance and assets
      const accountInfo = await algodClient.accountInformation(address).do();
      console.log('Account Information:', accountInfo);
      setBalance(algosdk.microalgosToAlgos(accountInfo.amount)); // Convert microAlgos to Algos

      // Fetch asset balances
      const assets = accountInfo.assets.map(asset => ({
        id: asset['asset-id'],
        amount: asset.amount,
        isFrozen: asset['is-frozen'],
      }));
      console.log('Asset Balances:', assets);
      setAssetBalances(assets);

      // Fetch transaction history using Indexer
      fetchTransactionHistory(address);

      // Fetch pending transactions
      const pendingTxns = await algodClient.pendingTransactionByAddress(address).do();
      console.log('Pending Transactions:', pendingTxns);
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
  
    const variables = {
      network: 'testnet',
      address,
      limit: 10,
      offset: 0,
      from: '2023-01-01',
      till: new Date().toISOString(),
    };
  
    try {
      const headers = {
        Authorization: `Bearer ${API_KEY}`,
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
      console.log('Starting transaction process...');
  
      const algodServer = 'https://testnet-api.algonode.cloud';
      const algodClient = new algosdk.Algodv2('', algodServer, '');
      console.log('Algod client initialized.');
  
      // Fetch suggested transaction parameters from the network
      const params = await algodClient.getTransactionParams().do();
      console.log('Transaction parameters:', params);
  
      // Construct the payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: userWalletAddress,
        to: recipientAddress, // Ensure this is a valid Algorand address
        amount: algosdk.algosToMicroalgos(sendAmount), // Convert Algos to microAlgos
        suggestedParams: params,
      });
      console.log('Transaction object created:', txn);
  
      // Wrap the transaction object for Pera Wallet
      const transactions = [{ txn: txn }];
      console.log('Transactions wrapped for Pera Wallet:', transactions);
  
      // Sign the transaction with Pera Wallet
      console.log('Attempting to sign transaction with Pera Wallet...');
      const signedTxn = await peraWallet.signTransaction([transactions]);
  
      if (signedTxn) {
        console.log('Signed transaction:', signedTxn);
  
        // Convert the signed transaction to a byte array for sending
        const signedTxnBytes = signedTxn.map((signed) => new Uint8Array(signed));
        console.log('Signed transaction byte array:', signedTxnBytes);
  
        // Send the transaction to the Algorand network
        const response = await algodClient.sendRawTransaction(signedTxnBytes).do();
        console.log('Transaction response from network:', response);
  
        alert(`Transaction successful with ID: ${response.txId}`);
      } else {
        console.log('User may have canceled the signing request.');
      }
    } catch (error) {
      if (error.message && error.message.includes('cancelled')) {
        console.log('Transaction signing was canceled by the user.');
        alert('Transaction was canceled.');
      } else {
        console.error('Failed to send transaction:', error);
        alert('Failed to send transaction. Check the console for more details.');
      }
    }
  };

  return (
    <div className="App bg-white pb-64 pt-5">
      <h1 className='text-center my-10 text-4xl font-medium'>Algorand Pera Wallet App</h1>

      <div className="flex justify-center gap-6 flex-wrap my-7">
        <button className="connect_wallet" onClick={handleConnectWallet}>Connect Wallet!</button>
        <div id="wallet-info" className="wallet-info py-3 px-4 border-2">
          <span className="address text-wrap">Wallet Address: {userWalletAddress}</span><br />
          <span className="balance">Balance: {balance !== null ? `${balance} ALGO` : 'N/A'}</span>
        </div>
      </div>

      <div className="send-transaction mb-10">
        <h2 className="text-center text-2xl mb-5">Send Transaction</h2>
        <div className="flex flex-col items-center">
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="border p-2 mb-4"
          />
          <input
            type="number"
            placeholder="Amount (in ALGO)"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            className="border p-2 mb-4"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSendTransaction}>
            Send Transaction
          </button>
        </div>
      </div>

      <div className="asset-balances mb-10">
        <h2 className="text-center text-2xl mb-5">Asset Balances</h2>
        {assetBalances.length > 0 ? (
          <ul className="list-disc pl-10">
            {assetBalances.map((asset, index) => (
              <li key={index}>
                <p><strong>Asset ID:</strong> {asset.id}</p>
                <p><strong>Amount:</strong> {asset.amount}</p>
                <p><strong>Frozen:</strong> {asset.isFrozen ? 'Yes' : 'No'}</p>
                <hr className="my-4" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center">No assets found for this account.</p>
        )}
      </div>

      <div className="transaction-history mb-10">
        <h2 className="text-center text-2xl mb-5">Transaction History</h2>
        {transactions.length > 0 ? (
          <ul className="list-disc pl-10">
            {transactions.map((txn, index) => (
              <li key={index}>
                <p><strong>Transaction ID:</strong> {txn.id}</p>
                <p><strong>Amount:</strong> {algosdk.microalgosToAlgos(txn['payment-transaction']?.amount || 0)} ALGO</p>
                <p><strong>Sender:</strong> {txn.sender}</p>
                <p><strong>Receiver:</strong> {txn['payment-transaction']?.receiver}</p>
                <p><strong>Note:</strong> {txn.note ? new TextDecoder().decode(txn.note) : 'N/A'}</p>
                <hr className="my-4" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center">No transactions found for this account.</p>
        )}
      </div>

      <div className="pending-transaction-history">
        <h2 className="text-center text-2xl mb-5">Pending Transactions</h2>
        {pendingTransactions.length > 0 ? (
          <ul className="list-disc pl-10">
            {pendingTransactions.map((txn, index) => (
              <li key={index}>
                <p><strong>Transaction ID:</strong> {txn.txn.txid}</p>
                <p><strong>Amount:</strong> {algosdk.microalgosToAlgos(txn.txn['amt'] || 0)} ALGO</p>
                <p><strong>Sender:</strong> {txn.txn.snd}</p>
                <p><strong>Receiver:</strong> {txn.txn['rcv']}</p>
                <hr className="my-4" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center">No pending transactions found for this account.</p>
        )}
      </div>
      <div className="genesis-info">
      <h1 className="text-center text-2xl mb-5">Algorand Genesis Information</h1>
      {genesisData ? (
        <pre className="bg-gray-100 p-4 rounded shadow">
          {JSON.stringify(genesisData, null, 2)}
        </pre>
      ) : (
        <p>Loading genesis information...</p>
      )}
    </div>
    </div>
  );
};

export default AlgoApiBuilder;
