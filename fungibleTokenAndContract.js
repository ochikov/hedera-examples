const { 
    Client,
    AccountId, 
    PrivateKey, 
    AccountCreateTransaction, 
    Hbar, 
    TokenCreateTransaction, 
    TokenAssociateTransaction, 
    TransferTransaction, 
    FileCreateTransaction, 
    ContractCreateTransaction, 
    ContractFunctionParameters, 
    ContractCallQuery, 
    FileAppendTransaction 
} = require("@hashgraph/sdk");
require("dotenv").config();
const contract = require("./ERC20Receiver.json");


async function main() {
    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
    const myPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

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
        .setTreasuryAccountId(newAccountId)
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
    const tokenAssociateTransaction = await new TokenAssociateTransaction()
        .setAccountId(myAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client)

    const signedTxForAssociateToken = await tokenAssociateTransaction.sign(newAccountPrivateKey);
    const txResponseAssociatedToken = await signedTxForAssociateToken.execute(client);
    const txReceipt = await txResponseAssociatedToken.getReceipt(client);
    console.log('The transaction consensus is', txReceipt.status.toString())

    //Transfer hbar
    const transferToken = await new TransferTransaction()
    .addTokenTransfer(tokenId, newAccountId, -100)
    .addTokenTransfer(tokenId, myAccountId, 100)
    .freezeWith(client);

    const signedTransferTokenTX = await transferToken.sign(newAccountPrivateKey);
    const txResponseTransferToken = await signedTransferTokenTX.execute(client);

      
    //Verify the transaction reached consensus
    const transferReceipt = await txResponseTransferToken.getReceipt(client);
    console.log('The transfer is', transferReceipt.status.toString())


    // Create a file on Hedera and store the bytecode
	const fileCreateTx = new FileCreateTransaction()
		.setKeys([myPrivateKey])
		.freezeWith(client);
	const fileCreateSign = await fileCreateTx.sign(myPrivateKey);
	const fileCreateSubmit = await fileCreateSign.execute(client);
	const fileCreateRx = await fileCreateSubmit.getReceipt(client);
	const bytecodeFileId = fileCreateRx.fileId;
	console.log(`- The bytecode file ID is: ${bytecodeFileId} \n`);

    //Append contents to the file
    const fileAppendTx = new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contract.bytecode)
        .setMaxChunks(10)
        .freezeWith(client);
    const fileAppendSign = await fileAppendTx.sign(myPrivateKey);
    const fileAppendSubmit = await fileAppendSign.execute(client);
    const fileAppendRx = await fileAppendSubmit.getReceipt(client);
    console.log("Status of file append is", fileAppendRx.status.toString())

    // Instantiate the contract instance
    const contractTx = await new ContractCreateTransaction()
    //Set the file ID of the Hedera file storing the bytecode
    .setAdminKey(myPrivateKey)
    .setBytecodeFileId(bytecodeFileId)
    //Set the gas to instantiate the contract
    .setGas(100000)
    //Provide the constructor parameters for the contract
    .setConstructorParameters();

    //Submit the transaction to the Hedera test network
    const contractResponse = await contractTx.execute(client);

    //Get the receipt of the file create transaction
    const contractReceipt = await contractResponse.getReceipt(client);

    //Get the smart contract ID
    const newContractId = contractReceipt.contractId;

    //Log the smart contract ID
    console.log("The smart contract ID is " + newContractId);


    //Associate Token with Contract
    const tokenAssociateTransactionWithContract = await new TokenAssociateTransaction()
        .setAccountId(newContractId.toString())
        .setTokenIds([tokenId])
        .freezeWith(client)

    const signedTxForAssociateTokenWithContract = await tokenAssociateTransactionWithContract.sign(myPrivateKey);
    const txResponseAssociatedTokenWithContract = await signedTxForAssociateTokenWithContract.execute(client);
    const txReceipt2 = await txResponseAssociatedTokenWithContract.getReceipt(client);
    console.log('The associate token to contract transaction consensus is', txReceipt2.status.toString())

    //Transfer token
    const transferTokenToContract = await new TransferTransaction()
    .addTokenTransfer(tokenId, newAccountId, -50)
    .addTokenTransfer(tokenId, newContractId.toString(), 50)
    .freezeWith(client);

    const signedTransferTokenTXToContract = await transferTokenToContract.sign(newAccountPrivateKey);
    const txResponseTransferTokenToContract = await signedTransferTokenTXToContract.execute(client);

      
    //Verify the transaction reached consensus
    const transferReceipt2 = await txResponseTransferTokenToContract.getReceipt(client);
    console.log(`The transfer of ${tokenCreateReceipt.tokenId} is`, transferReceipt2.status.toString())


    // Querry balance of contract
    const contractQuery = await new ContractCallQuery()

    //Set the gas for the query
    .setGas(100000)

    //Set the contract ID to return the request for
    .setContractId(newContractId)

    //Set the contract function to call
    .setFunction("getBalance", new ContractFunctionParameters().addAddress(tokenId.toSolidityAddress()))
    
    //Set the query payment for the node returning the request
    //This value must cover the cost of the request otherwise will fail
    .setQueryPayment(new Hbar(2));

    //Submit to a Hedera network
    const getMessage = await contractQuery.execute(client);

    // Get a string from the result at index 0
    const message = getMessage.getUint256(0);

    //Log the message
    console.log("The balance: " + message);

}
main();