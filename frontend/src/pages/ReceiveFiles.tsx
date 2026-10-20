import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import EthCrypto from "eth-crypto";
import CryptoJS from "crypto-js";
import { getRecordFromBlockchain } from "../utils/dataOnChain";
import { deriveWalletEncryptionIdentity } from "../utils/walletEncryption";
import { getApiErrorMessage } from "../utils/apiError";
import MetaConnect from "../components/metaConnect";
import { useAuth } from "../context/AuthContext";
import { ProfileSettings } from "../components/profileSetting";

import { Download, Key, FileText, User, Clock, CheckCircle, Upload, ShieldCheck, ShieldAlert, Shield, LogOut, X, Inbox } from "lucide-react";
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

interface HashInfo {
  recordId: string;
  blockchainHash: string;
  calculatedHash: string;
  status: 'verifying' | 'matching' | 'mismatch' | 'idle';
}

const ReceiveFiles: React.FC = () => {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState("Connect MetaMask to unlock file decryption.");
  const navigate = useNavigate();
  const [hashInfo, setHashInfo] = useState<HashInfo | null>(null);
  const { user, logout, token, encryptionIdentity, setEncryptionIdentity } = useAuth();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isKeySettingsModalOpen, setIsKeySettingsModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileRef]);

  const openKeySettings = () => {
    setIsProfileMenuOpen(false);
    setIsKeySettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logout();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      jpg: '🖼',
      jpeg: '🖼',
      png: '🖼',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
    };
    return icons[ext] || '📁';
  };

  const handleWalletConnected = useCallback(async (account: string) => {
    setKeyLoading(true);
    setDecryptedPrivateKey("");
    setKeyStatus("Sign the server-provided key phrase in MetaMask to unlock decryption.");

    const activeToken = token || localStorage.getItem("token");
    if (!activeToken) {
      setKeyStatus("Log in with this wallet before activating file decryption.");
      setKeyLoading(false);
      return;
    }

    try {
      const identity = encryptionIdentity?.address.toLowerCase() === account.toLowerCase()
        ? encryptionIdentity
        : await deriveWalletEncryptionIdentity(activeToken, account);
      setEncryptionIdentity(identity);
      setDecryptedPrivateKey(identity.privateKey);
      setKeyStatus("Encryption key unlocked for this session.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not unlock the encryption key.";
      setKeyStatus(message);
      console.error("Wallet encryption setup failed:", message);
    } finally {
      setKeyLoading(false);
    }
  }, [token, encryptionIdentity, setEncryptionIdentity]);

  const handleWalletDisconnected = useCallback(() => {
    setDecryptedPrivateKey('');
    setKeyLoading(false);
    setKeyStatus('Connect MetaMask to unlock file decryption.');
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
    } catch (error: unknown) {
      console.error("Failed to fetch shared files:", error);
      alert(getApiErrorMessage(error, "Failed to fetch shared files. Please check if logged in."));
    }
  };

  const downloadFile = async (recordId: string, fileName: string) => {
    if (!decryptedPrivateKey) {
      alert("Connect MetaMask and sign your key phrase first.");
      return;
    }

    setLoading(true);
    setHashInfo({
      recordId,
      blockchainHash: "Fetching...",
      calculatedHash: "Pending...",
      status: 'verifying'
    });

    try {
      // 1. Get record from blockchain
      console.log("Fetching record from blockchain for recordId:", recordId);
      const record = await getRecordFromBlockchain(recordId);
      const { eCID, eDEK, dHash } = record;
      console.log("Retrieved record:", { eCID, eDEK: eDEK.substring(0, 50) + "...", dHash });
      
      setHashInfo(prev => prev ? { ...prev, blockchainHash: dHash } : null);

      // 2. Decrypt DEK with private key
      console.log("Decrypting DEK...");
      const encryptedDekObj = EthCrypto.cipher.parse(eDEK);
      const decryptedDek = await EthCrypto.decryptWithPrivateKey(decryptedPrivateKey, encryptedDekObj);
      console.log("DEK decrypted successfully");

      // 3. Fetch the encrypted payload from Pinata. UUID CIDs are legacy GridFS file IDs.
      let encryptedPayload: Uint8Array | null = null;
      let legacyEncryptedText: string | null = null;
      let backendEncryptedAesKey: string | null = null;
      if (/^[a-f0-9-]{36}$/i.test(eCID)) {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in again to retrieve this file.");

        const legacyResponse = await axios.get(`http://localhost:5000/api/shared/file/${encodeURIComponent(recordId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer"
        });
        encryptedPayload = new Uint8Array(legacyResponse.data);
        const keyHeader = legacyResponse.headers["x-encrypted-aes-key"];
        if (typeof keyHeader === "string") backendEncryptedAesKey = decodeURIComponent(keyHeader);
      } else {
        const gateway = (import.meta.env.VITE_GATEWAY_URL || "https://gateway.pinata.cloud").replace(/\/+$/, "");
        const pinataResponse = await axios.get(`${gateway}/ipfs/${encodeURIComponent(eCID)}`, {
          responseType: "arraybuffer"
        });
        const payloadBytes = new Uint8Array(pinataResponse.data);
        const isLegacyCryptoJsPayload = new TextDecoder().decode(payloadBytes.subarray(0, 10)) === "U2FsdGVkX1";
        if (isLegacyCryptoJsPayload) {
          legacyEncryptedText = new TextDecoder().decode(payloadBytes);
        } else {
          encryptedPayload = payloadBytes;
        }
      }

      if (backendEncryptedAesKey && backendEncryptedAesKey !== eDEK) {
        throw new Error("The encrypted AES key from the backend does not match the blockchain record.");
      }

      // 4. Decrypt the AES-GCM payload (or legacy CryptoJS payload).
      let decryptedWordArray: CryptoJS.lib.WordArray;
      if (legacyEncryptedText !== null) {
        decryptedWordArray = CryptoJS.AES.decrypt(legacyEncryptedText, decryptedDek);
      } else {
        if (!encryptedPayload || encryptedPayload.length < 28) {
          throw new Error("Encrypted file payload is invalid or truncated.");
        }
        const normalizedDek = decryptedDek.replace(/^0x/i, "");
        if (!/^[0-9a-f]{64}$/i.test(normalizedDek)) {
          throw new Error("The decrypted AES key has an invalid format.");
        }
        const aesKeyBytes = new Uint8Array(normalizedDek.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        const aesKey = await window.crypto.subtle.importKey("raw", aesKeyBytes, "AES-GCM", false, ["decrypt"]);
        const iv = encryptedPayload.slice(0, 12);
        const ciphertext = encryptedPayload.slice(12);
        const plaintext = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
        decryptedWordArray = CryptoJS.lib.WordArray.create(new Uint8Array(plaintext));
      }

      if (decryptedWordArray.sigBytes <= 0) {
        throw new Error("File decryption failed. The file or encryption key may be invalid.");
      }

      // 5. Verify the hash of the decrypted plaintext against the chain record.
      const calculatedHash = CryptoJS.SHA256(decryptedWordArray).toString();
      console.log("Calculated hash:", calculatedHash);
      console.log("Blockchain hash:", dHash);

      // 6. Compare hashes
      if (calculatedHash === dHash) {
        console.log("✅ Hash verification successful! File is authentic.");
        setHashInfo(prev => prev ? { ...prev, calculatedHash, status: 'matching' } : null);
        
        // 7. Convert WordArray to Uint8Array properly
        console.log("Converting to bytes for download...");
        const words = decryptedWordArray.words;
        const sigBytes = decryptedWordArray.sigBytes;
        const uint8Array = new Uint8Array(sigBytes);
        
        for (let i = 0; i < sigBytes; i++) {
          const wordIndex = Math.floor(i / 4);
          const byteIndex = i % 4;
          uint8Array[i] = (words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
        }

        console.log("Converted to Uint8Array, length:", uint8Array.length);

        // 8. Create blob and download
        const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("File downloaded successfully");
        alert("File integrity verified and downloaded successfully!");
      } else {
        console.error("❌ HASH MISMATCH!");
        console.error("Expected:", dHash);
        console.error("Got:", calculatedHash);
        setHashInfo(prev => prev ? { ...prev, calculatedHash, status: 'mismatch' } : null);
        alert("File verification failed! The file's integrity could not be confirmed. Download aborted.");
      }

    } catch (error: unknown) {
      console.error("Failed to download file:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide more specific error messages
      const detailMessage = error instanceof Error ? error.message : String(error);
      let userErrorMessage = "Failed to download file. ";
      if (detailMessage.toLowerCase().includes("decrypt")) {
        userErrorMessage += "Decryption failed - please check your MetaMask wallet.";
      } else if (detailMessage.includes("IPFS") || (axios.isAxiosError(error) && error.response?.status === 404)) {
        userErrorMessage += "File not found in storage.";
      } else if (detailMessage.toLowerCase().includes("blockchain")) {
        userErrorMessage += "Could not retrieve record from blockchain.";
      } else {
        userErrorMessage += "An error occurred: " + detailMessage;
      }
      
      alert(userErrorMessage);
      setHashInfo(null);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Key Settings Modal/Overlay */}
      {isKeySettingsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-zinc-900 rounded-xl shadow-2xl p-6 border border-zinc-700/50">
            <button
              onClick={() => setIsKeySettingsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/50 text-white hover:bg-zinc-700 transition"
            >
              <X size={20} />
            </button>
            <ProfileSettings />
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '4s'}} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#1e40af 1px, transparent 1px),
                             linear-gradient(90deg, #1e40af 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }} />
        </div>

        {/* Floating particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-blue-400/30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `float ${8 + particle.delay}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
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

            <div className="flex items-center space-x-3">
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-3 bg-gray-900/60 px-4 py-2 rounded-xl shadow-xl border border-gray-800 backdrop-blur-sm hover:bg-gray-800/60 transition-all duration-300 group focus:outline-none"
                  aria-expanded={isProfileMenuOpen}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className='text-left hidden sm:block'>
                    <span className="font-semibold text-white text-sm">{user?.name || 'User'}</span>
                    <div className="flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Verified</span>
                    </div>
                  </div>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right bg-zinc-800/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                    <div className="py-1">
                      <button
                        onClick={openKeySettings}
                        className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-white rounded-lg hover:bg-zinc-700/50 transition-colors duration-200"
                      >
                        <Key className="w-4 h-4 text-red-400" />
                        <span>Key Revocation Settings</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-red-400 rounded-lg hover:bg-red-500/10 transition-colors duration-200 mt-1 border-t border-zinc-700/50 pt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-40 max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-12 animate-float-in">
          <h1 className="text-4xl font-bold text-white mb-4">
            Receive Secure Files
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Decrypt and download files shared with you, with integrity verified by the blockchain.
          </p>
        </div>

        {/* MetaMask-derived encryption key */}
        <div className="mb-6 bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800 hover:border-blue-500/30 transition-all duration-500">
          <div className="mb-4">
            <h3 className="flex items-center space-x-3 text-white text-lg font-semibold mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <span>Unlock with MetaMask</span>
            </h3>
            <p className="text-gray-400 text-sm">
              MetaMask signs your authenticated key phrase. The derived private key stays in memory for this session.
            </p>
          </div>
          <MetaConnect onConnected={handleWalletConnected} onDisconnected={handleWalletDisconnected} />
          <p className={`mt-3 text-sm ${decryptedPrivateKey ? "text-green-400" : keyLoading ? "text-yellow-300" : "text-gray-400"}`}>
            {keyLoading ? "Waiting for MetaMask signature..." : keyStatus}
          </p>
          {decryptedPrivateKey && (
            <div className="mt-4 flex items-center space-x-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Encryption key unlocked. You can now download files.</span>
            </div>
          )}
        </div>

        {/* Shared Files Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <span>Shared Files</span>
            </h2>
            <div className="flex items-center space-x-2 text-blue-400">
              <Download className="w-4 h-4" />
              <span className="text-sm font-mono">{sharedFiles.length} Files</span>
            </div>
          </div>

          {sharedFiles.length === 0 ? (
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border-2 border-dashed border-gray-700 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Files Yet</h3>
              <p className="text-gray-500 text-sm">Files shared with you will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sharedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800 hover:border-blue-500/30 hover:shadow-blue-500/5 transition-all duration-300 animate-slide-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-base">{getFileIcon(file.fileName)}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-white truncate" title={file.fileName}>{file.fileName}</h3>
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

                    {/* Hash Verification Info Box */}
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

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }

        @keyframes float-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-8px) translateX(4px) rotate(120deg); }
          66% { transform: translateY(-4px) translateX(-4px) rotate(240deg); }
        }

        .animate-float-in {
          animation: float-in 0.6s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ReceiveFiles;