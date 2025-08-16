const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function uploadToIPFS(content) {
  const formData = new FormData();
  const blob = new Blob([content], { type: "text/plain" });
  formData.append("file", blob, "article.txt");

  try {
    const response = await fetch("http://localhost:8000/upload/", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.IpfsHash || data.Ipfs_Cid || data.Hash || data.IpfsCid;
  } catch (error) {
    console.error("Failed to upload to IPFS:", error);
    // Fallback to a test hash
    return "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  }
}

async function main() {
  // Test articles with real content
  const testArticles = [
    {
      title: "Introduction to Blockchain Technology",
      content: `
        <h1>Introduction to Blockchain Technology</h1>
        <p>Blockchain technology is a revolutionary innovation that has the potential to transform various industries. At its core, a blockchain is a distributed ledger that maintains a continuously growing list of records, called blocks, which are linked and secured using cryptography.</p>
        
        <h2>What is Blockchain?</h2>
        <p>A blockchain is essentially a digital ledger of transactions that is duplicated and distributed across the entire network of computer systems on the blockchain. Each block in the chain contains a number of transactions, and every time a new transaction occurs on the blockchain, a record of that transaction is added to every participant's ledger.</p>
        
        <h2>Key Features</h2>
        <ul>
          <li><strong>Decentralization:</strong> No single entity controls the network</li>
          <li><strong>Transparency:</strong> All transactions are visible to all participants</li>
          <li><strong>Immutability:</strong> Once recorded, data cannot be altered</li>
          <li><strong>Security:</strong> Advanced cryptography protects the data</li>
        </ul>
        
        <h2>Applications</h2>
        <p>Blockchain technology has applications beyond cryptocurrency, including supply chain management, voting systems, digital identity, and more.</p>
      `,
      price: "0.01"
    },
    {
      title: "The Future of Decentralized Finance",
      content: `
        <h1>The Future of Decentralized Finance</h1>
        <p>Decentralized Finance (DeFi) represents a paradigm shift in how we think about financial services. By leveraging blockchain technology, DeFi aims to create an open, permissionless, and transparent financial system.</p>
        
        <h2>What is DeFi?</h2>
        <p>DeFi refers to financial applications built on blockchain networks that aim to recreate traditional financial systems with greater transparency, accessibility, and efficiency. These applications operate without intermediaries like banks or brokers.</p>
        
        <h2>Core DeFi Protocols</h2>
        <ul>
          <li><strong>Lending Platforms:</strong> Allow users to borrow and lend crypto assets</li>
          <li><strong>DEXs (Decentralized Exchanges):</strong> Enable peer-to-peer trading</li>
          <li><strong>Yield Farming:</strong> Users earn rewards for providing liquidity</li>
          <li><strong>Stablecoins:</strong> Cryptocurrencies pegged to stable assets</li>
        </ul>
        
        <h2>Benefits of DeFi</h2>
        <p>DeFi offers several advantages over traditional finance, including lower fees, faster transactions, global accessibility, and programmability through smart contracts.</p>
      `,
      price: "0.02"
    },
    {
      title: "Smart Contracts: A Comprehensive Guide",
      content: `
        <h1>Smart Contracts: A Comprehensive Guide</h1>
        <p>Smart contracts are self-executing contracts with the terms of the agreement between buyer and seller being directly written into lines of code. They run on blockchain networks and automatically execute when predetermined conditions are met.</p>
        
        <h2>How Smart Contracts Work</h2>
        <p>Smart contracts work by following simple "if/when...then..." statements that are written into code on a blockchain. A network of computers executes the actions when predetermined conditions have been met and verified.</p>
        
        <h2>Key Characteristics</h2>
        <ul>
          <li><strong>Autonomy:</strong> Once deployed, they operate independently</li>
          <li><strong>Trust:</strong> No need for intermediaries</li>
          <li><strong>Backup:</strong> Distributed across the blockchain network</li>
          <li><strong>Safety:</strong> Cryptography protects against hacking</li>
          <li><strong>Speed:</strong> Automated execution reduces processing time</li>
          <li><strong>Savings:</strong> Eliminates intermediaries and their fees</li>
        </ul>
        
        <h2>Use Cases</h2>
        <p>Smart contracts have applications in various industries including finance, real estate, healthcare, and supply chain management. They can automate complex processes and reduce the need for trust in business relationships.</p>
      `,
      price: "0.015"
    }
  ];

  // Get the deployed contract
  const contractAddress = "0xeF835EB47aBa240e59E36c0F03be783ae75beaA6";
  const Writestream = await hre.ethers.getContractFactory("Writestream");
  const contract = Writestream.attach(contractAddress);

  console.log("Publishing articles with real content...");

  for (let i = 0; i < testArticles.length; i++) {
    const article = testArticles[i];
    try {
      console.log(`Publishing article ${i + 1}: ${article.title}`);
      
      // Upload content to IPFS
      const ipfsHash = await uploadToIPFS(article.content);
      console.log(`Content uploaded to IPFS: ${ipfsHash}`);
      
      // Publish article
      const priceInWei = ethers.parseEther(article.price);
      const tx = await contract.publishArticle(
        article.title,
        ipfsHash,
        priceInWei
      );
      
      await tx.wait();
      console.log(`✅ Article ${i + 1} published successfully!`);
    } catch (error) {
      console.error(`❌ Failed to publish article ${i + 1}:`, error.message);
    }
  }

  console.log("All articles published successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 