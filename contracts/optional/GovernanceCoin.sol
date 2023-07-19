// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { ERC20Votes, ERC20Permit, ERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract GovernanceCoin is ERC20Votes {
    uint256 public sMaxSupply = 1000000 * 1e18;

    constructor() ERC20("GovernanceCoin", "GC") ERC20Permit("GovernanceToken") {
        _mint(msg.sender, sMaxSupply);
    }

    // The functions below are overrides required by Solidity.

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
}
