import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../../../smart-contracts/artifacts/contracts/MyContracts.sol/MyContract.json";
import MetaConnect from "./metaConnect";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const WriteOnBlock = () => {
  const [message, setMessage] = useState<string>();
  const [newMessage, setNewMessage] = useState<string>("");

  // Fetch current message from contract
  const fetchMessage = async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);
    const value = await contract.message();
    setMessage(value);
  };

  // Update message via MetaMask signer
  const updateMessage = async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, signer);

    const tx = await contract.updateMessage(newMessage);
    await tx.wait();

    await fetchMessage();
  };

  // Fetch message on component mount
  useEffect(() => {
    fetchMessage();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Hardhat + MetaMask Demo</h1>

      {/* Render MetaConnect component to handle wallet connection */}
      <MetaConnect onConnected={(acc) => console.log("Wallet connected:", acc)} />

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
};

export default WriteOnBlock;
