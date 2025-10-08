import React, { useState, useEffect } from "react";
import axios from "axios";
import EthCrypto from "eth-crypto";
import CryptoJS from "crypto-js";
import { getRecordFromBlockchain } from "../utils/dataOnChain";

import { Download, Lock, Key, FileText, User, Clock, CheckCircle, AlertCircle, Upload, ShieldCheck, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// NEW interface for hash information state
interface HashInfo {
  recordId: string;
  blockchainHash: string;
  calculatedHash: string;
  status: 'verifying' | 'matching' | 'mismatch' | 'idle';
}

const ReceiveFiles: React.FC = () => {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>("");
  const navigate = useNavigate();
  // NEW state to hold hash verification details for the UI
  const [hashInfo, setHashInfo] = useState<HashInfo | null>(null);

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
    // 1. Initialize hash info state for the UI
    setHashInfo({
      recordId,
      blockchainHash: "Fetching...",
      calculatedHash: "Pending...",
      status: 'verifying'
    });

    try {
      // 2. Get record from blockchain
      const record = await getRecordFromBlockchain(recordId);
      const { eCID, eDEK, dHash } = record;
      console.log("Retrieved dHash from blockchain:", dHash);
      // Update UI with blockchain hash
      setHashInfo(prev => prev ? { ...prev, blockchainHash: dHash } : null);

      // 3. Decrypt DEK with private key
      const encryptedDekObj = EthCrypto.cipher.parse(eDEK);
      const decryptedDek = await EthCrypto.decryptWithPrivateKey(decryptedPrivateKey, encryptedDekObj);

      // 4. Fetch encrypted file from IPFS
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${eCID}`, {
        responseType: 'text'
      });

      // 5. Decrypt file content
      const encryptedString = response.data;
      const decryptedWordArray = CryptoJS.AES.decrypt(encryptedString, decryptedDek);

      if (decryptedWordArray.sigBytes <= 0) {
        alert("Failed to decrypt file. Check your password and private key.");
        setLoading(false);
        setHashInfo(null); // Clear hash info on failure
        return;
      }
      
      // 6. VERIFICATION: Calculate hash of the decrypted file
      const calculatedHash = CryptoJS.SHA256(decryptedWordArray).toString();
      console.log("Calculated hash of decrypted file:", calculatedHash);

      // 7. Compare hashes
      if (calculatedHash === dHash) {
        // Hashes match: File is authentic
        console.log("✅ Hash verification successful! File is authentic.");
        setHashInfo(prev => prev ? { ...prev, calculatedHash, status: 'matching' } : null);
        
        // 8. Convert WordArray to Uint8Array and create blob for download
        const decryptedBytes = [];
        for (let i = 0; i < decryptedWordArray.sigBytes; i++) {
            decryptedBytes.push((decryptedWordArray.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        const uint8Array = new Uint8Array(decryptedBytes);

        const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName; // Use the original file name
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert("File integrity verified and downloaded successfully!");
      } else {
        // Hashes DO NOT match: File may be corrupted or tampered with
        console.error("❌ HASH MISMATCH! File may be corrupted or tampered with.");
        setHashInfo(prev => prev ? { ...prev, calculatedHash, status: 'mismatch' } : null);
        alert("File verification failed! The file's integrity could not be confirmed. Download aborted.");
      }

    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to download file. An error occurred during the process.");
      setHashInfo(null); // Clear hash info on error
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '4s'}} />
      </div>

      {/* Header */}
      <header className="relative z-50 bg-black/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  BlockShare
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400 font-mono">Receive Files</span>
                </div>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-1 bg-gray-900/50 rounded-xl p-1 backdrop-blur-sm border border-gray-800">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <span className="font-semibold text-sm">Home</span>
              </button>
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <Upload className="w-4 h-4" />
                <span className="font-semibold text-sm">Send</span>
              </button>
              <button
                onClick={() => {}}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300 bg-blue-500/20 backdrop-blur-md border border-blue-400/50 text-white shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span className="font-semibold text-sm">Receive</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-40 max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Receive Secure Files
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Decrypt and download files shared with you, with integrity verified by the blockchain.
          </p>
        </div>

        {/* Private Key Decryption Section */}
        <div className="mb-8 bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800 hover:border-blue-500/30 transition-all duration-300">
          <div className="mb-4">
            <h3 className="flex items-center space-x-3 text-white text-lg font-semibold mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <span>Decrypt Your Private Key</span>
            </h3>
            <p className="text-gray-400 text-sm">
              Enter your account password to unlock your encryption keys for file download.
            </p>
          </div>
          <div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="password"
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={decryptPrivateKey}
                className="bg-blue-500/20 backdrop-blur-md border border-blue-400/50 hover:bg-blue-500/30 px-6 py-3 rounded-lg font-semibold transition text-white flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Decrypt Key</span>
              </button>
            </div>
            {decryptedPrivateKey && (
              <div className="mt-4 flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Private key decrypted successfully. You can now download files.</span>
              </div>
            )}
          </div>
        </div>

        {/* Shared Files Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <span>Shared Files</span>
          </h2>

          {sharedFiles.length === 0 ? (
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border border-gray-800 text-center">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No Files Yet</h3>
              <p className="text-gray-500">Files shared with you will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sharedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800 hover:border-blue-500/30 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">{file.fileName}</h3>
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>From: {file.sender.name} ({file.sender.email})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Shared: {new Date(file.sharedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(file.recordId, file.fileName)}
                        disabled={loading || !decryptedPrivateKey}
                        className="bg-blue-500/20 backdrop-blur-md border border-blue-400/50 hover:bg-blue-500/30 px-6 py-3 rounded-lg font-semibold transition text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading && hashInfo?.recordId === file.recordId ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Verify & Download</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* NEW: Hash Verification Info Box */}
                    {hashInfo && hashInfo.recordId === file.recordId && (
                      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 transition-all duration-300">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          {hashInfo.status === 'verifying' && <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />}
                          {hashInfo.status === 'matching' && <ShieldCheck className="w-4 h-4 text-green-400" />}
                          {hashInfo.status === 'mismatch' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                          Integrity Verification
                        </h4>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-400 flex-shrink-0">Blockchain Hash:</span>
                            <code className="text-cyan-400 bg-gray-900 px-2 py-1 rounded truncate min-w-0">{hashInfo.blockchainHash}</code>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-400 flex-shrink-0">Calculated Hash:</span>
                            <code className={`bg-gray-900 px-2 py-1 rounded truncate min-w-0 ${
                              hashInfo.status === 'matching' ? 'text-green-400' : 
                              hashInfo.status === 'mismatch' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {hashInfo.calculatedHash}
                            </code>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReceiveFiles;

