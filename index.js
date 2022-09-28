const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  AccountId,
} = require("@hashgraph/sdk");
require("dotenv").config();

async function main() {
  //Grab your Hedera testnet account ID and private key from your .env file
  const myAccountId = process.env.MY_ACCOUNT_ID;
  const myPrivateKey = process.env.MY_PRIVATE_KEY;

  // If we weren't able to grab it, we should throw a new error
  if (myAccountId == null || myPrivateKey == null) {
    throw new Error(
      "Environment variables myAccountId and myPrivateKey must be present"
    );
  }

  const node = { "127.0.0.1:50211": new AccountId(3) };

  // Create Hedera Testnet Client

  //The client has a default max transaction fee of 100,000,000 tinybars (1 hbar) and default max query payment of 100,000,000 tinybars (1 hbar).
  // If you need to change these values, you can use.setMaxDefaultTransactionFee() for a transaction and .setDefaultMaxQueryPayment() for queries.
  // So the max transaction fee is 1 hbar and the max query fee is 1 hbar, but those values can be changed
  const client = Client.forNetwork(node);

  // The operator is the account that will pay for the transaction query fees in HBAR
  client.setOperator(myAccountId, myPrivateKey);

  // Create (Generate) new keys:
  const newAccountPrivateKey = await PrivateKey.generateECDSA();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // Create a new account with 1000 tinybar starting balance
  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPrivateKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  // Get the new account ID
  const receipt = await newAccount.getReceipt(client);
  const newAccountId = receipt.accountId;
  // The format is shard.realm.id
  console.log("The new account ID is: ", newAccountId.toString());

  //Verifying the new account balance (free)
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);

  console.log("The new account balance is: ", accountBalance.hbars.toString());

  //Transfer hbar
  const transferHbar = await new TransferTransaction()
    .addHbarTransfer(myAccountId, Hbar.fromTinybars(-1000))
    .addHbarTransfer(newAccountId, Hbar.fromTinybars(1000))
    .execute(client);

  //Verify the transaction reached consensus
  const transferReceipt = await transferHbar.getReceipt(client);
  console.log("The transfer is", transferReceipt.status.toString());

  const getNewBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);

  console.log("New balance is:", getNewBalance.hbars.toString());
}
main();
