const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentToken to", hre.network.name, "...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Initial supply: 1,000,000 tokens (with 18 decimals)
  const initialSupply = hre.ethers.parseEther("1000000");

  // Deploy the contract
  const AgentToken = await hre.ethers.getContractFactory("AgentToken");
  const token = await AgentToken.deploy(initialSupply);

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("\n✅ AgentToken deployed successfully!");
  console.log("Contract address:", address);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Initial supply:", hre.ethers.formatEther(initialSupply), "AGT");
  console.log("\nYou can verify the contract on Optimism Sepolia Explorer:");
  console.log(`https://sepolia-optimism.etherscan.io/address/${address}`);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: deployer.address,
    initialSupply: initialSupply.toString(),
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

