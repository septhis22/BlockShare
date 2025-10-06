import { ethers } from "hardhat";

async function main() {
  // 1. Get the Contract Factory
  const ContractFactory = await ethers.getContractFactory("MyContract");

  // 2. Deploy with constructor arguments
  const contract = await ContractFactory.deploy("Hello Hardhat!");

  // 3. Wait for deployment confirmation
  await contract.waitForDeployment();

  // 4. Get deployed contract address
  console.log("MyContract deployed to:", await contract.getAddress());
}

// Run the deploy script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
