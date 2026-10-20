import { ethers } from "hardhat";

async function main() {
  const WalletTextRegistry = await ethers.getContractFactory("WalletTextRegistry");
  const registry = await WalletTextRegistry.deploy();

  await registry.waitForDeployment();
  console.log(`WalletTextRegistry deployed to: ${await registry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
