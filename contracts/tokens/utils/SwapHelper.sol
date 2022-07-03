// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract SwapHelper {
    address public _token;

    function initialize(address token) external {
        _token = token;
    }
}
