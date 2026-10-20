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
import { getApiErrorMessage } from "../../utils/apiError";

export function RegisterDialog() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const { register, connectWallet, walletAddress } = useAuth();

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password) {
      setFeedback({ message: "All fields are required.", success: false });
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setFeedback({ message: "Name must be between 2 and 50 characters.", success: false });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setFeedback({ message: "Enter a valid email address.", success: false });
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(password)) {
      setFeedback({ message: "Password must be at least 6 characters and include uppercase, lowercase, and a number.", success: false });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const connectedAddress = walletAddress || await connectWallet();
      await register(trimmedName, trimmedEmail, password, connectedAddress);
      setName("");
      setEmail("");
      setPassword("");
      setFeedback({ message: "Account created successfully.", success: true });
    } catch (error: unknown) {
      const responseData = (error as { response?: { data?: { message?: unknown; errors?: Array<{ message?: unknown }> } } })?.response?.data;
      const validationMessages = responseData?.errors
        ?.map(item => typeof item.message === "string" ? item.message : "")
        .filter(Boolean)
        .join(" ");
      const message = validationMessages ||
        (typeof responseData?.message === "string" ? responseData.message :
          error instanceof Error ? error.message : "Registration failed. Please try again.");
      setFeedback({ message, success: false });
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
            Connect MetaMask first. After account creation, you will sign a server-generated phrase to register your file-encryption public key.
          </DialogDescription>
        </DialogHeader>
        {feedback && (
          <div
            role={feedback.success ? "status" : "alert"}
            className={`rounded-lg border px-3 py-2 text-sm ${feedback.success ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}
          >
            {feedback.message}
          </div>
        )}
        {walletAddress ? (
          <p className="text-xs text-green-300">Wallet connected: {walletAddress}</p>
        ) : (
          <button
            onClick={async () => {
              setFeedback(null);
              try {
                await connectWallet();
              } catch (error) {
                setFeedback({ message: getApiErrorMessage(error, "Could not connect MetaMask."), success: false });
              }
            }}
            disabled={loading}
            className="rounded border border-blue-400 px-3 py-2 text-sm text-blue-200"
          >
            Connect MetaMask
          </button>
        )}
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
            <p className="text-xs text-zinc-400">
              At least 6 characters, including uppercase, lowercase, and a number.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleRegister} disabled={loading || !walletAddress} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}