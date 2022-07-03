// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as hre from "hardhat";

const { ethers, network } = hre;

async function main() {
  await hre.run('compile');

  const [signer, charity] = await ethers.getSigners();
  const account = await signer.getAddress();
  const charityWallet = await charity.getAddress();

  const WETHFactory = await ethers.getContractFactory("WETH");
  const BUSDFactory = await ethers.getContractFactory("BUSD");
  const USDTFactory = await ethers.getContractFactory("USDT");
  const FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
  const RouterFactory = await ethers.getContractFactory("UniswapV2Router02");
  const GenericTokenFactory = await ethers.getContractFactory("GenericToken");

  const wethInstance = await WETHFactory.deploy();
  const busdInstance = await BUSDFactory.deploy(ethers.utils.parseEther('1000000000'));
  const usdtInstance = await USDTFactory.deploy(ethers.utils.parseEther('1000000000'));
  const factoryInstance = await FactoryFactory.deploy(account);

  await wethInstance.deployed();
  await busdInstance.deployed();
  await usdtInstance.deployed();
  await factoryInstance.deployed();

  const routerInstance = await RouterFactory.deploy(factoryInstance.address, wethInstance.address);

  await routerInstance.deployed();

  const ebtInstance = await GenericTokenFactory.deploy(
    "EasyBit",
    "EBT",
    '1000000000',
    18,
    10,
    1,
    routerInstance.address,
    busdInstance.address,
    charityWallet
  );

  await ebtInstance.deployed();

  console.log(`WETH address: ${wethInstance.address}`);
  console.log(`BUSD address: ${busdInstance.address}`);
  console.log(`USDT address: ${usdtInstance.address}`);
  console.log(`Factory address: ${factoryInstance.address}`);
  console.log(`Router address: ${routerInstance.address}`);
  console.log(`EasyBit address: ${ebtInstance.address}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
