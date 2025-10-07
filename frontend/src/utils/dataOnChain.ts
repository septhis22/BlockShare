import { ethers, BrowserProvider, Contract } from "ethers";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export async function uploadRecordToBlockchain(
  eCID: string,
  eDEK: string,
  dHash: string
): Promise<{ recordId: string; txHash: string }> {
  if (!window.ethereum) throw new Error("MetaMask not found.");
  if (!eCID || !eDEK || !dHash) {
    throw new Error(`Invalid input: eCID=${eCID}, eDEK=${eDEK}, dHash=${dHash}`);
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, signer);

  if (!contract.storeRecord) {
    throw new Error("storeRecord() not found in contract ABI.");
  }

  // Generate unique recordId
  const recordId = ethers.keccak256(
    ethers.toUtf8Bytes(`${eCID}-${Date.now()}-${Math.random()}`)
  );

  console.log("📤 Uploading to blockchain with:", { recordId, eCID, eDEK, dHash });

  // Call contract - no .toString() needed
  const tx = await contract.storeRecord(recordId, eCID, eDEK, dHash);

  if (!tx || !tx.hash) throw new Error("Transaction failed to send.");
  console.log("⛓️ Transaction hash:", tx.hash);
  
  await tx.wait();
  return { recordId, txHash: tx.hash };
}

export async function getRecordFromBlockchain(recordId: string): Promise<{ eCID: string; eDEK: string; dHash: string; time: number }> {
  if (!window.ethereum) throw new Error("MetaMask not found.");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);

  if (!contract.getRecord) {
    throw new Error("getRecord() not found in contract ABI.");
  }

  const record = await contract.getRecord(recordId);
  return {
    eCID: record[0],
    eDEK: record[1],
    dHash: record[2],
    time: Number(record[3])
  };
}
