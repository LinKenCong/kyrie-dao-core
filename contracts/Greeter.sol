// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

error GreeterError();

contract Greeter is Ownable {
    string public greeting;
    uint256 private value;

    // Emitted when the stored value changes
    event ValueChanged(uint256 newValue);

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

    function throwError() external pure {
        revert GreeterError();
    }

    // Stores a new value in the contract
    function store(uint256 newValue) public onlyOwner {
        value = newValue;
        emit ValueChanged(newValue);
    }

    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return value;
    }
}
