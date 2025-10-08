import React, { useState } from 'react';
import axios from 'axios';
import EthCrypto from 'eth-crypto';
import CryptoJS from 'crypto-js';
import { useAuth } from "../context/AuthContext";
import { User, RefreshCw, Key, AlertTriangle, Download } from 'lucide-react';

// Utility function to generate a cryptographically secure random salt
const generateSalt = (length: number = 16): string => {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(length));
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper function to download the new private key
const downloadNewPrivateKey = (
    privateKey: string, 
    encryptedPrivateKey: string, 
    salt: string
) => {
    const keyData = {
        privateKey: privateKey, // Unencrypted for immediate use
        encryptedPrivateKey: encryptedPrivateKey,
        salt: salt,
        generatedAt: new Date().toISOString(),
        warning: 'Keep this file secure! You will need it to decrypt your files.'
    };

    // Create a blob and download it
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { 
        type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `private-key-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('New private key downloaded successfully');
};

/**
 * Component for revoking and regenerating the user's encryption keys.
 * This is a critical security operation.
 */
export function ProfileSettings() {
    const { user, token } = useAuth();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    
    // New state for warning modal
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hasAcknowledged, setHasAcknowledged] = useState(false);

    // Placeholder for the API URL (ensure this matches your server config)
    const API_URL = 'http://localhost:5000/api/auth/regenerate-keys';

    // This function orchestrates the entire key revocation and update process.
    const handleKeyRegeneration = async () => {
        if (!user || !token) {
            setStatusMessage("Error: You must be logged in to revoke keys.");
            return;
        }
        
        if (!confirmPassword) {
            setStatusMessage("Please enter your current password to confirm.");
            return;
        }

        if (!hasAcknowledged) {
            setStatusMessage("Please acknowledge that you understand this action is permanent.");
            return;
        }

        setLoading(true);
        setStatusMessage("1. Generating new ECC key pair...");

        try {
            // --- STEP 1: Generate NEW ECC Key Pair and Salt ---
            const newIdentity = EthCrypto.createIdentity();
            const newSalt = generateSalt();

            // --- STEP 2: Encrypt NEW Private Key using Password + Salt ---
            // Combine password with salt for stronger encryption
            const keyDerivation = password + newSalt;
            const newEncryptedPrivKey = CryptoJS.AES.encrypt(
                newIdentity.privateKey, 
                keyDerivation
            ).toString();

            // --- STEP 3: Call Backend API to Verify Password and Update Keys ---
            setStatusMessage("2. Verifying password and updating database...");
            
            const response = await axios.post(
                API_URL, 
                {
                    password: confirmPassword,
                    new_public_key: newIdentity.publicKey,
                    new_encrypted_private_key: newEncryptedPrivKey,
                    new_salt: newSalt
                }, 
                {
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                }
            );

            // --- STEP 4: Download the new private key ---
            setStatusMessage("3. Downloading new private key...");
            downloadNewPrivateKey(
                newIdentity.privateKey,
                newEncryptedPrivKey,
                newSalt
            );

            // --- STEP 5: Success Handling ---
            setLoading(false);
            setStatusMessage(`✅ Success! Keys regenerated and downloaded. New Public Key: ${newIdentity.publicKey.substring(0, 10)}...`);
            
            // Close modal and reset
            setShowWarningModal(false);
            setConfirmPassword("");
            setHasAcknowledged(false);
            setPassword("");

            // Optional: Refresh user data or redirect to login
            // You might want to call a refresh function from your auth context here

        } catch (error) {
            setLoading(false);
            const errorMessage = axios.isAxiosError(error) 
                ? (error.response?.data?.message || error.response?.data?.error || 'API call failed.')
                : 'An unexpected error occurred.';
            
            setStatusMessage(`❌ Key Regeneration Failed: ${errorMessage}. Please check your password.`);
            console.error("Key Regeneration Error:", error);
        }
    };

    if (!user) {
        return <div className="text-zinc-500 p-4">Please log in to manage your keys.</div>;
    }

    return (
        <>
            <div className="bg-zinc-800 p-6 rounded-xl shadow-lg border border-red-500/50 max-w-lg mx-auto">
                <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                    <Key size={24} /> Key Revocation & Regeneration
                </h3>
                <p className="text-zinc-300 mb-4">
                    This process <strong>revokes</strong> your current encryption key pair and generates a new one. All future shared files will use the new key.
                    <br />
                    <span className='font-semibold text-red-300'> ⚠️ Save all files before revoking - previous files encrypted with old keys will not be accessible!</span>
                    <br />
                    <span className='text-zinc-400 text-sm'>This does NOT change your login password.</span>
                </p>

                <button 
                    onClick={() => setShowWarningModal(true)} 
                    disabled={loading}
                    className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Key size={18} />
                    Revoke Old Keys & Generate New Pair
                </button>

                {statusMessage && (
                    <p className={`mt-4 p-3 rounded-lg text-center font-medium ${statusMessage.startsWith('❌') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                        {statusMessage}
                    </p>
                )}
                
                <p className="mt-4 text-xs text-zinc-400">
                    Current Public Key: {user.public_key.substring(0, 40)}...
                </p>
            </div>

            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-red-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-900/50 rounded-full p-3">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-red-300">
                                Warning: Data Loss Risk
                            </h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-4">
                                <p className="text-sm font-semibold text-red-300 mb-2">
                                    ⚠️ Your previously downloadable files will be lost!
                                </p>
                                <p className="text-sm text-red-400">
                                    Once you regenerate your encryption keys, all files encrypted with your old keys will become permanently inaccessible and cannot be decrypted.
                                </p>
                            </div>

                            <div className="bg-green-950/50 border border-green-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Download className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-300 mb-1">
                                            ✅ Your new private key will be downloaded automatically
                                        </p>
                                        <p className="text-sm text-green-400">
                                            After regeneration, a JSON file containing your new private key will be automatically downloaded. Keep this file secure!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-950/50 border border-blue-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Download className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-300 mb-1">
                                            Before proceeding:
                                        </p>
                                        <ul className="text-sm text-blue-400 space-y-1">
                                            <li>• Download all important files with old keys</li>
                                            <li>• Save them to a secure location</li>
                                            <li>• Verify files are accessible</li>
                                            <li>• After regeneration, re-upload files to encrypt with new keys</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-300">
                                    Enter your password to confirm
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Enter your current password"
                                    className="w-full px-4 py-2 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    disabled={loading}
                                />
                            </div>

                            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasAcknowledged}
                                        onChange={(e) => setHasAcknowledged(e.target.checked)}
                                        className="mt-1"
                                    />
                                    <span className="text-sm text-zinc-300">
                                        I understand that this action is permanent, I have downloaded all important files, and I will securely save my new private key
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowWarningModal(false);
                                    setConfirmPassword('');
                                    setHasAcknowledged(false);
                                }}
                                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleKeyRegeneration}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={loading || !confirmPassword || !hasAcknowledged}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    'Confirm & Regenerate'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}