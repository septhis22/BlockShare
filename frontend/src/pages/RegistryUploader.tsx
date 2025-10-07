import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers, BrowserProvider, Contract, type BytesLike } from "ethers";
import { useAppStore } from "../context/useTypes";
import MetaConnect from "../components/metaConnect";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ------------------- 🔹 Utility Function -------------------
async function uploadRecordToBlockchain(
  eCID: string,
  eDEK: string,
  dHash: string
): Promise<{ recordId: string; txHash: string }> {
  if (!(window as any).ethereum) {
    throw new Error("MetaMask not found. Please install or enable it.");
  }

  // Step 1: Generate a unique record ID
  const salt = ethers.toUtf8Bytes(Date.now().toString() + Math.random().toString());
  const recordId = ethers.solidityPackedKeccak256(
    ["string", "bytes", "bytes", "bytes"],
    [eCID, eDEK as BytesLike, dHash as BytesLike, salt]
  );

  // Step 2: Connect to wallet
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();

  // Step 3: Connect contract
  const contract = new Contract(CONTRACT_ADDRESS, contractArtifact.abi, signer);

  // Step 4: Store the record
  const tx = await contract.storeRecord(recordId, eCID, eDEK, dHash);
  console.log("⛓️ Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Record successfully stored on blockchain!");

  return { recordId, txHash: tx.hash };
}

// ------------------- 🔹 Main Component -------------------
interface StoredRecord {
  recordId: string;
  eCID: string;
  eDEK: string;
  dHash: string;
  time: number;
}

const getEthereum = () => (window as any).ethereum;

const RegistryUploader = () => {
  const isConnected = useAppStore((state) => state.metaIsConnected);
  const account = useAppStore((state) => state.username);

  const [eCID, setECID] = useState<string>("QmEncryptedIPFS_01");
  const [eDEK, setEDEK] = useState<string>("0x1122334455");
  const [dHash, setDHash] = useState<string>(
    "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
  );

  const [allRecords, setAllRecords] = useState<StoredRecord[]>([]);
  const [status, setStatus] = useState<string>("Awaiting connection...");

  const readContract = useMemo(() => {
    const ethereum = getEthereum();
    if (!ethereum) return null;
    const provider = new BrowserProvider(ethereum);
    return new Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);
  }, []);

  // 🔹 Fetch All Records
  const fetchAllRecords = useCallback(async () => {
    if (!readContract) return;

    setStatus("Fetching all records...");
    try {
      const totalCountBigInt = await readContract.totalRecords();
      const totalCount = Number(totalCountBigInt);

      if (totalCount === 0) {
        setAllRecords([]);
        setStatus("No records found in the Registry.");
        return;
      }

      const recordIds: string[] = [];
      for (let i = 0; i < totalCount; i++) {
        const id = await readContract.recordIds(i);
        recordIds.push(id);
      }

      const recordPromises = recordIds.map(async (id) => {
        const [eCID, eDEK, dHash, timeBigInt] = await readContract.getRecord(id);
        return {
          recordId: id,
          eCID: eCID as string,
          eDEK: eDEK as BytesLike,
          dHash: dHash as BytesLike,
          time: Number(timeBigInt) * 1000,
        } as StoredRecord;
      });

      const records = await Promise.all(recordPromises);
      setAllRecords(records);
      setStatus(`Loaded ${totalCount} records successfully.`);
    } catch (error) {
      console.error("Error fetching records:", error);
      setStatus("Error fetching records (check console).");
    }
  }, [readContract]);

  // 🔹 Store New Record using helper function
  const storeNewRecord = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!eCID || !eDEK || !dHash) {
      alert("All fields are required.");
      return;
    }

    try {
      setStatus("Uploading record to blockchain...");
      const { recordId, txHash } = await uploadRecordToBlockchain(eCID, eDEK, dHash);
      setStatus(`✅ Record stored! TX: ${txHash.substring(0, 10)}...`);

      // Refresh after success
      fetchAllRecords();

      // Optional reset
      setECID("");
      setEDEK("");
      setDHash("");
    } catch (err) {
      console.error("Error uploading record:", err);
      setStatus("❌ Upload failed. Check console for details.");
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchAllRecords();
    } else {
      setAllRecords([]);
      setStatus("Please connect wallet to interact.");
    }
  }, [isConnected, fetchAllRecords]);

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-50 shadow-xl rounded-xl">
      <MetaConnect />
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">Registry Data Uploader</h1>

      <p className="text-sm text-gray-600 mb-4">
        **Status:**{" "}
        <span
          className={`font-semibold ${
            status.includes("Error") || status.includes("failed") ? "text-red-500" : "text-blue-600"
          }`}
        >
          {status}
        </span>
      </p>

      {/* Uploader Section */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl mb-8 shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">1. Store New Record</h2>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-700">Connected Account:</p>
          <p className="text-sm break-all text-gray-900 font-mono">{account ?? "Not Connected"}</p>
          <p className="mt-2 text-lg font-bold">Total Records: {allRecords.length}</p>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <InputGroup label="Encrypted CID (eCID)" value={eCID} onChange={setECID} />
            <InputGroup label="Encrypted DEK (eDEK)" value={eDEK} onChange={setEDEK} />
            <InputGroup label="Data Hash (dHash)" value={dHash} onChange={setDHash} />

            <button
              onClick={storeNewRecord}
              className="w-full py-3 mt-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 disabled:opacity-50"
            >
              Store Record (Transaction)
            </button>
          </div>
        ) : (
          <p className="text-center text-red-500 font-semibold">
            Connect your wallet to enable record storage.
          </p>
        )}
      </div>

      {/* Viewer Section */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          2. All Stored Records ({allRecords.length})
        </h2>

        <button
          onClick={fetchAllRecords}
          className="mb-4 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition duration-150 disabled:opacity-50"
          disabled={!isConnected}
        >
          Refresh Records
        </button>

        {allRecords.length === 0 && isConnected && <p>No records found yet. Store one above!</p>}
        {!isConnected && <p>Connect wallet to view records.</p>}

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {allRecords.map((record) => (
            <RecordCard key={record.recordId} record={record} />
          ))}
        </div>
      </div>
    </div>
  );
};

// 🔹 Input Field Component
const InputGroup = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${label}`}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
    />
  </div>
);

// 🔹 Record Display Card
const RecordCard = ({ record }: { record: StoredRecord }) => (
  <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 hover:shadow-lg transition duration-200">
    <p className="text-xs font-bold text-gray-500">
      RECORD ID: <span className="font-mono text-gray-700">{record.recordId.substring(0, 10)}...</span>
    </p>
    <p className="text-xs mt-1 text-gray-500">
      Time: {new Date(record.time).toLocaleString()}
    </p>
    <div className="mt-2 text-sm space-y-1">
      <p className="font-medium">eCID: <span className="font-mono break-all text-blue-800">{record.eCID}</span></p>
      <p className="font-medium">eDEK: <span className="font-mono break-all text-red-800">{record.eDEK.toString().substring(0, 20)}...</span></p>
      <p className="font-medium">dHash: <span className="font-mono break-all text-green-800">{record.dHash.toString().substring(0, 20)}...</span></p>
    </div>
  </div>
);

export default RegistryUploader;
