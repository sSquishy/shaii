// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BookNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => string) private _tokenURIs;

    event BookMinted(uint256 indexed tokenId, address indexed author, string metadataURI);

    constructor() ERC721("BookNFT", "BOOK") Ownable(msg.sender) {}

    // ✅ FIXED: Removed onlyOwner - now anyone can mint their own books
    function mintBook(address author, string memory metadataURI) external {
        // Optional: Require that the caller is minting to themselves
        require(msg.sender == author, "You can only mint books to yourself");
        
        uint256 tokenId = nextTokenId;
        _safeMint(author, tokenId);
        _tokenURIs[tokenId] = metadataURI;
        emit BookMinted(tokenId, author, metadataURI);
        nextTokenId++;
    }

    // Return token URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // Fetch all token IDs owned by a user
    function getBooksByOwner(address user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokens = new uint256[](balance);
        
        uint256 currentIndex = 0;
        // Loop through all minted tokens
        for (uint256 i = 0; i < nextTokenId && currentIndex < balance; i++) {
            try this.ownerOf(i) returns (address owner) {
                if (owner == user) {
                    tokens[currentIndex] = i;
                    currentIndex++;
                }
            } catch {
                // Token doesn't exist or was burned, skip it
                continue;
            }
        }
        
        return tokens;
    }
}