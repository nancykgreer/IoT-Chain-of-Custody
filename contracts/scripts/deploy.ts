import { ethers } from "hardhat";
import { ChainToken, ComplianceRewards } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying Healthcare Chain of Custody Smart Contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "AVAX");
  
  // Deploy ChainToken
  console.log("\n📄 Deploying ChainToken...");
  const ChainTokenFactory = await ethers.getContractFactory("ChainToken");
  const chainToken: ChainToken = await ChainTokenFactory.deploy(deployer.address);
  await chainToken.waitForDeployment();
  
  const chainTokenAddress = await chainToken.getAddress();
  console.log("✅ ChainToken deployed to:", chainTokenAddress);
  
  // Deploy ComplianceRewards
  console.log("\n📄 Deploying ComplianceRewards...");
  const ComplianceRewardsFactory = await ethers.getContractFactory("ComplianceRewards");
  const complianceRewards: ComplianceRewards = await ComplianceRewardsFactory.deploy(
    chainTokenAddress,
    deployer.address
  );
  await complianceRewards.waitForDeployment();
  
  const complianceRewardsAddress = await complianceRewards.getAddress();
  console.log("✅ ComplianceRewards deployed to:", complianceRewardsAddress);
  
  // Set up initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Add ComplianceRewards contract as reward minter
  console.log("🔑 Adding ComplianceRewards as reward minter...");
  await chainToken.addRewardMinter(complianceRewardsAddress);
  console.log("✅ ComplianceRewards added as reward minter");
  
  // Add deployer as compliance officer
  console.log("👮 Adding deployer as compliance officer...");
  await chainToken.addComplianceOfficer(deployer.address);
  console.log("✅ Deployer added as compliance officer");
  
  // Verify initial token supply
  const totalSupply = await chainToken.totalSupply();
  console.log("🪙 Initial token supply:", ethers.formatEther(totalSupply), "CHAIN");
  
  // Display deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("=" .repeat(50));
  console.log("🏥 Healthcare Chain of Custody Contracts");
  console.log("=" .repeat(50));
  console.log("🪙 ChainToken:", chainTokenAddress);
  console.log("🏆 ComplianceRewards:", complianceRewardsAddress);
  console.log("👤 Owner:", deployer.address);
  console.log("🌐 Network:", (await ethers.provider.getNetwork()).name);
  console.log("=" .repeat(50));
  
  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ChainToken: {
        address: chainTokenAddress,
        constructorArgs: [deployer.address]
      },
      ComplianceRewards: {
        address: complianceRewardsAddress,
        constructorArgs: [chainTokenAddress, deployer.address]
      }
    },
    tokenInfo: {
      name: "Healthcare Chain Token",
      symbol: "CHAIN",
      totalSupply: ethers.formatEther(totalSupply),
      maxSupply: "1000000000"
    }
  };
  
  console.log("\n💾 Deployment info saved for backend integration:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // If on testnet/mainnet, show verification commands
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) { // Not hardhat local
    console.log("\n🔍 Verification commands:");
    console.log(`npx hardhat verify --network ${network.name} ${chainTokenAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${network.name} ${complianceRewardsAddress} "${chainTokenAddress}" "${deployer.address}"`);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  
  return {
    chainToken: chainTokenAddress,
    complianceRewards: complianceRewardsAddress,
    deployer: deployer.address
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((addresses) => {
    console.log("✅ All contracts deployed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });