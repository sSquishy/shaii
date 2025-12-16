//SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BookNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    event BookMinted(uint256 indexed  tokenId, address indexed author, string metadataURI);

    constructor() ERC721("BookNFT", "BOOK") Ownable(msg.sender) {}

    //function para magpasok ng bagong book NFT
    function mintBook(address author, string memory metadataURI) external onlyOwner {
        uint256 tokenId = nextTokenId; //based sa state variable
        _safeMint(author, tokenId); //iccheck for NFT receiver
        _setTokenURI(tokenId, metadataURI); //pwedeng iattach yung token URI


        emit BookMinted(tokenId, author, metadataURI); //event para malaman na may bagong book na na mint
        nextTokenId++; //increment token ID para sa next mint
    }
}