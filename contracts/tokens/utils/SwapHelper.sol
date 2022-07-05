// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../../interfaces/IERC20.sol";

import "../../interfaces/IUniswapV2Router02.sol";

contract SwapHelper {
    IERC20 public immutable _token;
    IERC20 public immutable _targetToken;
    IUniswapV2Router02 public _router;
    address public immutable _owner;

    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiqudity
    );

    modifier onlyToken() {
        require(msg.sender == address(_token), "helper: forbidden");
        _;
    }

    constructor(
        address owner_,
        address router_,
        address targetToken_
    ) {
        _token = IERC20(msg.sender);
        _router = IUniswapV2Router02(router_);
        _targetToken = IERC20(targetToken_);
        _owner = owner_;
    }

    function swapTokensToAddLiquidity(uint256 maxTxAmount) external onlyToken {
        uint256 tokenBalance = _token.balanceOf(address(this));
        if (tokenBalance > maxTxAmount) {
            tokenBalance = maxTxAmount;
        }
        uint256 half = tokenBalance / 2;
        uint256 otherHalf = tokenBalance - half;

        address[] memory path = new address[](2);
        path[0] = address(_token);
        path[1] = address(_targetToken);

        _token.approve(address(_router), tokenBalance);

        _router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            half,
            0,
            path,
            address(this),
            block.timestamp
        );
        uint256 targetBalance = _targetToken.balanceOf(address(this));
        _targetToken.approve(address(_router), targetBalance);

        _router.addLiquidity(
            address(_token),
            address(_targetToken),
            otherHalf,
            targetBalance,
            0,
            0,
            _owner,
            block.timestamp
        );
        emit SwapAndLiquify(half, targetBalance, otherHalf);
    }
}
