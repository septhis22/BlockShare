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

export function RegisterDialog() {
  const [username, setUsername] = useState("");

  const handleRegister = () => {
    // Handle registration logic here
    console.log("Register with username:", username);
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
            Create your account with a username.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-white">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-600 bg-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-zinc-400"
              placeholder="Enter your username"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleRegister} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Register
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}