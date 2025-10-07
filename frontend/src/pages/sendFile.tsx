import React, { useState } from "react";
import CryptoJS from "crypto-js";
import EthCrypto from "eth-crypto";
import { uploadToPinata } from "../utils/pinataUploads";
import { uploadRecordToBlockchain } from "../utils/dataOnChain";
import MetaConnect from "../components/metaConnect";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const FileEncryptAndUpload: React.FC = () => {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [uploadResults, setUploadResults] = useState<
    { name: string; ipfsHash: string; dek: string; recordId?: string; txHash?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const generateRandomKey = (): string => {
    return CryptoJS.lib.WordArray.random(16).toString(); // 128-bit DEK
  };

  const encryptFile = async (file: File) => {
    const dek = generateRandomKey();
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
    const encryptedData = CryptoJS.AES.encrypt(wordArray, dek).toString();
    const encryptedBlob = new Blob([encryptedData], { type: "text/plain" });
    return { encryptedBlob, dek };
  };

  const handleEncryptAndUpload = async () => {
    if (files.length === 0) return;
    if (!recipientEmail) {
      alert("Please enter recipient's email");
      return;
    }

    setLoading(true);

    // Fetch recipient's public key
    let recipientPublicKey: string;
    try {
      const response = await axios.get(`http://localhost:5000/api/auth/user?email=${recipientEmail}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      recipientPublicKey = response.data.data.user.public_key;
    } catch (error) {
      console.error("Failed to fetch recipient public key:", error);
      alert("Failed to find recipient or fetch public key");
      setLoading(false);
      return;
    }

    const results: {
      name: string;
      ipfsHash: string;
      dek: string;
      recordId?: string;
      txHash?: string;
    }[] = [];

    for (const file of files) {
      try {
        // 1️⃣ Encrypt
        const { encryptedBlob, dek } = await encryptFile(file);

        // 1.5️⃣ Encrypt DEK with recipient's public key
        const encryptedDekObj = await EthCrypto.encryptWithPublicKey(recipientPublicKey, dek);
        const encryptedDek = EthCrypto.cipher.stringify(encryptedDekObj);

        // 2️⃣ Upload to Pinata
        const response = await uploadToPinata(encryptedBlob, file.name + ".enc");
        console.log("📦 Pinata response:", response);

        // ✅ SAFE CID EXTRACTION - handles all cases
        let eCID: string | null = null;
        
        if (typeof response === "string") {
          // Response is directly the CID string


          // add logic to encrpyt the CID and DEK


          eCID = response;
        } else if (response && typeof response === "object") {
          // Response is an object - check multiple possible fields
          eCID = (response as any).IpfsHash || 
                  (response as any).cid || 
                  (response as any).CID ||
                  null;
        }

        if (!eCID) {
          console.error("❌ Could not extract CID from Pinata response:", response);
          continue;
        }

        console.log("✅ Extracted CID:", eCID);

        // 3️⃣ Compute hash of encrypted data
        const arrayBuffer = await encryptedBlob.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
        const dHash = CryptoJS.SHA256(wordArray).toString();

        // 4️⃣ Store on blockchain
        try {
          const { recordId, txHash } = await uploadRecordToBlockchain(eCID, encryptedDek, dHash);
          results.push({ name: file.name, ipfsHash: eCID, dek, recordId, txHash });
          console.log(`✅ File ${file.name} uploaded & stored on-chain.`);
        } catch (err) {
          console.error(`❌ Blockchain upload failed for ${file.name}:`, err);
          results.push({ name: file.name, ipfsHash: eCID, dek });
        }
      } catch (err) {
        console.error(`❌ Error processing ${file.name}:`, err);
      }
    }

    setUploadResults(results);
    setLoading(false);

    // Share the files
    for (const result of results) {
      if (result.recordId) {
        try {
          await axios.post("http://localhost:5000/api/shared/share", {
            receiverEmail: recipientEmail,
            recordId: result.recordId,
            fileName: result.name
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`Shared ${result.name} successfully`);
        } catch (error) {
          console.error(`Failed to share ${result.name}:`, error);
        }
      }
    }
  };

  return (
    <div className="p-6 border rounded-md space-y-4">
      <MetaConnect onConnected={(acc) => console.log("Wallet connected:", acc)} />
      <h2 className="text-lg font-semibold">Encrypt & Upload Files to Pinata</h2>
      <input
        type="email"
        placeholder="Recipient's email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <input type="file" multiple onChange={handleFileChange} />
      <button
        onClick={handleEncryptAndUpload}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        disabled={files.length === 0 || loading || !recipientEmail}
      >
        {loading ? "Uploading & Sharing..." : "Encrypt, Upload & Share"}
      </button>

      {uploadResults.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Upload Results:</h3>
          <ul className="list-disc pl-5">
            {uploadResults.map((file, idx) => (
              <li key={idx}>
                {file.name} → IPFS Hash:{" "}
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {file.ipfsHash}
                </a>{" "}
                | DEK: <code>{file.dek}</code>
                {file.recordId && (
                  <>
                    {" "}| Record ID: <code className="text-xs">{file.recordId.slice(0, 10)}...</code>
                  </>
                )}
                {file.txHash && (
                  <>
                    {" "}| Tx: <code className="text-xs">{file.txHash.slice(0, 10)}...</code>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileEncryptAndUpload;