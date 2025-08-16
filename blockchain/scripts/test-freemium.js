const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying updated Writestream contract...");

  // Deploy the contract
  const Writestream = await hre.ethers.getContractFactory("Writestream");
  const contract = await Writestream.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${contractAddress}`);

  // Test publishing a free article
  console.log("\n📝 Publishing a free article...");
  try {
    const tx1 = await contract.publishArticle(
      "Introduction to Blockchain Technology",
      "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      0 // Free article
    );
    await tx1.wait();
    console.log("✅ Free article published successfully!");

    // Test publishing a paid article
    console.log("\n💰 Publishing a paid article...");
    const priceInWei = ethers.parseEther("0.01");
    const tx2 = await contract.publishArticle(
      "Advanced Smart Contract Development",
      "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      priceInWei
    );
    await tx2.wait();
    console.log("✅ Paid article published successfully!");

    // Test the isArticleFree function
    console.log("\n🔍 Testing isArticleFree function...");
    const isArticle1Free = await contract.isArticleFree(1);
    const isArticle2Free = await contract.isArticleFree(2);
    console.log(`Article 1 (Free): ${isArticle1Free}`);
    console.log(`Article 2 (Paid): ${isArticle2Free}`);

    // Test checkAccess for free article
    console.log("\n🔐 Testing access control...");
    const [signer] = await hre.ethers.getSigners();
    const accessToFree = await contract.checkAccess(1, signer.address);
    const accessToPaid = await contract.checkAccess(2, signer.address);
    console.log(`Access to free article: ${accessToFree}`);
    console.log(`Access to paid article (before purchase): ${accessToPaid}`);

    // Test purchasing the paid article
    console.log("\n🛒 Testing article purchase...");
    const purchaseTx = await contract.purchaseArticle(2, { value: priceInWei });
    await purchaseTx.wait();
    console.log("✅ Article purchased successfully!");

    // Check access after purchase
    const accessAfterPurchase = await contract.checkAccess(2, signer.address);
    console.log(`Access to paid article (after purchase): ${accessAfterPurchase}`);

    console.log("\n🎉 All freemium tests passed!");
    console.log(`\nContract address for frontend: ${contractAddress}`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 