const {
  AccountId,
  PrivateKey,
  Client,
  FileCreateTransaction,
  ContractCreateTransaction,
  ContractCallQuery,
  Hbar,
  ContractFunctionParameters,
  FileAppendTransaction,
} = require("@hashgraph/sdk");
require("dotenv").config();
const contract = require("./ReadData.json");

async function main() {
  //Grab your Hedera testnet account ID and private key from your .env file
  const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
  const myPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

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
  console.log("Status of file append is", fileAppendRx.status.toString());

  // Instantiate the contract instance
  const contractTx = await new ContractCreateTransaction()
    //Set the file ID of the Hedera file storing the bytecode
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

  // Calls a function of the smart contract
  const contractQuery = await new ContractCallQuery()
    //Set the gas for the query
    .setGas(100000)
    //Set the contract ID to return the request for
    .setContractId(newContractId)
    //Set the contract function to call
    .setFunction(
      "getLotsOfData",
      new ContractFunctionParameters().addUint24(62)
    )
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
