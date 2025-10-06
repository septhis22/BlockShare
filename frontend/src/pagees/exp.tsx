import { useState } from "react";
import { ethers } from "ethers";
// Import the ABI JSON that Hardhat generates
// import contractArtifact from "/../smart-contracts/artifacts/contracts/MyContract.sol/MyContract.json";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/MyContracts.sol/MyContract.json";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function connection() {
  const [account, setAccount] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [newMessage, setNewMessage] = useState<string>("");

  // Connect MetaMask
  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);

    await fetchMessage();
  }

  // Read the message from the contract
  async function fetchMessage() {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractArtifact.abi,
      provider
    );

    const value = await contract.message();
    setMessage(value);
  }

  // Update the message (transaction via MetaMask)
  async function updateMessage() {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractArtifact.abi,
      signer
    );

    const tx = await contract.updateMessage(newMessage);
    await tx.wait();

    await fetchMessage();
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Hardhat + MetaMask Demo</h1>

      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <p>Connected as: {account}</p>
      )}

      <p>Current Message: {message ?? "Not loaded yet"}</p>

      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Enter new message"
      />
      <button onClick={updateMessage}>Update Message</button>
    </div>
  );
}

export default connection;
