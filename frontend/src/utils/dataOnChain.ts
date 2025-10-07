import { ethers, BrowserProvider, Contract } from "ethers";
// import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json"

// ⚙️ Update this with your deployed Registry contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";


export async function uploadRecordToBlockchain(
  eCID: string,
  eDEK: string,
  dHash: string
): Promise<{ recordId: string; txHash: string }> {
  if (!window.ethereum) {
    throw new Error("MetaMask (window.ethereum) not found. Please install or enable it.");
  }

  // ✅ Step 1: Generate a unique record ID
  const salt = ethers.toUtf8Bytes(Date.now().toString() + Math.random().toString());
  const recordId = ethers.solidityPackedKeccak256(
    ["string", "bytes", "bytes", "bytes"],
    [eCID, eDEK as ethers.BytesLike, dHash as ethers.BytesLike, salt]
  );

  // ✅ Step 2: Connect to the blockchain using MetaMask
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // ✅ Step 3: Create contract instance
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, signer);

  // ✅ Step 4: Call the contract's `storeRecord` function
  const tx = await contract.storeRecord(recordId, eCID, eDEK, dHash);

  console.log("⛓️ Transaction sent:", tx.hash);

  // Wait for the transaction to be confirmed
  await tx.wait();

  console.log("✅ Record successfully stored on blockchain!");

  // ✅ Step 5: Return recordId and transaction hash
  return {
    recordId,
    txHash: tx.hash,
  };
}

