import { ethers } from "hardhat";

async function getTxReceipt(txHash: string) {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545"); // Hardhat local RPC
  const receipt = await provider.getTransactionReceipt(txHash);

  console.log("Transaction Receipt:", receipt);
}

async function getTxDetails(txHash: string) {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const tx = await provider.getTransaction(txHash);

  console.log("Transaction:", tx);
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Data (encoded):", tx.data);
}



getTxReceipt("0x810866270eb13f34fb5485a0e2d667b9532d42916b1f4ce331ff5ba2d5c84bb1");
getTxDetails("0x810866270eb13f34fb5485a0e2d667b9532d42916b1f4ce331ff5ba2d5c84bb1");