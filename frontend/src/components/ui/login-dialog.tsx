import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

export function LoginDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, connectWallet, walletAddress } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const address = walletAddress || await connectWallet();
      await login(email.trim(), password, address);
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Login or MetaMask key activation failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setErrorMessage(null);
    try {
      await connectWallet();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Could not connect MetaMask."));
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-white px-4 py-2 border border-white rounded hover:bg-white hover:text-black transition">
        Login
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle>Login to BlockShare</DialogTitle>
          <DialogDescription>
            Connect MetaMask, then enter your credentials. You will sign your account phrase to unlock file encryption.
          </DialogDescription>
        </DialogHeader>
        {walletAddress ? (
          <p className="text-xs text-green-300">Wallet connected: {walletAddress}</p>
        ) : (
          <button onClick={handleConnectWallet} disabled={loading} className="rounded border border-blue-400 px-3 py-2 text-sm text-blue-200">
            Connect MetaMask
          </button>
        )}
        {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
        <div className="grid gap-4 py-4">
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
          <button onClick={handleLogin} disabled={loading || !walletAddress || !email || !password} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
