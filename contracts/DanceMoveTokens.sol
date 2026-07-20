// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
/// @title PaymentDanceMoveTokens
/// @notice Create, pin, and trade unique dance moves with JSON metadata on IPFS representing rights.
/// @notice Built during the Creative AI & Quantum Hackathon organised by StreetKode Fam during Indian Krump Festival 14
contract PaymentDanceMoveTokens {
    // token = one of USDC / EURC / cirBTC (ERC-20 addresses configured off-chain)
    event Logged(address indexed author, address indexed token, uint256 amount, string cid, uint256 at);
    /// @notice Built during the Creative AI & Quantum Hackathon organised by StreetKode Fam during Indian Krump Festival 14
    function log(address token, uint256 amount, string calldata cid) external {
        emit Logged(msg.sender, token, amount, cid, block.timestamp);
    }
}
