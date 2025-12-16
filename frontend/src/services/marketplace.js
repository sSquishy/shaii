// Add this ENTIRE updated marketplace.js with debugging

import { ethers } from "ethers";
import BookNFT from "../utilities/BookNFT.json";
import BookMarketplace from "../utilities/BookMarketplace.json";

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_BOOKNFT_CONTRACT;
const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT;

console.log("🔍 Configuration on load:");
console.log("NFT Contract:", NFT_CONTRACT_ADDRESS);
console.log("Marketplace Contract:", MARKETPLACE_CONTRACT_ADDRESS);

// Convert IPFS URL to HTTP gateway
function convertIPFSToHttp(ipfsUrl) {
  if (!ipfsUrl) return "";

  let cleanUrl = ipfsUrl;
  if (ipfsUrl.startsWith("ipfs://ipfs://")) {
    cleanUrl = ipfsUrl.replace("ipfs://ipfs://", "ipfs://");
  }

  if (cleanUrl.startsWith("ipfs://")) {
    const hash = cleanUrl.replace("ipfs://", "");
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  return ipfsUrl;
}

// 🔍 DEBUG FUNCTION - Verify marketplace configuration
export async function verifyMarketplaceConfig() {
  if (!window.ethereum) return;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const currentWallet = await signer.getAddress();

    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      provider
    );

    const marketplaceNFTAddress = await marketplaceContract.nft();

    console.log("\n📊 MARKETPLACE CONFIGURATION CHECK:");
    console.log("Current Wallet:", currentWallet);
    console.log("Expected NFT Contract:", NFT_CONTRACT_ADDRESS);
    console.log("Marketplace's NFT Contract:", marketplaceNFTAddress);
    console.log(
      "✅ Addresses Match?",
      marketplaceNFTAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
    );

    if (
      marketplaceNFTAddress.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()
    ) {
      console.error(
        "❌ CRITICAL ERROR: Marketplace is pointing to wrong NFT contract!"
      );
      console.error("Expected:", NFT_CONTRACT_ADDRESS);
      console.error("Got:", marketplaceNFTAddress);
      console.error("🔧 FIX: Redeploy marketplace with correct NFT address!");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Config check failed:", error);
    return false;
  }
}

// List a book on the marketplace
export async function listBookOnMarketplace(tokenId, priceInETH) {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error(
      "Marketplace contract not deployed. Please deploy it first."
    );
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const currentWallet = await signer.getAddress();

    // 🔍 DEBUGGING - Check ownership before listing
    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      BookNFT.abi,
      provider
    );

    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      provider
    );

    console.log("\n🔍 PRE-LISTING CHECKS:");
    console.log("Token ID:", tokenId);
    console.log("Your Wallet:", currentWallet);

    // Check who owns the token
    const actualOwner = await nftContract.ownerOf(tokenId);
    console.log("Token Owner:", actualOwner);
    console.log(
      "You own it?",
      actualOwner.toLowerCase() === currentWallet.toLowerCase()
    );

    // Check what NFT contract the marketplace is using
    const marketplaceNFTAddress = await marketplaceContract.nft();
    console.log("Marketplace NFT Address:", marketplaceNFTAddress);
    console.log(
      "Correct NFT Address?",
      marketplaceNFTAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
    );

    if (actualOwner.toLowerCase() !== currentWallet.toLowerCase()) {
      throw new Error(`You don't own this token! Owner is: ${actualOwner}`);
    }

    if (
      marketplaceNFTAddress.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        `Marketplace is using wrong NFT contract! Expected: ${NFT_CONTRACT_ADDRESS}, Got: ${marketplaceNFTAddress}. REDEPLOY MARKETPLACE!`
      );
    }

    // Step 1: Approve marketplace
    const nftWithSigner = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      BookNFT.abi,
      signer
    );

    console.log("🔐 Step 1/2: Approving marketplace for token", tokenId);
    const approveTx = await nftWithSigner.approve(
      MARKETPLACE_CONTRACT_ADDRESS,
      tokenId
    );
    console.log("⛓️ Approve tx sent:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Marketplace approved");

    // Step 2: List on marketplace
    const marketplaceWithSigner = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      signer
    );

    const priceInWei = ethers.parseEther(priceInETH.toString());
    console.log("📝 Step 2/2: Listing book on marketplace");
    console.log("Token ID:", tokenId);
    console.log("Price:", priceInETH, "ETH");

    const listTx = await marketplaceWithSigner.listItem(tokenId, priceInWei);
    console.log("⛓️ List tx sent:", listTx.hash);
    const receipt = await listTx.wait();
    console.log("✅ Book listed successfully!");

    return { txHash: receipt.hash };
  } catch (error) {
    console.error("❌ Listing failed:", error);
    throw error;
  }
}

