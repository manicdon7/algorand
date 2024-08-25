import React, { useState, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import axios from 'axios';

// Initialize Pera Wallet Connect
const peraWallet = new PeraWalletConnect();
const BITQUERY_API_URL = 'https://graphql.bitquery.io';
const BITQUERY_API_KEY = 'BQYprhw0lsQDm1T1nKKi6izOwlettE7C'; // Replace with your Bitquery API key

const AlgotestnetTransaction = () => {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);

  // Function to connect to Pera Wallet and get the address
  const connectPeraWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      if (accounts.length > 0) {
        const connectedAddress = accounts[0];
        setAddress(connectedAddress);
        localStorage.setItem('connectedAddress', connectedAddress); // Store the connected address
        return connectedAddress;
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('Error connecting to Pera Wallet:', error);
      setError('Failed to connect to Pera Wallet');
      return null;
    }
  };

  // Fetch balance using Bitquery API
  const fetchBalance = async (address) => {
    const query = `
      query ($network: AlgorandNetwork!, $address: String!) {
        algorand(network: $network) {
          account(address: {is: $address}) {
            balance
          }
        }
      }
    `;

    const variables = {
      network: "algorand_testnet",
      address: address,
    };

    try {
      const response = await axios.post(
        BITQUERY_API_URL,
        { query, variables },
        {
          headers: {
            'X-API-KEY': BITQUERY_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      const balanceData = response.data?.data?.algorand?.account?.[0]?.balance;
      if (balanceData !== undefined) {
        return balanceData;
      } else {
        throw new Error('Balance data not found');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setError('Failed to fetch balance');
      return null;
    }
  };

  // Fetch transactions using Bitquery API
  const fetchTransactions = async (address) => {
    const query = `
      query ($network: AlgorandNetwork!, $address: String!, $from: ISO8601DateTime, $till: ISO8601DateTime, $limit: Int!, $offset: Int!) {
        algorand(network: $network) {
          transfers(
            date: {since: $from, till: $till}
            amount: {gt: 0}
            any: [{receiver: {is: $address}}, {sender: {is: $address}}]
            options: {limit: $limit, offset: $offset, desc: ["count_in", "count_out"], asc: "currency.symbol"}
          ) {
            sum_in: amount(calculate: sum, receiver: {is: $address})
            sum_out: amount(calculate: sum, sender: {is: $address})
            count_in: count(receiver: {is: $address})
            count_out: count(sender: {is: $address})
            currency {
              tokenId
              symbol
            }
            receiver {
              address
            }
            sender {
              address
            }
            amount
            date {
              date
            }
          }
        }
      }
    `;

    const variables = {
      network: "algorand_testnet",
      address: address,
      from: "2024-08-18",
      till: "2024-08-25T23:59:59",
      limit: 10,
      offset: 0,
    };

    try {
      const response = await axios.post(
        BITQUERY_API_URL,
        { query, variables },
        {
          headers: {
            'X-API-KEY': BITQUERY_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      const transfers = response.data?.data?.algorand?.transfers;
      if (transfers) {
        return transfers;
      } else {
        throw new Error('Transactions data not found');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
      return null;
    }
  };

  // Handle the connect button click
  const handleConnect = async () => {
    const connectedAddress = await connectPeraWallet();
    if (connectedAddress) {
      setAddress(connectedAddress);
    }
  };

  // Fetch balance and transactions when the address is available
  useEffect(() => {
    const getBalanceAndTransactions = async () => {
      if (address) {
        const balanceData = await fetchBalance(address);
        setBalance(balanceData);

        const transactionsData = await fetchTransactions(address);
        setTransactions(transactionsData);
      }
    };

    getBalanceAndTransactions();
  }, [address]);

  return (
    <div>
      <button onClick={handleConnect}>Connect to Pera Wallet</button>
      {address && <p>Connected Address: {address}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {balance !== null && <p>Balance: {balance} ALGO</p>}
      {transactions && (
        <div>
          <h3>Transactions:</h3>
          <pre>{JSON.stringify(transactions, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AlgotestnetTransaction;
