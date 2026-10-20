import { useState } from 'react';
import axios from 'axios';
import { useAuth } from "../context/AuthContext";
import {
    clearWalletEncryptionIdentityCache,
    deriveWalletEncryptionIdentity
} from '../utils/walletEncryption';
import { RefreshCw, Key, AlertTriangle, Download } from 'lucide-react';

/**
 * Component for revoking and regenerating the user's encryption keys.
 * This is a critical security operation.
 */
export function ProfileSettings() {
    const { user, token, setEncryptionIdentity } = useAuth();

    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    
    // New state for warning modal
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hasAcknowledged, setHasAcknowledged] = useState(false);

    // Placeholder for the API URL (ensure this matches your server config)
    const API_URL = 'http://localhost:5000/api/auth/rotate-key-phrase';

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
        setStatusMessage("Verifying your password and rotating the server key phrase...");

        try {
            if (!window.ethereum) throw new Error("MetaMask is required to rotate the encryption key.");
            const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
            if (!accounts.length) throw new Error("Connect a MetaMask account to continue.");

            await axios.post(
                API_URL,
                { password: confirmPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            clearWalletEncryptionIdentityCache();
            setEncryptionIdentity(null);
            setStatusMessage("Phrase rotated. Sign the new phrase in MetaMask to activate the new key...");
            const identity = await deriveWalletEncryptionIdentity(token, accounts[0]);
            setEncryptionIdentity(identity);

            setStatusMessage(`Key rotated and activated for this session (${identity.publicKey.slice(0, 10)}…).`);
            setShowWarningModal(false);
            setConfirmPassword("");
            setHasAcknowledged(false);
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? (error.response?.data?.message || error.response?.data?.error || 'API call failed.')
                : error instanceof Error ? error.message : 'An unexpected error occurred.';

            setStatusMessage(`❌ Key rotation failed: ${errorMessage}`);
            console.error("Key rotation error:", errorMessage);
        } finally {
            setLoading(false);
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
                                            ✅ MetaMask will derive your new encryption key
                                        </p>
                                        <p className="text-sm text-green-400">
                                            After rotation, sign the new server phrase in MetaMask. The derived private key remains in browser memory and is not downloaded or stored.
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
                                            <li>• Download files encrypted with the current key before rotating</li>
                                            <li>• Rotation makes the previous key unavailable</li>
                                            <li>• Sign the new phrase with MetaMask after rotation</li>
                                            <li>• Re-share files using the new encryption key</li>
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
                                        I understand that this action is permanent, I have downloaded important files, and I will sign the new phrase with my MetaMask wallet
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