import { expect, use } from "chai";
import { ethers, run } from "hardhat";
import { deployContract, MockProvider, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ContractFactory, Signer } from "ethers";

use(solidity);

describe("EasyBit", () => {
  const daiAmount = ethers.utils.parseEther('1000000000');

  let wallet: Signer, charityWallet: Signer;
  let account: any;
  let charityAccount: any;
  let WETHFactory: ContractFactory;
  let BUSDFactory: ContractFactory;
  let USDTFactory: ContractFactory;
  let FactoryFactory: ContractFactory;
  let RouterFactory: ContractFactory;
  let GenericTokenFactory: ContractFactory;
  let PairFactory: ContractFactory;
  let wethInstance: Contract;
  let busdInstance: Contract;
  let usdtInstance: Contract;
  let factoryInstance: Contract;
  let routerInstance: Contract;
  let ebtInstance: Contract;
  let accountBallance: BigNumber;
  let wallets: Signer[];

  beforeEach(async function () {
    await run("compile");

    wallets = await ethers.getSigners();
    wallet = wallets[0];
    charityWallet = wallets[1];
    wallets = wallets.slice(2);
    account = await wallet.getAddress();
    charityAccount = await charityWallet.getAddress();

    WETHFactory = await ethers.getContractFactory("WETH", wallet);
    BUSDFactory = await ethers.getContractFactory("BUSD", wallet);
    USDTFactory = await ethers.getContractFactory("USDT", wallet);
    FactoryFactory = await ethers.getContractFactory("UniswapV2Factory", wallet);
    RouterFactory = await ethers.getContractFactory("UniswapV2Router02", wallet);
    PairFactory = await ethers.getContractFactory("UniswapV2Pair", wallet);
    GenericTokenFactory = await ethers.getContractFactory("GenericToken", wallet);

    wethInstance = await WETHFactory.deploy();
    busdInstance = await BUSDFactory.deploy(daiAmount);
    usdtInstance = await USDTFactory.deploy(daiAmount);
    factoryInstance = await FactoryFactory.deploy(account);

    await wethInstance.deployed();
    await busdInstance.deployed();
    await usdtInstance.deployed();
    await factoryInstance.deployed();

    routerInstance = await RouterFactory.deploy(factoryInstance.address, wethInstance.address);

    await routerInstance.deployed();

    ebtInstance = await GenericTokenFactory.deploy(
      "EasyBit",
      "EBT",
      '1000000000',
      18,
      10,
      1,
      routerInstance.address,
      busdInstance.address,
      charityAccount,
      account,
    );

    await ebtInstance.deployed();

    const pairAddress_ = await factoryInstance.getPair(busdInstance.address, ebtInstance.address);

    accountBallance = await wallet.getBalance();
    expect(accountBallance.gt(0)).to.equal(true);

    const part = accountBallance.div(100);
    await wethInstance.deposit({ value: part });

    console.log(`WETH          address: ${wethInstance.address}`);
    console.log(`BUSD          address: ${busdInstance.address}`);
    console.log(`USDT          address: ${usdtInstance.address}`);
    console.log(`EBT           address: ${ebtInstance.address}`);
    console.log(`EBT/BUSD pair address: ${pairAddress_}`);
    // console.log(`Factory address: ${factoryInstance.address}`);
    console.log(`Router        address: ${routerInstance.address}`);
  });

  it("deploy assembler and match bytecodes", async function () {
    const factory = await ethers.getContractFactory("Assembler");
    const assembler = await factory.deploy();
    await assembler.deployed();
    const code = await assembler.getPairByteCode();
    // const codeFor089 = "0x7d76a9f08f47dc4a7f1a62a5bfd6f29d5d9ccac566d1f0f5b6621b6379e1bcc0";
    // expect(code).to.equal(codeFor089); // 0.8.9
    const codeFor0815 = "0x2aae69ada05ba8291ff3ac1bafe946ffe5a8e9cd4314e78869eee113ff12ca17";
    expect(code).to.equal(codeFor0815); // 0.8.15
  });

  it("factory must resolve pair address", async function () {
    const pairAddress = await factoryInstance.getPair(busdInstance.address, ebtInstance.address);
    const pairInstance = PairFactory.attach(pairAddress);
    const { _reserve0, _reserve1 } = await pairInstance.getReserves();
    console.log(`initial reserves: ${_reserve0.toString()}/${_reserve1.toString()}`);
    expect(_reserve0).to.equal(0, "must be 0");
    expect(_reserve1).to.equal(0, "must be 0");
  });

  it("test liquidity functionality", async function () {

    let wethBalance = await wethInstance.balanceOf(account);
    console.log(`WETH Balance: ${wethBalance.toString()}`);
    expect(wethBalance.gt(0)).to.equal(true, "account must have some weth balance");

    let totalSupply: BigNumber = await busdInstance.totalSupply();
    expect(totalSupply.eq(daiAmount)).to.equal(true, "amount should be same");

    // note: proper allowance values!
    await wethInstance.approve(routerInstance.address, wethBalance);
    await busdInstance.approve(routerInstance.address, totalSupply);

    await routerInstance.addLiquidity(
      wethInstance.address,
      busdInstance.address,
      wethBalance, // weth ...
      totalSupply, // busd ...
      0,
      0,
      account,
      ~~(Date.now() / 1000) + 15000
    );

    const pairAddress = await factoryInstance.getPair(wethInstance.address, busdInstance.address);
    const pairInstance = PairFactory.attach(pairAddress);

    let reserves: { _reserve0: BigNumber, _reserve1: BigNumber } = await pairInstance.getReserves();
    console.log(`RESERVES: ${reserves._reserve0.toString()}/${reserves._reserve1.toString()}`);
    expect(reserves._reserve0.gt(0)).to.equal(true, "must not be 0");
    expect(reserves._reserve1.gt(0)).to.equal(true, "must not be 0");

    // now we need to buy some BUSD tokens with ETH
    await routerInstance.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0, // any amount
      [wethInstance.address, busdInstance.address],
      account,
      ~~(Date.now() / 1000) + 15000,
      { value: accountBallance.div(10) }
    );

    let busdBalance: BigNumber = await busdInstance.balanceOf(account);
    console.log(`BUSD bal: ${busdBalance.toString()}`);

    totalSupply = await ebtInstance.totalSupply();
    await ebtInstance.approve(routerInstance.address, totalSupply);
    await busdInstance.approve(routerInstance.address, busdBalance);

    await routerInstance.addLiquidity(
      busdInstance.address,
      ebtInstance.address,
      busdBalance, // weth ...
      totalSupply, // busd ...
      0,
      0,
      account,
      ~~(Date.now() / 1000) + 15000
    );

    // todo: verify reserves ...
    // store account EBT ballance ...
    let otherAccountBalance: BigNumber;
    let otherBusdBalance: BigNumber;
    let lastEbtBalance: BigNumber;
    let currEbtBalance: BigNumber;
    let part: BigNumber;

    for (let w = 0; w < wallets.length; w++) {
      const otherWallet = wallets[w];
      const otherAddress = await otherWallet.getAddress();

      otherAccountBalance = await otherWallet.getBalance();

      // buy some busd ....
      await routerInstance.connect(otherWallet).swapExactETHForTokensSupportingFeeOnTransferTokens(
        0, // any amount
        [wethInstance.address, busdInstance.address],
        otherAddress,
        ~~(Date.now() / 1000) + 15000,
        { value: otherAccountBalance.div(10) }
      );

      otherBusdBalance = await busdInstance.connect(otherWallet).balanceOf(otherAddress);
      console.log(`${otherAddress} has BUSD: ${otherBusdBalance.toString()}`);

      await busdInstance.connect(otherWallet).increaseAllowance(routerInstance.address, otherBusdBalance);

      part = otherBusdBalance.div(20);

      lastEbtBalance = await ebtInstance.connect(otherWallet).balanceOf(otherAddress);
      currEbtBalance = lastEbtBalance;

      // buy ...
      for (let j = 0; j < 20; j++) {
        // now we can try to swap busd for EBT
        await routerInstance.connect(otherWallet).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          part,
          0, // any amount
          [busdInstance.address, ebtInstance.address],
          otherAddress,
          ~~(Date.now() / 1000) + 15000,
        );

        currEbtBalance = await ebtInstance.connect(otherWallet).balanceOf(otherAddress);
        expect(currEbtBalance.gt(lastEbtBalance)).to.equal(true, "new balance must be greater");
        lastEbtBalance = currEbtBalance;
      }
      console.log(`${otherAddress} now has EBT: ${lastEbtBalance.toString()}`);
      // sell
      const stp = await ebtInstance.totalSupply();
      const btp = await busdInstance.totalSupply();
      await busdInstance.connect(otherWallet).increaseAllowance(routerInstance.address, btp);
      await busdInstance.connect(otherWallet).increaseAllowance(pairAddress, btp);
      await ebtInstance.connect(otherWallet).increaseAllowance(routerInstance.address, stp);
      await ebtInstance.connect(otherWallet).increaseAllowance(pairAddress, stp);
      part = lastEbtBalance.div(40);

      for (let y = 0; y < 40; y++) {
        // now we can try to swap busd for EBT
        await routerInstance.connect(otherWallet).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          part,
          0, // any amount
          [ebtInstance.address, busdInstance.address],
          otherAddress,
          ~~(Date.now() / 1000) + 15000,
        );

        currEbtBalance = await ebtInstance.connect(otherWallet).balanceOf(otherAddress);
        expect(currEbtBalance.lt(lastEbtBalance)).to.equal(true, "new balance must have less EBT");
        lastEbtBalance = currEbtBalance;
      }
    }
    // check charity wallet ...
    currEbtBalance = await ebtInstance.connect(charityWallet).balanceOf(charityAccount);
    expect(currEbtBalance.gt(0)).to.equal(true, "charity wallet should receive some fees");

    reserves = await pairInstance.getReserves();
    console.log(`RESERVES: ${reserves._reserve0.toString()}/${reserves._reserve1.toString()}`);
  });
});
//                BUSD               /                  EBT
// before trades
//     98 009 473 309 542 439 279    /    1 000 000 000 000 000 000 000 000 000
// after trades
// 19 078 104 206 404 966 832 070    /        5 190 157 548 603 899 350 463 704