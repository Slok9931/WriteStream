const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deployToNetwork(networkName) {
  console.log(`\n🚀 Deploying to ${networkName}...`);
  
  try {
    // Get the contract factory
    const Writestream = await hre.ethers.getContractFactory("Writestream");
    
    // Deploy the contract
    console.log(`📦 Deploying contract to ${networkName}...`);
    const contract = await Writestream.deploy();
    
    // Wait for deployment to finish
    await contract.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await contract.getAddress();
    
    console.log(`✅ Successfully deployed to ${networkName}!`);
    console.log(`📍 Contract Address: ${contractAddress}`);
    
    // Verify the deployment
    try {
      const articleCount = await contract.articleCount();
      console.log(`📊 Initial article count: ${articleCount}`);
      console.log("✅ Contract verification successful!");
    } catch (error) {
      console.error("❌ Contract verification failed:", error.message);
    }
    
    return {
      network: networkName,
      contractAddress: contractAddress,
      deployer: (await hre.ethers.getSigners())[0].address,
      timestamp: new Date().toISOString(),
      status: "success"
    };
    
  } catch (error) {
    console.error(`❌ Deployment to ${networkName} failed:`, error.message);
    return {
      network: networkName,
      error: error.message,
      timestamp: new Date().toISOString(),
      status: "failed"
    };
  }
}

async function main() {
  console.log("🌐 Multi-Network WriteStream Deployment");
  console.log("=====================================");
  
  // Define networks to deploy to
  const networks = [
    "localhost",
    "hardhat",
    // Add more networks as needed:
    // "sepolia",
    // "goerli",
    // "mainnet"
  ];
  
  const deploymentResults = [];
  
  // Deploy to each network
  for (const network of networks) {
    try {
      // Set the network
      await hre.changeNetwork(network);
      
      // Deploy to the network
      const result = await deployToNetwork(network);
      deploymentResults.push(result);
      
    } catch (error) {
      console.error(`❌ Failed to deploy to ${network}:`, error.message);
      deploymentResults.push({
        network: network,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: "failed"
      });
    }
  }
  
  // Save deployment results
  const deploymentFile = path.join(__dirname, "../deployment-results.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
  
  console.log("\n📋 Deployment Summary:");
  console.log("=====================");
  
  const successful = deploymentResults.filter(r => r.status === "success");
  const failed = deploymentResults.filter(r => r.status === "failed");
  
  console.log(`✅ Successful deployments: ${successful.length}`);
  console.log(`❌ Failed deployments: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log("\n📍 Contract Addresses:");
    successful.forEach(result => {
      console.log(`${result.network}: ${result.contractAddress}`);
    });
  }
  
  if (failed.length > 0) {
    console.log("\n❌ Failed Deployments:");
    failed.forEach(result => {
      console.log(`${result.network}: ${result.error}`);
    });
  }
  
  console.log(`\n📄 Deployment results saved to: ${deploymentFile}`);
  
  return deploymentResults;
}

// Handle errors
main().catch((error) => {
  console.error("❌ Multi-network deployment failed:", error);
  process.exitCode = 1;
}); 