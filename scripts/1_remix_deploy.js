(async function () {

    const tokens = (amount, decimals = 18) => {
        return ethers.BigNumber.from(amount).mul(ethers.BigNumber.from(10).pow(decimals));
    };

    const big = (num, pow = 0, base = 10) => {
        return ethers.BigNumber.from(num).mul(ethers.BigNumber.from(base).pow(pow)).toString(10);
    }

    const timeNowSeconds = () => {
        return parseInt(Date.now() / 1000);
    }

    try {
        const provider = new ethers.providers.Web3Provider(web3Provider);
        const signer = provider.getSigner();
        const account = await signer.getAddress();

        const wethMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/artifacts/WETH.json'));
        const busdMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/tokens/artifacts/BUSD.json'));
        const usdtMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/tokens/artifacts/USDT.json'));
        const factoryMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/artifacts/UniswapV2Factory.json'));
        const routerMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/artifacts/UniswapV2Router02.json'));
        const pairMeta = JSON.parse(await remix.call('fileManager', 'getFile', 'browser/contracts/artifacts/UniswapV2Pair.json'));

        const wethFactory = new ethers.ContractFactory(wethMeta.abi, wethMeta.data.bytecode.object, signer);
        const busdFactory = new ethers.ContractFactory(busdMeta.abi, busdMeta.data.bytecode.object, signer);
        const usdtFactory = new ethers.ContractFactory(usdtMeta.abi, usdtMeta.data.bytecode.object, signer);
        const factoryFactory = new ethers.ContractFactory(factoryMeta.abi, factoryMeta.data.bytecode.object, signer);
        const routerFactory = new ethers.ContractFactory(routerMeta.abi, routerMeta.data.bytecode.object, signer);

        const wethToken = await wethFactory.deploy();
        const busdToken = await busdFactory.deploy(tokens(big(1, 9)));
        const usdtToken = await usdtFactory.deploy(tokens(big(1, 9)));

        console.log(`WETH token: ${wethToken.address}`);
        console.log(`BUSD token: ${busdToken.address}`);
        console.log(`USDT token: ${usdtToken.address}`);

        const factory = await factoryFactory.deploy(account);
        console.log(`FACTORY address: ${factory.address}`);
        const router = await routerFactory.deploy(factory.address, wethToken.address);
        console.log(`ROUTER address: ${router.address}`);
        await factory.createPair(wethToken.address, busdToken.address);
        const pairAddress = await factory.getPair(wethToken.address, busdToken.address);
        console.log(`PAIR address: ${pairAddress}`);
        const pair = new ethers.Contract(pairAddress, pairMeta.abi, signer);
        console.log(`DEPLOYED!`);

        const wethAmount = ethers.utils.parseEther('50');
        const busdAmount = await busdToken.balanceOf(account);
        const usdtAmount = await busdToken.balanceOf(account);

        let tx = await wethToken.deposit({ from: account, value: wethAmount });
        await tx.wait();
        console.log(`weth deposited ${wethAmount.toString()}`);

        // tx = await wethToken.approve(router.address, wethAmount);
        // await tx.wait();
        // console.log(`weth approved ${wethAmount.toString()}`);

        // tx = await wethToken.approve(pair.address, wethAmount);
        // await tx.wait();
        // console.log(`weth approved ${wethAmount.toString()}`);

        // tx = await busdToken.approve(router.address, bsudAmount);
        // await tx.wait();
        // console.log(`busd approved ${bsudAmount.toString()}`);

        // tx = await busdToken.approve(pair.address, bsudAmount);
        // await tx.wait();
        // console.log(`busd approved ${bsudAmount.toString()}`);

        console.log(`add BUSD liquidity ${wethAmount.div(2).toString()} / ${busdAmount.toString()}`);
        console.log(`add USDT liquidity ${wethAmount.div(2).toString()} / ${usdtAmount.toString()}`);
        // await router.addLiquidity(
        //     wethToken.address,
        //     busdToken.address,
        //     wethAmount.div(2),
        //     busdAmount,
        //     0,
        //     0,
        //     account,
        //     parseInt(Date.now() / 1000) + 300
        // );

        // await router.addLiquidity(
        //     wethToken.address,
        //     busdToken.address,
        //     wethAmount.div(2),
        //     usdtAmount,
        //     0,
        //     0,
        //     account,
        //     parseInt(Date.now() / 1000) + 300
        // );

        console.log(`DONE!`);
    } catch (e) {
        console.log(e.message)
    }
})();