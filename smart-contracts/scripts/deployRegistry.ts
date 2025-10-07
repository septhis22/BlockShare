import { ethers } from "hardhat";

// Name of the contract to deploy
const CONTRACT_NAME = "Registry";

async function main() {
  // 1. Get the Contract Factory. 
  // This line is correct, matching the contract name 'Registry'.
  const ContractFactory = await ethers.getContractFactory(CONTRACT_NAME);

  // 2. Deploy the contract. 
  // Since the Registry contract has no constructor arguments, 
  // we call deploy() without any arguments.
  console.log(`Deploying ${CONTRACT_NAME}...`);
  const contract = await ContractFactory.deploy();

  // 3. Wait for deployment confirmation (transaction to be mined)
  await contract.waitForDeployment();

  // 4. Get deployed contract address
  const contractAddress = await contract.getAddress();
  console.log(`✅ ${CONTRACT_NAME} deployed to: ${contractAddress}`);

  // 5. Optionally, verify the contract (requires Etherscan API key setup in hardhat.config.ts)
  // console.log("To verify the contract, run:");
  // console.log(`npx hardhat verify ${contractAddress} --network <your_network_name>`);
}

// Run the deploy script and handle errors
main().catch((error) => {
  console.error(error);
  // Exit the process with an error code if deployment fails
  process.exitCode = 1; 
});
