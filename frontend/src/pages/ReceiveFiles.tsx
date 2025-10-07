import React, { useState, useEffect } from "react";
import axios from "axios";
import EthCrypto from "eth-crypto";
import CryptoJS from "crypto-js";
import { getRecordFromBlockchain } from "../utils/dataOnChain";

interface SharedFile {
  id: string;
  recordId: string;
  fileName: string;
  sharedAt: string;
  sender: {
    name: string;
    email: string;
  };
}

const ReceiveFiles: React.FC = () => {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const fetchSharedFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await axios.get("http://localhost:5000/api/shared/shared", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedFiles(response.data.data.sharedFiles);
    } catch (error: any) {
      console.error("Failed to fetch shared files:", error);
      alert("Failed to fetch shared files. Please check if logged in.");
    }
  };

  const downloadFile = async (recordId: string, fileName: string) => {
    if (!decryptedPrivateKey) {
      alert("Please decrypt your private key first");
      return;
    }

    setLoading(true);
    try {
      // Get record from blockchain
      const record = await getRecordFromBlockchain(recordId);
      const { eCID, eDEK, dHash } = record;

      // Decrypt DEK with private key
      const encryptedDekObj = EthCrypto.cipher.parse(eDEK);
      const decryptedDek = await EthCrypto.decryptWithPrivateKey(decryptedPrivateKey, encryptedDekObj);

      // Fetch encrypted file from IPFS
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${eCID}`, {
        responseType: 'text'
      });

      // Decrypt file (encrypted data is stored as text)
      const encryptedString = response.data;
      console.log("Encrypted string length:", encryptedString.length);
      const decryptedWordArray = CryptoJS.AES.decrypt(encryptedString, decryptedDek);
      console.log("Decrypted word array sigBytes:", decryptedWordArray.sigBytes);

      if (decryptedWordArray.sigBytes === 0) {
        alert("Failed to decrypt file. Check private key.");
        return;
      }

      // Convert WordArray to Uint8Array
      const decryptedBytes = [];
      for (let i = 0; i < decryptedWordArray.sigBytes; i++) {
        decryptedBytes.push((decryptedWordArray.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xff);
      }
      const uint8Array = new Uint8Array(decryptedBytes);

      // Create blob and download
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("File downloaded successfully!");

    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to download file");
    } finally {
      setLoading(false);
    }
  };

  const decryptPrivateKey = async () => {
    if (!password) {
      alert("Enter your password");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const encryptedPrivKey = response.data.data.user.encrypted_private_key;
      const decrypted = CryptoJS.AES.decrypt(encryptedPrivKey, password).toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        alert("Wrong password");
        return;
      }
      setDecryptedPrivateKey(decrypted);
      alert("Private key decrypted successfully");
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      alert("Failed to decrypt private key");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Received Files</h2>
      <div className="mb-4">
        <input
          type="password"
          placeholder="Your Account Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <button onClick={decryptPrivateKey} className="px-4 py-2 bg-blue-500 text-white rounded">
          Decrypt Private Key
        </button>
      </div>
      {sharedFiles.length === 0 ? (
        <p>No shared files yet.</p>
      ) : (
        <ul className="space-y-2">
          {sharedFiles.map((file) => (
            <li key={file.id} className="border p-4 rounded flex justify-between items-center">
              <div>
                <p><strong>{file.fileName}</strong></p>
                <p>From: {file.sender.name} ({file.sender.email})</p>
                <p>Shared at: {new Date(file.sharedAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => downloadFile(file.recordId, file.fileName)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? "Downloading..." : "Download"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReceiveFiles;