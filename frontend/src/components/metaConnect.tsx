import { useEffect, useState } from "react";
import { useAppStore } from "../context/useTypes"; // your Zustand store

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface MetaConnectProps {
  onConnected?: (account: string) => void; // optional callback when wallet connects
}

const MetaConnect: React.FC<MetaConnectProps> = ({ onConnected }) => {
  // Zustand store selectors and actions
  const isConnected = useAppStore((state) => state.metaIsConnected);
  const setMetaConnected = useAppStore((state) => state.setMetaIsConnected);

  const [account, setAccount] = useState<string>();

  // --- Check if already connected on mount ---
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setMetaConnected(true);
            if (onConnected) onConnected(accounts[0]);
          }
        } catch (err) {
          console.error("Error checking MetaMask accounts:", err);
        }
      }
    };
    checkConnection();
  }, [setMetaConnected, onConnected]);

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
      setAccount(accounts[0]);
      setMetaConnected(true);
      if (onConnected) onConnected(accounts[0]);
      console.log("MetaMask connected:", accounts[0]);
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
