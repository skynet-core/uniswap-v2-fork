// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC20.sol";

contract BUSD is ERC20 {
    constructor(uint256 _initialSupply) ERC20("BUSD", "BUSD") {
        _mint(msg.sender, _initialSupply);
    }
}
