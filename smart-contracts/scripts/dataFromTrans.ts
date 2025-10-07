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



getTxReceipt("0x81a688413993196215cdd863db9e2ead6d6ed5007623868bd811dca9687957a1");
getTxDetails("0x81a688413993196215cdd863db9e2ead6d6ed5007623868bd811dca9687957a1");