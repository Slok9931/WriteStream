const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying WriteStream Contract Deployment");
  console.log("==========================================");
  
  const CONTRACT_ADDRESS = '0x49BCcD2B54C2227fFffebD86B67aF781Ce1cA809';
  
  try {
    // Get the contract factory
    const Writestream = await hre.ethers.getContractFactory("Writestream");
    
    // Try to attach to existing contract
    console.log(`📍 Checking contract at: ${CONTRACT_ADDRESS}`);
    const contract = Writestream.attach(CONTRACT_ADDRESS);
    
    // Test basic functionality
    console.log("\n🧪 Testing Contract Functions:");
    
    // Test article count
    const articleCount = await contract.articleCount();
    console.log(`📊 Article Count: ${articleCount}`);
    
    // Test isArticleFree function (freemium feature)
    console.log("\n🔍 Testing Freemium Functions:");
    try {
      if (articleCount > 0) {
        const isFree = await contract.isArticleFree(1);
        console.log(`✅ isArticleFree function exists: ${isFree}`);
      } else {
        console.log("ℹ️  No articles to test isArticleFree");
      }
    } catch (error) {
      console.log(`❌ isArticleFree function not found: ${error.message}`);
      console.log("💡 This means the contract needs to be redeployed with freemium model");
    }
    
    // Test checkAccess function
    try {
      const [signer] = await hre.ethers.getSigners();
      if (articleCount > 0) {
        const access = await contract.checkAccess(1, signer.address);
        console.log(`✅ checkAccess function works: ${access}`);
      } else {
        console.log("ℹ️  No articles to test checkAccess");
      }
    } catch (error) {
      console.log(`❌ checkAccess function error: ${error.message}`);
    }
    
    console.log("\n📋 Contract Status Summary:");
    console.log("============================");
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`📊 Articles Published: ${articleCount}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    // Determine if redeployment is needed
    console.log("\n🎯 Recommendation:");
    if (articleCount > 0) {
      console.log("✅ Contract exists and has articles");
      console.log("🔍 Check if freemium functions work above");
    } else {
      console.log("📝 Contract exists but has no articles");
      console.log("🚀 Ready to test freemium functionality");
    }
    
    return {
      contractAddress: CONTRACT_ADDRESS,
      articleCount: articleCount,
      network: hre.network.name,
      status: "verified"
    };
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    console.log("\n💡 This means:");
    console.log("1. Contract is not deployed at this address");
    console.log("2. Contract doesn't have freemium functionality");
    console.log("3. Network connection issue");
    
    return {
      contractAddress: CONTRACT_ADDRESS,
      error: error.message,
      status: "failed"
    };
  }
}

main()
  .then((result) => {
    if (result.status === "verified") {
      console.log("\n✅ Contract verification completed!");
    } else {
      console.log("\n❌ Contract verification failed!");
    }
  })
  .catch((error) => {
    console.error("💥 Verification error:", error);
  }); 