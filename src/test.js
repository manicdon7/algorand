import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');

const accountMnemonic = 'shadow peasant plate female soccer reflect until east boring portion success divorce'; // Replace with your mnemonic
const senderAccount = algosdk.mnemonicToSecretKey(accountMnemonic);

const sendTransaction = async () => {
  try {
    // Get suggested transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Create a note (data) to write on-chain
    const note = new TextEncoder().encode('This is a test note');

    // Create the transaction object
    const txn = {
      from: senderAccount.addr,
      to: senderAccount.addr, // Sending back to self (you can specify any address)
      fee: params.fee,
      amount: 0, // We are only writing data, not transferring ALGO
      firstRound: params.firstRound,
      lastRound: params.lastRound + 1000,
      genesisID: params.genesisID,
      genesisHash: params.genesishashb64,
      note, // Attach the note
    };

    // Sign the transaction
    const signedTxn = algosdk.signTransaction(txn, senderAccount.sk);

    // Send the transaction
    const tx = await algodClient.sendRawTransaction(signedTxn.blob).do();
    console.log('Transaction sent with ID:', tx.txId);

    alert(`Transaction successful with ID: ${tx.txId}`);
  } catch (error) {
    console.error('Failed to send transaction:', error);
  }
};
