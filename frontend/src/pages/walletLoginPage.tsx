import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, AlertTriangle, Wallet } from 'lucide-react';

// Simulated wallet utilities (replace with your actual wallet.ts imports)
// interface WalletData {
//   mnemonic: string;
//   privateKey: string;
//   address: string;
// }

import { generateWallet, restoreWallet , type WalletData} from "../utils/wallet";

// Mock functions - replace with your actual imports
// const generateWallet = (): WalletData => ({
//   mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
//   privateKey: "0x" + "a".repeat(64),
//   address: "0x" + "1".repeat(40)
// });

// const restoreWallet = (mnemonic: string): WalletData => {
//   const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
//   const words = cleanMnemonic.split(' ');
  
//   if (![12, 15, 18, 21, 24].includes(words.length)) {
//     throw new Error(`Invalid word count: ${words.length}`);
//   }
  
//   return generateWallet();
// };

export default function WalletUI() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false);

  const handleGenerate = () => {
    const newWallet = generateWallet();
    setWallet(newWallet);
    setHasConfirmedBackup(false);
    setError("");
  };

  const handleLogin = () => {
    setError("");
    try {
      const trimmed = mnemonicInput.trim();
      if (!trimmed) {
        setError("Please enter a mnemonic phrase");
        return;
      }
      
      // Clean the mnemonic
      const cleanMnemonic = trimmed.toLowerCase().replace(/\s+/g, ' ');
      const words = cleanMnemonic.split(' ');
      
      // Validate word count
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        setError(`Invalid mnemonic: expected 12, 15, 18, 21, or 24 words, got ${words.length} words`);
        return;
      }
      
      const restored = restoreWallet(cleanMnemonic);
      setWallet(restored);
      setMnemonicInput("");
      setHasConfirmedBackup(true);
      setShowMnemonic(true); // Show mnemonic after restore so user can verify
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error occurred";
      setError(`Failed to restore wallet: ${errorMsg}`);
      console.error("Restore error:", e);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      alert("Failed to copy to clipboard");
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear the wallet? Make sure you've saved your mnemonic!")) {
      setWallet(null);
      setMnemonicInput("");
      setError("");
      setHasConfirmedBackup(false);
      setShowPrivateKey(false);
      setShowMnemonic(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonicInput(text);
      setError(""); // Clear any previous errors
    } catch (e) {
      setError("Failed to read from clipboard. Please paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Crypto Wallet</h1>
            </div>
            <p className="text-purple-100 mt-2">Secure wallet generation and management</p>
          </div>

          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-200 text-sm">{error}</p>
                  <p className="text-red-300 text-xs mt-1">
                    Tip: Make sure there are no extra spaces at the beginning or end
                  </p>
                </div>
              </div>
            )}

            {/* Wallet not created yet */}
            {!wallet && (
              <div className="space-y-6">
                {/* Generate New Wallet */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-3">Create New Wallet</h2>
                  <p className="text-gray-300 text-sm mb-4">
                    Generate a new wallet with a secure mnemonic phrase
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02]"
                  >
                    Generate New Wallet
                  </button>
                </div>

                {/* Restore from Mnemonic */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-3">Restore Existing Wallet</h2>
                  <p className="text-gray-300 text-sm mb-4">
                    Enter your mnemonic phrase (12, 15, 18, 21, or 24 words)
                  </p>
                  <div className="relative">
                    <textarea
                      placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                      value={mnemonicInput}
                      onChange={(e) => {
                        setMnemonicInput(e.target.value);
                        setError(""); // Clear error on input
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 min-h-[100px] font-mono text-sm"
                      rows={4}
                    />
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={handlePaste}
                        className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 py-1 px-3 rounded transition-colors"
                      >
                        📋 Paste from Clipboard
                      </button>
                      {mnemonicInput && (
                        <button
                          onClick={() => setMnemonicInput("")}
                          className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 py-1 px-3 rounded transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {mnemonicInput && (
                    <div className="mb-3 text-xs text-gray-400">
                      Word count: {mnemonicInput.trim().split(/\s+/).filter(w => w).length}
                    </div>
                  )}
                  
                  <button
                    onClick={handleLogin}
                    disabled={!mnemonicInput.trim()}
                    className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all border border-white/20"
                  >
                    Restore Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Wallet Details */}
            {wallet && (
              <div className="space-y-4">
                {/* Backup Warning */}
                {!hasConfirmedBackup && (
                  <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-yellow-200 font-semibold">Backup Your Wallet</h3>
                        <p className="text-yellow-300 text-sm mt-1">
                          Write down your mnemonic phrase and store it safely. This is the only way to recover your wallet!
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasConfirmedBackup}
                        onChange={(e) => setHasConfirmedBackup(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-yellow-200 text-sm">I have securely saved my mnemonic phrase</span>
                    </label>
                  </div>
                )}

                {/* Mnemonic Phrase */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">Mnemonic Phrase</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={showMnemonic ? "Hide" : "Show"}
                      >
                        {showMnemonic ? (
                          <EyeOff className="w-4 h-4 text-gray-300" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(wallet.mnemonic, 'mnemonic')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Copy"
                      >
                        {copiedField === 'mnemonic' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-300 font-mono text-sm break-all">
                    {showMnemonic ? wallet.mnemonic : '•'.repeat(60)}
                  </p>
                </div>

                {/* Private Key */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">Private Key</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={showPrivateKey ? "Hide" : "Show"}
                      >
                        {showPrivateKey ? (
                          <EyeOff className="w-4 h-4 text-gray-300" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(wallet.privateKey, 'privateKey')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Copy"
                      >
                        {copiedField === 'privateKey' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-300 font-mono text-sm break-all">
                    {showPrivateKey ? wallet.privateKey : '•'.repeat(66)}
                  </p>
                </div>

                {/* Address */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">Wallet Address</h3>
                    <button
                      onClick={() => copyToClipboard(wallet.address, 'address')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedField === 'address' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-300 font-mono text-sm break-all">{wallet.address}</p>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold py-3 px-6 rounded-lg transition-all border border-red-500/30"
                >
                  Clear Wallet
                </button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-white/5 border-t border-white/10">
            <p className="text-gray-400 text-xs text-center">
              ⚠️ Never share your mnemonic phrase or private key with anyone. Store them securely offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}