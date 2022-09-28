
const { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, TransferTransaction, Hbar, TokenCreateTransaction, TokenType, TokenSupplyType, Wallet } = require("@hashgraph/sdk");
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
 
     const client = Client.forTestnet(); // default max transaction fee of 100,000,000 tinybars (1 hbar)  // default max query payment of 100,000,000 tinybars (1 hbar)
     // .setMaxDefaultTransactionFee() for a transaction and .setDefaultMaxQueryPayment() for queries.
     // The operator is the account that will pay for the transaction and query fees in hbar.
     client.setOperator(myAccountId, myPrivateKey);
     
     const supplyKey = PrivateKey.generate();

    //Create the NFT
    let nftCreate = await new TokenCreateTransaction()
    .setTokenName("diploma")
    .setTokenSymbol("GRAD")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId()
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(250)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

    //Sign the transaction with the treasury key
    let nftCreateTxSign = await nftCreate.sign();

    //Submit the transaction to a Hedera network
    let nftCreateSubmit = await nftCreateTxSign.execute(client);

    //Get the transaction receipt
    let nftCreateRx = await nftCreateSubmit.getReceipt(client);

    //Get the token ID
    let tokenId = nftCreateRx.tokenId;

    //Log the token ID
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);

}

main();

