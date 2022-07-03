// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../UniswapV2Pair.sol";

contract Assembler {
    constructor() {}

    function getPairByteCode() public pure returns (bytes32) {
        bytes memory bytecode = type(UniswapV2Pair).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }
}
