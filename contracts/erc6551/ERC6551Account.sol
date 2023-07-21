// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1271 } from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { Bytecode } from "../utils/sstore2/Bytecode.sol";
import { IERC6551Account } from "./IERC6551Account.sol";

contract ERC6551Account is IERC165, IERC1271, IERC6551Account {
    uint256 private _nonce;

    event TransactionExecuted(address indexed target, uint256 indexed value, bytes data, uint256 nonce);

    receive() external payable {}

    function executeCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result) {
        require(msg.sender == owner(), "Not token owner");

        bool success;
        (success, result) = to.call{ value: value }(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        ++_nonce;
        emit TransactionExecuted(to, value, data, _nonce);
    }

    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        uint256 length = address(this).code.length;
        return abi.decode(Bytecode.codeAt(address(this), length - 0x60, length), (uint256, address, uint256));
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = this.token();
        if (chainId != block.chainid) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function nonce() external view returns (uint256) {
        return _nonce;
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return (interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC6551Account).interfaceId);
    }

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue) {
        bool isValid = SignatureChecker.isValidSignatureNow(owner(), hash, signature);

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }

        return "";
    }
}
