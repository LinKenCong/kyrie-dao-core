// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { ERC721, ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import { ERC721Votes } from "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";

import { IERC6551Account } from "./erc6551/IERC6551Account.sol";
import { ERC6551Registry } from "./erc6551/ERC6551Registry.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

contract KyrieDaoNft is ERC721, Pausable, Ownable, EIP712, ERC721Votes, ERC6551Registry {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    // chain ID
    uint256 private _chainId;
    // createAccount initdata
    bytes private _initData;

    // nft metadata base uri
    string public baseURI;
    // ERC6551Registry contract
    address public accountContract;

    constructor(address _accountContract) ERC721("KyrieDaoNft", "KDN") EIP712("KyrieDaoNft", "1") {
        accountContract = _accountContract;
        _chainId = block.chainid;
    }

    /**
     * --------------------------------------------------------
     * External Functions
     * --------------------------------------------------------
     */

    function isRegistered(address account) external view virtual returns (bool) {
        return balanceOf(account) > 0;
    }

    function daoAccountOf(uint256 tokenId) external view virtual returns (address) {
        require(ownerOf(tokenId) != address(0), "Account does not exist.");
        return _getAccount(accountContract, _chainId, address(this), tokenId, tokenId);
    }

    function totalSupply() public view virtual returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * --------------------------------------------------------
     * Only Owner
     * --------------------------------------------------------
     */

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function safeMint(address to) public onlyOwner returns (address account) {
        require(balanceOf(to) == 0, "An account already exists under this address.");
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        account = _createAccount(accountContract, _chainId, address(this), tokenId, tokenId, _initData);
    }

    function setBaseURI(string memory newURI) external onlyOwner {
        baseURI = newURI;
    }

    /**
     * --------------------------------------------------------
     * Override Functions
     * --------------------------------------------------------
     */

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        require(balanceOf(to) == 0, "An account already exists under this address.");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Votes) {
        super._afterTokenTransfer(from, to, tokenId, batchSize);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes calldata initData
    ) external override whenNotPaused returns (address) {
        require(tokenContract != address(this), "This contract cannot be used.");
        return _createAccount(implementation, chainId, tokenContract, tokenId, salt, initData);
    }
}
