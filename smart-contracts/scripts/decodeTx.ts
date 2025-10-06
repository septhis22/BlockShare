import { ethers } from "hardhat";

import contractArtifact from "../../smart-contracts/artifacts/contracts/MyContracts.sol/MyContract.json";

async function main() {
  // 👇 Replace this with your real tx hash from MetaMask or Hardhat logs
    const txHash = "0xfec04dd2d2f6bfab5f7485c2ad2d167ab3c639f526db76dc45926011e3c2ac16";

  // Connect to local Hardhat chain
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Get the transaction
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log("Transaction not found!");
    return;
  }

  // Decode the input data using contract ABI
  const iface = new ethers.Interface(contractArtifact.abi);
  const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });

  console.log("📌 Function called:", parsed.name);
  console.log("📌 Arguments:", parsed.args);

  // If the function was updateMessage, this will log the text that was sent
  if (parsed.name === "updateMessage") {
    console.log("👉 Message written was:", parsed.args[0]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
