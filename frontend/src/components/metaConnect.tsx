import { useEffect, useState } from "react";
import { useAppStore } from "../context/useTypes"; // your Zustand store

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface MetaConnectProps {
  onConnected?: (account: string) => void;
  onDisconnected?: () => void;
}

const MetaConnect: React.FC<MetaConnectProps> = ({ onConnected, onDisconnected }) => {
  // Zustand store selectors and actions
  const setMetaConnected = useAppStore((state) => state.setMetaIsConnected);

  const [account, setAccount] = useState<string>();

  // --- Check if already connected on mount ---
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const notifyConnected = (account: string) => {
      setAccount(account);
      setMetaConnected(true);
      if (onConnected) onConnected(account);
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(undefined);
        setMetaConnected(false);
        onDisconnected?.();
        return;
      }
      notifyConnected(accounts[0]);
    };

    const checkConnection = async () => {
      try {
        const accounts: string[] = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) notifyConnected(accounts[0]);
      } catch (err) {
        console.error("Error checking MetaMask accounts:", err);
      }
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    checkConnection();
    return () => ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [setMetaConnected, onConnected, onDisconnected]);

  // --- Connect MetaMask ---
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }

    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts[0]) throw new Error('No MetaMask account was selected.');
      setAccount(accounts[0]);
      setMetaConnected(true);
      if (onConnected) onConnected(accounts[0]);
    } catch (err) {
      console.error("Error connecting MetaMask:", err);
    }
  };

  return (
    <div>
      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <p>Connected as: {account}</p>
      )}
    </div>
  );
};

export default MetaConnect;
