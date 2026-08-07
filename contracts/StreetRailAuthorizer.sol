// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title StreetRailAuthorizer
/// @notice ERC-1271 contract-wallet authorizer for the StreetRail treasury / rights agent.
/// @notice Lets Circle Gateway and any ERC-1271-aware counterparty verify that an action was
///         authorized by the treasury WITHOUT an EOA delegate holding a key: the treasury can
///         either grant a time-boxed delegate signer, or pre-approve a specific digest on-chain.
/// @notice Built for the Encode Club Programmable Money Hackathon (Build on Arc), August 2026
contract StreetRailAuthorizer {
    bytes4 internal constant MAGIC = 0x1626ba7e; // ERC-1271 isValidSignature magic value
    bytes4 internal constant FAIL = 0xffffffff;

    address public owner;

    struct Delegate {
        uint64 expiry;
        uint256 maxPerAuthUsd6;
    }

    mapping(address => Delegate) public delegates;
    mapping(bytes32 => uint64) public approvedHashes; // digest => expiry (0 = not approved)

    event DelegateGranted(address indexed delegate, uint64 expiry, uint256 maxPerAuthUsd6);
    event DelegateRevoked(address indexed delegate);
    event HashApproved(bytes32 indexed digest, uint64 expiry);
    event HashRevoked(bytes32 indexed digest);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner == address(0) ? msg.sender : initialOwner;
        emit OwnerChanged(address(0), owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Grant a time-boxed delegate signer (optional; the digest path needs no key at all).
    function grant(address delegate, uint64 expiry, uint256 maxPerAuthUsd6) external onlyOwner {
        delegates[delegate] = Delegate(expiry, maxPerAuthUsd6);
        emit DelegateGranted(delegate, expiry, maxPerAuthUsd6);
    }

    function revoke(address delegate) external onlyOwner {
        delete delegates[delegate];
        emit DelegateRevoked(delegate);
    }

    /// @notice Bless one payload digest with a transaction instead of a signature.
    function approveHash(bytes32 digest, uint64 expiry) external onlyOwner {
        approvedHashes[digest] = expiry;
        emit HashApproved(digest, expiry);
    }

    function revokeHash(bytes32 digest) external onlyOwner {
        delete approvedHashes[digest];
        emit HashRevoked(digest);
    }

    function isDelegateValid(address delegate) public view returns (bool) {
        uint64 exp = delegates[delegate].expiry;
        return exp != 0 && exp > block.timestamp;
    }

    function isHashApproved(bytes32 digest) public view returns (bool) {
        uint64 exp = approvedHashes[digest];
        return exp != 0 && exp > block.timestamp;
    }

    /// @notice ERC-1271. Empty signature = pre-approved-digest path (no EOA delegate required).
    function isValidSignature(bytes32 digest, bytes calldata signature) external view returns (bytes4) {
        if (signature.length == 0) {
            return isHashApproved(digest) ? MAGIC : FAIL;
        }
        if (signature.length != 65) return FAIL;
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        if (v < 27) v += 27;
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) return FAIL;
        if (signer == owner || isDelegateValid(signer)) return MAGIC;
        return FAIL;
    }
}
