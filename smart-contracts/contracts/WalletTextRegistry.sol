// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WalletTextRegistry
/// @notice Stores one public text entry per wallet. Each wallet can update only its own entry.
contract WalletTextRegistry {
    uint256 public constant MAX_TEXT_BYTES = 512;

    mapping(address => string) private texts;

    event TextUpdated(address indexed wallet, uint256 byteLength);

    /// @notice Set or replace the text associated with the caller's wallet.
    /// @dev The limit is measured in UTF-8 bytes, not Unicode characters.
    function updateText(string calldata newText) external {
        require(bytes(newText).length <= MAX_TEXT_BYTES, "Text exceeds 512 bytes");

        texts[msg.sender] = newText;
        emit TextUpdated(msg.sender, bytes(newText).length);
    }

    /// @notice Read the public text associated with a wallet.
    function getText(address wallet) external view returns (string memory) {
        return texts[wallet];
    }
}
