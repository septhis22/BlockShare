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
import { ethers } from "ethers";

export function RegisterDialog() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log("Signer address:", await signer.getAddress());

      // Sign a message to get the public key
      const message = "Sign this message to register your public key for secure file sharing.";
      const signature = await signer.signMessage(message);
      const digest = ethers.hashMessage(message);
      const uncompressedPublicKey = ethers.SigningKey.recoverPublicKey(digest, signature);
      console.log("Uncompressed public key:", uncompressedPublicKey);

      // Compress the public key manually
      const x = uncompressedPublicKey.slice(4, 68);
      const y = uncompressedPublicKey.slice(68);
      const yBigInt = BigInt('0x' + y);
      const parity = yBigInt % 2n === 0n ? '02' : '03';
      const compressedPublicKey = '0x' + parity + x;
      console.log("Compressed public key:", compressedPublicKey, "Length:", compressedPublicKey.length);

      setPublicKey(compressedPublicKey);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to get public key. Please try again.");
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !publicKey) {
      alert("All fields are required, including connecting wallet");
      return;
    }
    console.log("Registering with public key:", publicKey, "Length:", publicKey.length);
    setLoading(true);
    try {
      await register(name, email, password, publicKey);
      setName("");
      setEmail("");
      setPassword("");
      setPublicKey("");
    } catch (error: any) {
      console.error("Registration failed:", error);
      const errorMessage = error.response?.data?.error || "Registration failed";
      alert(errorMessage);
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
          <div className="space-y-2">
            <label htmlFor="publicKey" className="text-sm font-medium text-white">
              Public Key (Wallet Address)
            </label>
            <div className="flex gap-2">
              <input
                id="publicKey"
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="flex-1 px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
                placeholder="0x..."
              />
              <button onClick={connectWallet} className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600">
                Connect
              </button>
            </div>
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