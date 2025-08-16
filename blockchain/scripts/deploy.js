const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying WriteStream contract with freemium model...");

  // Get the contract factory
  const Writestream = await hre.ethers.getContractFactory("Writestream");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const contract = await Writestream.deploy();
  
  // Wait for deployment to finish
  await contract.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await contract.getAddress();
  
  console.log("✅ WriteStream contract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  
  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const articleCount = await contract.articleCount();
    console.log(`📊 Initial article count: ${articleCount}`);
    console.log("✅ Contract is working correctly!");
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    features: [
      "Freemium model support",
      "Free and paid articles",
      "Access control",
      "Voting system",
      "IPFS integration"
    ]
  };
  
  console.log("\n📋 Deployment Information:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Update the contract address in your frontend");
  console.log("2. Test the freemium functionality");
  console.log("3. Start publishing free and paid articles!");
  
  return contractAddress;
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 