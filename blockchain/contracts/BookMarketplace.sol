// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BookMarketplace {
    IERC721 public immutable nft;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event ItemListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ItemCanceled(uint256 indexed tokenId, address indexed seller);
    event ItemSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, bytes32 txRef);

    constructor(address _nft) {
        require(_nft != address(0), "Invalid NFT address");
        nft = IERC721(_nft);
    }

    // Seller lists an owned token at a price (in wei). Marketplace must be approved for the token.
    function listItem(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be > 0");
        address owner = nft.ownerOf(tokenId);
        require(owner == msg.sender, "Not the token owner");
        // require approval
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        emit ItemListed(tokenId, msg.sender, price);
    }

    // Seller can cancel their listing
    function cancelListing(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.active, "Not listed");
        require(l.seller == msg.sender, "Not seller");
        delete listings[tokenId];
        emit ItemCanceled(tokenId, msg.sender);
    }

    // Buy a listed item. Transfers NFT to buyer and forwards funds to seller.
    function buyItem(uint256 tokenId) external payable {
        Listing memory l = listings[tokenId];
        require(l.active, "Item not listed");
        require(msg.value >= l.price, "Insufficient payment");

        // mark not active before external calls
        delete listings[tokenId];

        // Transfer NFT to buyer
        nft.safeTransferFrom(l.seller, msg.sender, tokenId);

        // Forward funds to seller
        (bool sent, ) = payable(l.seller).call{value: l.price}("");
        require(sent, "Payment to seller failed");

        // Refund any extra to buyer
        if (msg.value > l.price) {
            payable(msg.sender).transfer(msg.value - l.price);
        }

        emit ItemSold(tokenId, msg.sender, l.seller, l.price, keccak256(abi.encodePacked(block.timestamp, msg.sender, tokenId)));
    }
}
