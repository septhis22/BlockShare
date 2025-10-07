import { ethers, BrowserProvider, Contract, type BytesLike } from "ethers";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export interface StoredRecord {
  recordId: string;
  eCID: string;
  eDEK: string;
  dHash: string;
  time: number;
}

/**
 * Fetch a single record by recordId
 */
export async function fetchRecordById(recordId: string): Promise<StoredRecord> {
  if (!(window as any).ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider((window as any).ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);

  const [eCID, eDEK, dHash, timeBigInt] = await contract.getRecord(recordId);
  return {
    recordId,
    eCID: eCID as string,
    eDEK: eDEK as string,
    dHash: dHash as string,
    time: Number(timeBigInt) * 1000,
  };
}

/**
 * Fetch all records from the contract
 */
export async function fetchAllRecordsFromChain(): Promise<StoredRecord[]> {
  if (!(window as any).ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider((window as any).ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);

  const totalCountBigInt = await contract.totalRecords();
  const totalCount = Number(totalCountBigInt);

  if (totalCount === 0) return [];

  const recordIds: string[] = [];
  for (let i = 0; i < totalCount; i++) {
    const id = await contract.recordIds(i);
    recordIds.push(id);
  }

  const records = await Promise.all(
    recordIds.map(async (id) => fetchRecordById(id))
  );

  return records;
}
