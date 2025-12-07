const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentValidationRegistry to", hre.network.name, "...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const AgentValidationRegistry = await hre.ethers.getContractFactory("AgentValidationRegistry");
  const registry = await AgentValidationRegistry.deploy();

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log("\n✅ AgentValidationRegistry deployed successfully!");
  console.log("Contract address:", address);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\nYou can verify the contract on Optimism Sepolia Explorer:");
  console.log(`https://sepolia-optimism.etherscan.io/address/${address}`);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

