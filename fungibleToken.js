const { 
    Client, 
    PrivateKey, 
    AccountCreateTransaction, 
    Hbar, 
    TokenCreateTransaction, 
    TokenAssociateTransaction, 
    TransferTransaction, 
    AccountBalanceQuery 
} = require("@hashgraph/sdk");
require("dotenv").config();


async function main() {
    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    // Create Hedera Testnet Client

    //The client has a default max transaction fee of 100,000,000 tinybars (1 hbar) and default max query payment of 100,000,000 tinybars (1 hbar). 
    // If you need to change these values, you can use.setMaxDefaultTransactionFee() for a transaction and .setDefaultMaxQueryPayment() for queries.
    // So the max transaction fee is 1 hbar and the max query fee is 1 hbar, but those values can be changed
    const client = Client.forTestnet();

    // The operator is the account that will pay for the transaction query fees in HBAR
    client.setOperator(myAccountId, myPrivateKey);


    // Create (Generate) new keys:
    const newAccountPrivateKey = await PrivateKey.generateECDSA(); //why ecdsa instead of ed25519
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


    //Create Fungible Token
    const tokenCreateTransaction = await new TokenCreateTransaction()
        .setTokenName("Black Sea LimeChain Token")
        .setTokenSymbol("BSL")
        .setTreasuryAccountId(newAccountId) // After creating the token: Who is going to be holding them.
        .setInitialSupply(10000) // Total supply = 10000 / 10 ^ 2
        .setDecimals(2)
        .setAutoRenewAccountId(newAccountId)
        .freezeWith(client);

    const signedTx = await tokenCreateTransaction.sign(newAccountPrivateKey);
    const txResponse = await signedTx.execute(client);
    const tokenCreateReceipt = await txResponse.getReceipt(client);
    console.log("TokenID: ", tokenCreateReceipt.tokenId.toString())
    console.log("Solidity Token Address", tokenCreateReceipt.tokenId.toSolidityAddress())
    const tokenId = tokenCreateReceipt.tokenId;

    //Associate Token with Account
    // Accounts on hedera have to opt in to receive any types of token that aren't HBAR
    const tokenAssociateTransaction = await new TokenAssociateTransaction() 
        .setAccountId(myAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client)

    const signedTxForAssociateToken = await tokenAssociateTransaction.sign(PrivateKey.fromString(myPrivateKey));
    const txResponseAssociatedToken = await signedTxForAssociateToken.execute(client);
    const txReceipt = await txResponseAssociatedToken.getReceipt(client);
    console.log('The transaction consensus is', txReceipt.status.toString())

    //Transfer token 
    const transferToken = await new TransferTransaction()
    .addTokenTransfer(tokenId, newAccountId, -100) // deduct 100 tokens
    .addTokenTransfer(tokenId, myAccountId, 100) // increase balance by 100
    .freezeWith(client);

    const signedTransferTokenTX = await transferToken.sign(newAccountPrivateKey);
    const txResponseTransferToken = await signedTransferTokenTX.execute(client);

      
    //Verify the transaction reached consensus
    const transferReceipt = await txResponseTransferToken.getReceipt(client);
    console.log('The transfer is', transferReceipt.status.toString())


    // Account Balance Query Fungible Token
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(myAccountId)
        .execute(client);

    console.log(`BSL balance is ${accountBalance.tokens._map.get(tokenId.toString())} and Hbar balance is ${accountBalance.hbars}`);
}
main();