// Get all listed books from the marketplace
export async function getListedBooks() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    console.warn("Marketplace contract not deployed");
    return [];
  }

  try {
    console.log("🔍 Fetching listed books from marketplace...");

    const provider = new ethers.BrowserProvider(window.ethereum);

    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      provider
    );

    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      BookNFT.abi,
      provider
    );

    // Get the next token ID to know how many tokens exist
    const nextTokenId = await nftContract.nextTokenId();
    console.log("📊 Total tokens minted:", Number(nextTokenId));

    const books = [];

    // Check each token to see if it's listed
    for (let tokenId = 0; tokenId < Number(nextTokenId); tokenId++) {
      try {
        // Get listing info from marketplace
        const listing = await marketplaceContract.listings(tokenId);
        const [seller, price, active] = listing;

        // Skip if not active
        if (!active) continue;

        console.log(`\n📖 Found listing for token ${tokenId}`);
        console.log("Seller:", seller);
        console.log("Price:", ethers.formatEther(price), "ETH");

        // Get token metadata
        const uri = await nftContract.tokenURI(tokenId);
        const metadataUrl = convertIPFSToHttp(uri);

        const response = await fetch(metadataUrl);
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}`);
          continue;
        }

        const metadata = await response.json();

        const book = {
          tokenId: Number(tokenId),
          seller: seller,
          title: metadata.title,
          author: metadata.author,
          genre: metadata.genre,
          isbn: metadata.isbn,
          image: convertIPFSToHttp(metadata.image),
          pdfLink: convertIPFSToHttp(metadata.pdf),
          priceETH: ethers.formatEther(price) + " ETH",
          priceWei: price.toString(),
          contractAddress: NFT_CONTRACT_ADDRESS,
          active: active,
        };

        books.push(book);
        console.log("✅ Book added:", book.title);
      } catch (error) {
        // Token might not exist or has issues, skip it
        continue;
      }
    }

    console.log("🎉 Total listed books found:", books.length);
    return books;
  } catch (error) {
    console.error("❌ Failed to fetch listed books:", error);
    return [];
  }
}

// Buy a book from the marketplace
export async function buyBookFromMarketplace(tokenId, priceInWei) {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error("Marketplace contract not deployed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      signer
    );

    console.log("💸 Buying book...");
    console.log("Token ID:", tokenId);
    console.log("Price:", ethers.formatEther(priceInWei), "ETH");

    const tx = await marketplaceContract.buyItem(tokenId, {
      value: priceInWei,
    });

    console.log("⛓️ Purchase tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Purchase successful!");

    return { txHash: receipt.hash };
  } catch (error) {
    console.error("❌ Purchase failed:", error);
    throw error;
  }
}

// Cancel a listing
export async function cancelListing(tokenId) {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error("Marketplace contract not deployed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_CONTRACT_ADDRESS,
      BookMarketplace.abi,
      signer
    );

    console.log("❌ Cancelling listing:", tokenId);

    const tx = await marketplaceContract.cancelListing(tokenId);
    const receipt = await tx.wait();

    console.log("✅ Listing cancelled!");
    return { txHash: receipt.hash };
  } catch (error) {
    console.error("❌ Cancellation failed:", error);
    throw error;
  }
}
