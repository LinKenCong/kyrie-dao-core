// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor() ERC20("ERC20Mock", "ERC20Mock") {
        _mint(msg.sender, 10000 * 10 ** 18);
    }

    function mint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }
}
