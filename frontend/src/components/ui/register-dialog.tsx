import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleArrowRight } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import EthCrypto from 'eth-crypto';
import CryptoJS from 'crypto-js';

// Function to generate a cryptographically secure random salt (16 bytes = 32 hex chars)
const generateSalt = (length: number = 16): string => {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(length));
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export function RegisterDialog() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      console.error("All fields are required");
      return;
    }

    // Generate encryption key pair
    const identity = EthCrypto.createIdentity();
    console.log("Generated identity:", identity);
    
    // STEP 1: Generate random salt
    const salt = generateSalt();
    console.log("Generated salt:", salt);

    // STEP 2: Derive encryption key from password using PBKDF2
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
        keySize: 256 / 32,  // 256 bits = 32 bytes = 8 words
        iterations: 1000
    });

    // STEP 3: Encrypt private key using the derived key and salt as IV
    const encryptedPrivKey = CryptoJS.AES.encrypt(identity.privateKey, key, {
        iv: saltWordArray,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
    }).toString();

    console.log("Registering with public key:", identity.publicKey);
    console.log("Encrypted private key length:", encryptedPrivKey.length);

    setLoading(true);
    try {
      await register(name, email, password, identity.publicKey, encryptedPrivKey, salt);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error: unknown) {
      console.error("Registration failed:", error);
      const errorMessage = (error as any)?.response?.data?.error || "Registration failed";
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-blue-500/20 backdrop-blur-md border border-blue-400/50 hover:bg-blue-500/30 px-8 py-3 rounded-lg font-semibold transition text-white flex items-center gap-2">
          Register
          <span><CircleArrowRight size={20} /></span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle>Register for BlockShare</DialogTitle>
          <DialogDescription>
            Create your account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-white">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
              placeholder="Enter your password"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleRegister} disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}