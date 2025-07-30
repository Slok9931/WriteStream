require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.0" },
      { version: "0.8.28" }
    ]
  },
  networks: {
    mainnet: {
      url: "https://mainnet.infura.io/v3/4e0ed3d914394d36af75a5d64011823a",
      accounts: ["ab74093a71026e629f571ec5bdf5424f6dcab930b68342c6c2fb59e8fee6cbf1"]
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/4e0ed3d914394d36af75a5d64011823a",
      accounts: ["ab74093a71026e629f571ec5bdf5424f6dcab930b68342c6c2fb59e8fee6cbf1"]
    }
  }
};
