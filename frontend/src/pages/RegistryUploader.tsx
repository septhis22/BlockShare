import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers, BrowserProvider, Contract, type Signer, type BytesLike } from "ethers";
// Assuming this path to your Zustand store is correct
import { useAppStore } from "../context/useTypes"; 
import MetaConnect from "../components/metaConnect"; 
import contractArtifact from "../../../smart-contracts/artifacts/contracts/Registry.sol/Registry.json";

// NOTE: Ensure this address is correct for your Hardhat deployment
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

// TypeScript interface for a stored record
interface StoredRecord {
  recordId: string;
  eCID: string;
  eDEK: string;
  dHash: string;
  time: number;
}

const getEthereum = () => (window as any).ethereum;

const RegistryUploader = () => {
  // Global State (Zustand)
  const isConnected = useAppStore(state => state.metaIsConnected);
  const account = useAppStore(state => state.username); 

  // Local State for Record Inputs
  const [eCID, setECID] = useState<string>("QmEncryptedIPFS_01");
  const [eDEK, setEDEK] = useState<string>("0x1122334455");
  const [dHash, setDHash] = useState<string>("0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");
  
  // Local State for Read/Display
  const [allRecords, setAllRecords] = useState<StoredRecord[]>([]);
  const [status, setStatus] = useState<string>("Awaiting connection...");

  // Memoize read-only contract instance
  const readContract = useMemo(() => {
    const ethereum = getEthereum();
    if (!ethereum) return null;
    
    // IMPORTANT DEBUGGING CHECK: Ensure ABI is loaded correctly
    if (!contractArtifact || !contractArtifact.abi) {
        console.error("ABI Not Loaded: contractArtifact or its ABI property is missing.");
        setStatus("Initialization Error: ABI missing.");
        return null;
    }

    const provider = new BrowserProvider(ethereum);
    return new Contract(
      CONTRACT_ADDRESS,
      contractArtifact.abi,
      provider
    );
  }, []); 

  // READ FUNCTION: Fetch ALL records from the contract
  const fetchAllRecords = useCallback(async () => {
    if (!readContract) return;

    setStatus("Fetching all record IDs...");
    try {
      // 1. Get total number of records
      // This is the line that currently throws the BAD_DATA error
      const totalCountBigInt = await readContract.totalRecords();
      const totalCount = Number(totalCountBigInt);

      if (totalCount === 0) {
        setAllRecords([]);
        setStatus("No records found in the Registry.");
        return;
      }
      
      // 2. Fetch all recordIds sequentially
      const recordIds: string[] = [];
      for (let i = 0; i < totalCount; i++) {
        const id = await readContract.recordIds(i);
        recordIds.push(id);
      }

      // 3. Fetch data for each recordId concurrently
      setStatus(`Found ${totalCount} records. Fetching details...`);
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
      setStatus(`Successfully loaded ${totalCount} records.`);

    } catch (error) {
      console.error("Error fetching all records:", error);
      // Update status to show the error
      setStatus("Error loading records. Check console for details (Bad Data/ABI Mismatch).");
    }
  }, [readContract]);


  // 2. WRITE FUNCTION: Store a new record
  const storeNewRecord = async () => {
    const ethereum = getEthereum();
    if (!ethereum || !isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!eCID || !eDEK || !dHash) {
        alert("All fields must be filled.");
        return;
    }

    setStatus("Generating record ID and sending transaction...");

    // Generate the unique recordId (bytes32) off-chain
    const salt = ethers.toUtf8Bytes(Date.now().toString()); 
    const recordId = ethers.solidityPackedKeccak256(
        ['string', 'bytes'], 
        [eCID, salt]
    );

    try {
      const provider = new BrowserProvider(ethereum);
      const signer: Signer = await provider.getSigner();

      // Contract instance with signer for writing data
      const writeContract = new Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        signer
      );
      
      // Perform the transaction
      const tx = await writeContract.storeRecord(
        recordId,
        eCID,
        eDEK,
        dHash
      );
      
      setStatus(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      await tx.wait();

      setStatus(`Record successfully stored! ID: ${recordId.substring(0, 10)}...`);
      
      // Refresh list after successful transaction
      fetchAllRecords(); 
      
      // Clear inputs (optional)
      setECID("");
      setEDEK("");
      setDHash("");
      
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus("Transaction failed. See console for details.");
    }
  };

  // Initial data load and connection watcher
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
        
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
            Registry Data Uploader
        </h1>

        <p className="text-sm text-gray-600 mb-4">
            **Status:** <span className={`font-semibold ${status.includes("Error") ? 'text-red-500' : 'text-blue-600'}`}>{status}</span>
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
                    <InputGroup 
                        label="Encrypted CID (eCID)" 
                        value={eCID} 
                        onChange={setECID} 
                        placeholder="e.g., QmEncryptedIPFS"
                    />
                    <InputGroup 
                        label="Encrypted DEK (eDEK - Hex)" 
                        value={eDEK} 
                        onChange={setEDEK} 
                        placeholder="e.g., 0x1122334455"
                    />
                    <InputGroup 
                        label="Data Hash (dHash - bytes32)" 
                        value={dHash} 
                        onChange={setDHash} 
                        placeholder="e.g., 0xabcdef..."
                    />

                    <button 
                        onClick={storeNewRecord}
                        disabled={!eCID || !eDEK || !dHash}
                        className="w-full py-3 mt-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 disabled:opacity-50"
                    >
                        Store Record (Transaction)
                    </button>
                    <p className="text-xs text-gray-500 pt-2">
                        **recordId** is generated automatically before sending.
                    </p>
                </div>
            ) : (
                <p className="text-center text-red-500 font-semibold">
                    Connect your wallet to enable record storage.
                </p>
            )}
        </div>

        {/* Viewer Section */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">2. All Stored Records ({allRecords.length})</h2>
            
            <button
                onClick={fetchAllRecords}
                className="mb-4 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition duration-150 disabled:opacity-50"
                disabled={!isConnected}
            >
                Refresh Records
            </button>

            {allRecords.length === 0 && isConnected && <p>The registry is currently empty. Store a record above!</p>}
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

// Simple reusable input group component
const InputGroup = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        />
    </div>
);

// Component to display a single record
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
