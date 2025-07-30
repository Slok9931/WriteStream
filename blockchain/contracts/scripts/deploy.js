const hre = require("hardhat");

async function main() {
  const Writestream = await hre.ethers.getContractFactory("Writestream");
  const writestream = await Writestream.deploy();
  await writestream.waitForDeployment(); // Use this for ethers v6
  console.log("Writestream deployed to:", writestream.target); // Use .target for ethers v6
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});