const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Test IPFS hashes (you can replace these with actual content)
  const testArticles = [
    {
      title: "Introduction to Blockchain Technology",
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      price: "0.01"
    },
    {
      title: "The Future of Decentralized Finance",
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      price: "0.02"
    },
    {
      title: "Smart Contracts: A Comprehensive Guide",
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      price: "0.015"
    }
  ];

  // Get the deployed contract
  const contractAddress = "0xeF835EB47aBa240e59E36c0F03be783ae75beaA6";
  const Writestream = await hre.ethers.getContractFactory("Writestream");
  const contract = Writestream.attach(contractAddress);

  console.log("Publishing test articles...");

  for (let i = 0; i < testArticles.length; i++) {
    const article = testArticles[i];
    try {
      const priceInWei = ethers.parseEther(article.price);
      const tx = await contract.publishArticle(
        article.title,
        article.ipfsHash,
        priceInWei
      );
      
      console.log(`Publishing article ${i + 1}: ${article.title}`);
      await tx.wait();
      console.log(`✅ Article ${i + 1} published successfully!`);
    } catch (error) {
      console.error(`❌ Failed to publish article ${i + 1}:`, error.message);
    }
  }

  console.log("Test articles publishing completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 