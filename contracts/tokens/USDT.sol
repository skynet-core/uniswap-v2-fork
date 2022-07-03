// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC20.sol";

contract USDT is ERC20 {
    constructor(uint256 _initialSupply) ERC20("USDT", "USDT") {
        _mint(msg.sender, _initialSupply);
    }
}
