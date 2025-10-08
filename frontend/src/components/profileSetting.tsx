import React, { useState } from 'react';
import axios from 'axios';
import EthCrypto from 'eth-crypto';
import CryptoJS from 'crypto-js';
import { useAuth } from "../context/AuthContext";
import { User, RefreshCw, Key } from 'lucide-react';

// Utility function to generate a cryptographically secure random salt
const generateSalt = (length: number = 16): string => {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(length));
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Placeholder for the API URL (ensure this matches your server config)
    const API_URL = 'http://localhost:5000/api/auth/regenerate-keys';

    // This function orchestrates the entire key revocation and update process.
    const handleKeyRegeneration = async () => {
        if (!user || !token) {
            setStatusMessage("Error: You must be logged in to revoke keys.");
            return;
        }
        if (!password) {
            setStatusMessage("Please enter your current password to confirm.");
            return;
        }

        setLoading(true);
        setStatusMessage("1. Generating new ECC key pair...");

        try {
            // --- STEP 1: Generate NEW ECC Key Pair and Salt ---
            const newIdentity = EthCrypto.createIdentity();
            const newSalt = generateSalt();

            // --- STEP 2: Encrypt NEW Private Key using the CURRENT Password ---
            // This ensures the new private key is protected by the known password.
            const newEncryptedPrivKey = CryptoJS.AES.encrypt(newIdentity.privateKey, password).toString();

            // --- STEP 3: Call Backend API to Verify Password and Update Keys ---
            setStatusMessage("2. Verifying password and updating database...");
            
            const response = await axios.post(
                API_URL, 
                {
                    password: password,
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

            // --- STEP 4: Success Handling ---
            setLoading(false);
            setStatusMessage(`✅ Success! Keys regenerated. New Public Key: ${newIdentity.publicKey.substring(0, 10)}...`);
            setPassword(""); // Clear password after successful operation

            // In a real application, you would also need to update the client-side 
            // user state (e.g., via the useAuth context) to reflect the new public key and salt.
            // (Assumes useAuth has a refresh or setter function not shown here.)

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
        <div className="bg-zinc-800 p-6 rounded-xl shadow-lg border border-red-500/50 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <Key size={24} /> Key Revocation & Regeneration
            </h3>
            <p className="text-zinc-300 mb-4">
                This process **revokes** your current encryption key pair and generates a new one. All future shared files will use the new key.
                Please Save all the files before revoking the key as the previous files which are encrypted using old key will not be accessible.
                <span className='font-semibold text-red-300'> This does NOT change your login password.</span>
            </p>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label htmlFor="current-password" className="text-sm font-medium text-zinc-300">
                        Confirm Current Password
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-zinc-600 bg-zinc-900 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                        placeholder="Enter your current password"
                        disabled={loading}
                    />
                </div>

                <button 
                    onClick={handleKeyRegeneration} 
                    disabled={loading}
                    className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Key size={18} />
                            Revoke Old Keys & Generate New Pair
                        </>
                    )}
                </button>

                {statusMessage && (
                    <p className={`p-3 rounded-lg text-center font-medium ${statusMessage.startsWith('❌') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                        {statusMessage}
                    </p>
                )}
            </div>
            
            <p className="mt-4 text-xs text-zinc-400">
                Current Public Key: {user.public_key.substring(0, 40)}...
            </p>
        </div>
    );
}
