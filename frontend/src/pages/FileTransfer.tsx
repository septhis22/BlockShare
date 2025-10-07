import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import EthCrypto from 'eth-crypto';
import { Upload,  Download, LogOut, User, Shield, Zap, Sparkles, Cloud, FileText, X, Lock, Key } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { uploadToPinata } from '../utils/pinataUploads';
import { uploadRecordToBlockchain } from '../utils/dataOnChain';
import MetaConnect from "../components/metaConnect";
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UploadResult {
  name: string;
  ipfsHash: string;
  dek: string;
  recordId?: string;
  txHash?: string;
}

interface SelectedFile {
  name: string;
  size: string;
  id: string;
  type: string;
  file: File;
}

export default function FileTransfer() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transfer');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [endToEndEncryption, setEndToEndEncryption] = useState(true);
  const [setExpiryDate, setSetExpiryDate] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Floating particles effect
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; size: number; delay: number}>>([]);

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

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.split('/')[1] || 'file',
        file: file
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.split('/')[1] || 'file',
        file: file
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.id !== id));
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
    if (!user) {
      alert("Please login first");
      return;
    }
    if (selectedFiles.length === 0 || !recipientAddress) return;

    setIsSending(true);
    setUploadResults([]);

    const results: UploadResult[] = [];

    // Get recipient's public key
    let recipientPublicKey: string;
    try {
      const response = await axios.get(`http://localhost:5000/api/auth/user?email=${encodeURIComponent(recipientAddress)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      recipientPublicKey = response.data.data.user.public_key;
      console.log("✅ Recipient public key:", recipientPublicKey);
      console.log("Length:", recipientPublicKey.length);

      // Validate public key format (EthCrypto uncompressed: 128 chars)
      if (recipientPublicKey.length !== 128) {
        alert(`Recipient's public key is not in the correct format. Length: ${recipientPublicKey.length}. Expected 128 characters. They may need to re-register.`);
        setIsSending(false);
        return;
      }
    } catch (err: any) {
      console.error("❌ Failed to get recipient public key:", err);
      const errorMessage = err.response?.data?.message || "Failed to find recipient or get their public key";
      alert(errorMessage);
      setIsSending(false);
      return;
    }

    for (const selectedFile of selectedFiles) {
      try {
        // 1️⃣ Encrypt file
        const { encryptedBlob, dek } = await encryptFile(selectedFile.file);

        // 2️⃣ Encrypt DEK with recipient's public key (remove 0x prefix)
        const publicKeyForEncryption = recipientPublicKey.startsWith('0x') ? recipientPublicKey.slice(2) : recipientPublicKey;
        console.log("Encrypting with public key (without 0x):", publicKeyForEncryption);
        const encryptedDek = await EthCrypto.encryptWithPublicKey(publicKeyForEncryption, dek);
        const encryptedDekString = EthCrypto.cipher.stringify(encryptedDek);
        console.log("Encrypted DEK:", encryptedDekString);

        // 3️⃣ Upload to Pinata
        const response = await uploadToPinata(encryptedBlob, selectedFile.name + ".enc");
        console.log("📦 Pinata response:", response);

        // ✅ SAFE CID EXTRACTION - handles all cases
        let eCID: string | null = null;

        if (typeof response === "string") {
          eCID = response;
        } else if (response && typeof response === "object") {
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

        // 4️⃣ Compute hash of encrypted data
        const arrayBuffer = await encryptedBlob.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
        const dHash = CryptoJS.SHA256(wordArray).toString();

        // 5️⃣ Store on blockchain
        try {
          const { recordId, txHash } = await uploadRecordToBlockchain(eCID, encryptedDekString, dHash);

          // 6️⃣ Share with recipient via backend
          try {
            await axios.post('http://localhost:5000/api/shared/share', {
              receiverEmail: recipientAddress,
              recordId,
              fileName: selectedFile.name
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ File ${selectedFile.name} shared with recipient.`);
          } catch (shareErr: any) {
            console.error(`❌ Failed to share ${selectedFile.name} with recipient:`, shareErr);
            const shareError = shareErr.response?.data?.message || "Failed to share file";
            console.error("Share error:", shareError);
          }

          results.push({
            name: selectedFile.name,
            ipfsHash: eCID,
            dek: encryptedDekString,
            recordId,
            txHash
          });
          console.log(`✅ File ${selectedFile.name} uploaded & stored on-chain.`);
        } catch (err) {
          console.error(`❌ Blockchain upload failed for ${selectedFile.name}:`, err);
          results.push({
            name: selectedFile.name,
            ipfsHash: eCID,
            dek: encryptedDekString
          });
        }
      } catch (err) {
        console.error(`❌ Error processing ${selectedFile.name}:`, err);
      }
    }

    setUploadResults(results);
    setIsSending(false);

    if (results.length > 0) {
      setSelectedFiles([]);
      setRecipientAddress('');
    }
  };

  const getFileIcon = (type: string) => {
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      jpg: '🖼',
      png: '🖼',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
      default: '📁'
    };
    return icons[type as keyof typeof icons] || icons.default;
  };

  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  const handleWalletConnected = (account: string) => {
    console.log("Wallet connected:", account);
    setIsWalletConnected(true);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blue glowing orbs */}
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
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-2xl transform hover:rotate-180 transition-all duration-500 group">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-blue-400 animate-ping" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  BlockShare
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400 font-mono">Blockchain Secured</span>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1 bg-gray-900/50 rounded-xl p-1 backdrop-blur-sm border border-gray-800">
              {[
                { id: 'transfer', icon: Upload, label: 'Send', action: () => setActiveTab('transfer') },
                { id: 'receive', icon: Download, label: 'Receive', action: () => navigate('/receive') }
              ].map(({ id, icon: Icon, label, action }) => (
                <button
                  key={id}
                  onClick={action}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300 ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              <MetaConnect onConnected={handleWalletConnected} />
               <div className="flex items-center space-x-3 bg-gray-900/60 px-4 py-2 rounded-xl shadow-xl border border-gray-800 backdrop-blur-sm hover:bg-gray-800/60 transition-all duration-300 group">
                 <div className="relative">
                   <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                     <User className="w-4 h-4 text-white" />
                   </div>
                 </div>
                 <div>
                   <span className="font-semibold text-white text-sm">{user?.name || 'User'}</span>
                   <div className="flex items-center space-x-1">
                     <Shield className="w-3 h-3 text-green-400" />
                     <span className="text-xs text-green-400">Verified</span>
                   </div>
                 </div>
               </div>
               <button
                 onClick={logout}
                 className="flex items-center space-x-2 px-3 py-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all duration-300 border border-red-500/20 hover:border-red-500/40 hover:shadow-lg group"
               >
                 <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 <span className="font-semibold text-sm">Logout</span>
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-40 max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-12 animate-float-in">
          <h1 className="text-4xl font-bold text-white mb-4">
            Secure Blockchain File Transfer
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Military-grade encryption with blockchain verification for ultimate file security
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Files Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800 hover:border-blue-500/30 transition-all duration-500 group h-fit">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Upload className="w-5 h-5 text-blue-400" />
                  </div>
                  <span>Upload & Encrypt Files</span>
                </h2>
                <div className="flex items-center space-x-2 text-blue-400">
                  <Lock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-mono">{selectedFiles.length} Files</span>
                </div>
              </div>
              
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-500 group cursor-pointer ${
                  dragActive
                    ? 'border-blue-400 bg-blue-500/10 scale-105 shadow-2xl'
                    : 'border-gray-700 hover:border-blue-400 hover:bg-gray-800/50 hover:shadow-xl'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Cloud className="w-7 h-7 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">
                      Drop files to encrypt
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold cursor-pointer hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 inline-block shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5">
                      Browse Files
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">Files are encrypted with AES-256 before upload</p>
                </div>
              </div>

              {/* Compact Selected Files Section */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Selected Files ({selectedFiles.length})</span>
                </h3>
                
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-6 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-400/50 transition-colors duration-300">
                    <FileText className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No files selected</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-400/50 hover:shadow-lg transition-all duration-300 group animate-slide-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-7 h-7 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">{getFileIcon(file.type)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white text-xs truncate" title={file.name}>
                              {truncateFileName(file.name, 18)}
                            </p>
                            <p className="text-blue-400 text-xs font-mono">{file.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-all duration-200 border border-red-500/20 hover:border-red-500/40 flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Results */}
            {uploadResults.length > 0 && (
              <div className="mt-6 bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <Key className="w-4 h-4 text-green-400" />
                  <span>Upload Results</span>
                </h3>
                <div className="space-y-3">
                  {uploadResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">{result.name}</p>
                          <div className="text-xs space-y-1 mt-2">
                            <p className="text-blue-400">
                              IPFS: <code className="bg-gray-900 px-1 rounded">{result.ipfsHash.slice(0, 20)}...</code>
                            </p>
                            <p className="text-cyan-400">
                              DEK: <code className="bg-gray-900 px-1 rounded">{result.dek.slice(0, 15)}...</code>
                            </p>
                            {result.recordId && (
                              <p className="text-green-400">
                                Record ID: <code className="bg-gray-900 px-1 rounded">{result.recordId.slice(0, 10)}...</code>
                              </p>
                            )}
                            {result.txHash && (
                              <p className="text-yellow-400">
                                Tx Hash: <code className="bg-gray-900 px-1 rounded">{result.txHash.slice(0, 10)}...</code>
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Wallet Connection */}
            {!isWalletConnected && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-yellow-500/30">
                <div className="text-center">
                  <Key className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-400 text-sm font-semibold mb-2">Connect Wallet Required</p>
                  <p className="text-gray-400 text-xs">Please connect your wallet to enable blockchain transactions</p>
                </div>
              </div>
            )}

            {/* Recipient Details */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-gray-800 hover:border-blue-500/30 transition-all duration-500 group">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Recipient</span>
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="recipient@example.com"
                      className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors duration-300 pl-9 text-sm backdrop-blur-sm"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-gray-800 hover:border-cyan-500/30 transition-all duration-500 group">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Security</span>
              </h2>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-all duration-300 border border-gray-700 hover:border-blue-500/30">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={endToEndEncryption}
                      onChange={(e) => setEndToEndEncryption(e.target.checked)}
                      className="w-4 h-4 bg-gray-800 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500/50 checked:bg-blue-500 appearance-none transition-colors duration-300"
                    />
                    {endToEndEncryption && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">AES-256 Encryption</p>
                    <p className="text-xs text-blue-400">Military-grade security</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-all duration-300 border border-gray-700 hover:border-cyan-500/30">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={setExpiryDate}
                      onChange={(e) => setSetExpiryDate(e.target.checked)}
                      className="w-4 h-4 bg-gray-800 border border-cyan-500 rounded focus:ring-2 focus:ring-cyan-500/50 checked:bg-cyan-500 appearance-none transition-colors duration-300"
                    />
                    {setExpiryDate && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Auto Expiry</p>
                    <p className="text-xs text-cyan-400">24h limit</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleEncryptAndUpload}
              disabled={selectedFiles.length === 0 || !recipientAddress || isSending || !isWalletConnected}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center space-x-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
              <span className="relative z-10 flex items-center space-x-2">
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Encrypting & Uploading...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Encrypt & Transfer</span>
                  </>
                )}
              </span>
            </button>
            
            <div className="text-center">
              <p className="text-gray-500 text-xs">
                {!isWalletConnected && 'Connect wallet to begin'}
                {isWalletConnected && selectedFiles.length === 0 && 'Select files to begin'}
                {isWalletConnected && selectedFiles.length > 0 && !recipientAddress && 'Enter recipient address'}
                {isWalletConnected && selectedFiles.length > 0 && recipientAddress && 'Ready to encrypt & transfer'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
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

        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #06b6d4);
          border-radius: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #0891b2);
        }
      `}</style>
    </div>
  );
}