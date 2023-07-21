// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IERC6551Account } from "./erc6551/IERC6551Account.sol";
import { ERC6551Registry } from "./erc6551/ERC6551Registry.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

contract KyrieDaoAccountRegister is ERC6551Registry, Context {
    using Counters for Counters.Counter;
    // createAccount salt
    Counters.Counter private _salt;
    // ERC6551Registry contract
    address public accountContract;
    // ERC721 contract
    address public nftContract;
    // chain ID
    uint256 private _chainId;
    // createAccount initdata
    bytes private _initData;
    // nftId => salt
    mapping(uint256 => uint256) private _nftSaltOf;

    // only unregistered nft
    modifier onlyUnregistered(uint256 tokenId) {
        require(IERC721(nftContract).ownerOf(tokenId) == _msgSender(), "You need to be the owner of the NFT.");
        require(_nftSaltOf[tokenId] == 0, "The NFT has already been registered.");
        _;
    }

    constructor(address _accountContract, address _nftContract, uint256 chainId) {
        accountContract = _accountContract;
        nftContract = _nftContract;
        _chainId = chainId;
    }

    function daoAccountOf(uint256 tokenId) external view returns (address) {
        return _getAccount(accountContract, _chainId, nftContract, tokenId, _nftSaltOf[tokenId]);
    }

    function createDaoAccount(uint256 tokenId) external onlyUnregistered(tokenId) returns (address) {
        _salt.increment();
        _nftSaltOf[tokenId] = _salt.current();
        return _createAccount(accountContract, _chainId, nftContract, tokenId, _salt.current(), _initData);
    }

    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes calldata initData
    ) external override onlyUnregistered(tokenId) returns (address) {
        require(tokenContract != nftContract, "Plz use 'createDaoAccount()' register dao.");
        return _createAccount(implementation, chainId, tokenContract, tokenId, salt, initData);
    }

    function _createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes memory initData
    ) internal override returns (address) {
        bytes memory code = _creationCode(implementation, chainId, tokenContract, tokenId, salt);
        address _account = Create2.computeAddress(bytes32(salt), keccak256(code));
        if (_account.code.length != 0) return _account;

        _account = Create2.deploy(0, bytes32(salt), code);
        if (initData.length != 0) {
            (bool success, ) = _account.call(initData);
            if (!success) revert InitializationFailed();
        }

        emit AccountCreated(_account, implementation, chainId, tokenContract, tokenId, salt);
        return _account;
    }
}
