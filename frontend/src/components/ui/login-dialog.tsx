import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


export function LoginDialog() {
  const [open, setOpen] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState("");

  const handleLogin = () => {
    // Handle login logic here
    console.log("Login with seed phrase:", seedPhrase);
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
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="seedPhrase" className="text-sm font-medium text-white">
              12-Word Seed Phrase
            </label>
            <textarea
              id="seedPhrase"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
              placeholder="Enter your 12-word seed phrase separated by spaces"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleLogin} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Login
          </button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
