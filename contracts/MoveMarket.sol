// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getApproved(uint256 tokenId) external view returns (address);
}

/// @title StreetRail Move Market — list, buy and transfer Move Rights NFTs on Arc.
/// @notice Non-custodial: the seller keeps the token and only grants an approval.
///         Payment settles in any Arc stablecoin (USDC, EURC, cirBTC).
contract MoveMarket {
    struct Listing {
        address seller;
        address payToken;
        uint256 price;
    }

    IERC721 public immutable nft;
    mapping(uint256 => Listing) public listings;
    uint256[] public listedIds;
    mapping(uint256 => uint256) private _idx; // 1-based index into listedIds

    event Listed(uint256 indexed tokenId, address indexed seller, address payToken, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, address payToken, uint256 price);

    constructor(address nftAddress) {
        nft = IERC721(nftAddress);
    }

    function list(uint256 tokenId, address payToken, uint256 price) external {
        require(nft.ownerOf(tokenId) == msg.sender, "not_owner");
        require(price > 0, "bad_price");
        require(payToken != address(0), "bad_token");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || nft.getApproved(tokenId) == address(this),
            "not_approved"
        );
        listings[tokenId] = Listing(msg.sender, payToken, price);
        if (_idx[tokenId] == 0) {
            listedIds.push(tokenId);
            _idx[tokenId] = listedIds.length;
        }
        emit Listed(tokenId, msg.sender, payToken, price);
    }

    function cancel(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "not_seller");
        _remove(tokenId);
        emit Cancelled(tokenId, msg.sender);
    }

    function buy(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "not_listed");
        require(l.seller != msg.sender, "self_buy");
        require(nft.ownerOf(tokenId) == l.seller, "seller_moved");
        _remove(tokenId);
        require(IERC20(l.payToken).transferFrom(msg.sender, l.seller, l.price), "pay_failed");
        nft.transferFrom(l.seller, msg.sender, tokenId);
        emit Sold(tokenId, l.seller, msg.sender, l.payToken, l.price);
    }

    function activeCount() external view returns (uint256) {
        return listedIds.length;
    }

    function listingAt(uint256 index)
        external
        view
        returns (uint256 tokenId, address seller, address payToken, uint256 price)
    {
        tokenId = listedIds[index];
        Listing memory l = listings[tokenId];
        return (tokenId, l.seller, l.payToken, l.price);
    }

    function _remove(uint256 tokenId) private {
        uint256 pos = _idx[tokenId];
        if (pos != 0) {
            uint256 last = listedIds[listedIds.length - 1];
            listedIds[pos - 1] = last;
            _idx[last] = pos;
            listedIds.pop();
            _idx[tokenId] = 0;
        }
        delete listings[tokenId];
    }
}
