import { ethers } from "ethers";
import BookNFT from "../utilities/BookNFT.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_BOOKNFT_CONTRACT;
const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT || null;

// Minimal ABI for the marketplace contract (list/buy)
const marketplaceAbi = [
  "function listItem(uint256 tokenId, uint256 price) external",
  "function buyItem(uint256 tokenId) external payable",
  "function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
  "function cancelListing(uint256 tokenId) external",
];

export async function getOwnedBooks(walletAddress) {
  if (!window.ethereum) {
    if (window.showToast) window.showToast('warning', 'Please install MetaMask', 'Missing Wallet');
    else alert("Please install MetaMask");
    return [];
  }

  try {
    console.log("🔍 Starting getOwnedBooks...");
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    console.log("👛 Wallet Address:", walletAddress);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BookNFT.abi,
      provider
    );

    // Check network
    const network = await provider.getNetwork();
    console.log(
      "🌐 Network:",
      network.name,
      "Chain ID:",
      Number(network.chainId)
    );

    // 1️⃣ Get token IDs owned by wallet
    console.log("🔍 Calling getBooksByOwner...");
    const tokenIds = await contract.getBooksByOwner(walletAddress);
    console.log("📚 Token IDs found:", tokenIds);
    console.log("📊 Number of tokens:", tokenIds.length);

    // 2️⃣ Fetch metadata for each token
    const books = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      console.log(
        `\n📖 Processing token ${i + 1}/${tokenIds.length}, ID: ${tokenId}`
      );

      try {
        const uri = await contract.tokenURI(tokenId);
        console.log("🔗 Token URI:", uri);

        const metadataUrl = convertIPFSToHttp(uri);
        console.log("🌐 HTTP URL:", metadataUrl);

        const response = await fetch(metadataUrl);
        console.log("📡 Fetch response status:", response.status);

        if (!response.ok) {
          console.warn(`⚠️ Skipping token ${tokenId}: HTTP ${response.status}`);
          continue;
        }

        const metadata = await response.json();
        console.log("📄 Metadata:", metadata);

        const book = {
          tokenId: Number(tokenId),
          title: metadata.title,
          author: metadata.author,
          genre: metadata.genre,
          isbn: metadata.isbn,
          image: convertIPFSToHttp(metadata.image),
          pdfLink: convertIPFSToHttp(metadata.pdf),
          contractAddress: CONTRACT_ADDRESS,
          walletAddress,
          priceETH: metadata.price || "N/A",
        };

        console.log("✅ Book object created:", book);
        books.push(book);
      } catch (tokenError) {
        console.error(`❌ Error processing token ${tokenId}:`, tokenError);
        console.warn(`⚠️ Skipping token ${tokenId} due to error`);
        continue;
      }
    }

    console.log("🎉 Final books array:", books);
    return books;
  } catch (error) {
    console.error("❌ Failed to fetch owned books:", error);
    return [];
  }
}

// NEW FUNCTION: Get a specific book by Token ID
export async function getBookByTokenId(tokenId, walletAddress) {
  if (!window.ethereum) {
    if (window.showToast) window.showToast('warning', 'Please install MetaMask', 'Missing Wallet');
    else alert("Please install MetaMask");
    return null;
  }

  try {
    console.log(`🔍 Searching for token ID: ${tokenId}`);
    console.log("👛 Wallet Address:", walletAddress);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BookNFT.abi,
      provider
    );

    // Check if token exists and get owner
    let owner;
    try {
      owner = await contract.ownerOf(tokenId);
      console.log("👤 Token owner:", owner);
    } catch (error) {
      console.error("❌ Token does not exist:", error);
      return { error: "Token ID does not exist" };
    }

    // Check if the wallet owns this token
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      console.warn("⚠️ Token not owned by wallet");
      return { error: "You don't own this token" };
    }

    // Fetch token metadata
    const uri = await contract.tokenURI(tokenId);
    console.log("🔗 Token URI:", uri);

    const metadataUrl = convertIPFSToHttp(uri);
    console.log("🌐 HTTP URL:", metadataUrl);

    const response = await fetch(metadataUrl);
    if (!response.ok) {
      console.error(`❌ Failed to fetch metadata: HTTP ${response.status}`);
      return { error: "Failed to fetch book metadata" };
    }

    const metadata = await response.json();
    console.log("📄 Metadata:", metadata);

    const book = {
      tokenId: Number(tokenId),
      title: metadata.title,
      author: metadata.author,
      genre: metadata.genre,
      isbn: metadata.isbn,
      image: convertIPFSToHttp(metadata.image),
      pdfLink: convertIPFSToHttp(metadata.pdf),
      contractAddress: CONTRACT_ADDRESS,
      walletAddress,
      priceETH: metadata.price || "N/A",
    };

    console.log("✅ Book found:", book);
    return book;
  } catch (error) {
    console.error("❌ Error fetching book by token ID:", error);
    return { error: "Failed to fetch book data" };
  }
}

// Create an on-chain transaction to "list" a book by approving the contract
export async function listBook(tokenId, priceStrArg) {
  if (!window.ethereum) {
    if (window.showToast) window.showToast('warning', 'Please install MetaMask', 'Missing Wallet');
    else alert("Please install MetaMask");
    return { error: "No wallet" };
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const nftWithSigner = new ethers.Contract(CONTRACT_ADDRESS, BookNFT.abi, signer);

    // If a marketplace address is configured, approve and call marketplace.listItem
    if (MARKETPLACE_ADDRESS) {
      try {
        console.log("📦 Listing via marketplace:", MARKETPLACE_ADDRESS);

        // Determine price: prefer explicit arg, otherwise read from metadata
        let priceStr = priceStrArg || null;
        if (!priceStr) {
          try {
            const uri = await nftWithSigner.tokenURI(tokenId);
            const metadataUrl = convertIPFSToHttp(uri);
            const resp = await fetch(metadataUrl);
            if (resp.ok) {
              const metadata = await resp.json();
              priceStr = metadata.price || null;
            }
          } catch (err) {
            console.warn("Could not read metadata price:", err);
          }
        }

        if (!priceStr) {
          return { error: "Listing requires a price. Provide price in metadata or pass price when listing." };
        }

        const cleaned = String(priceStr).replace(/[^0-9.]/g, "");
        if (!cleaned) return { error: "Invalid price format in metadata" };
        const priceWei = ethers.parseEther(cleaned);

        // Check approval
        const currentApproved = await nftWithSigner.getApproved(tokenId);
        if (currentApproved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
          console.log("🔐 Approving marketplace for token", tokenId);
          const approveTx = await nftWithSigner.approve(MARKETPLACE_ADDRESS, tokenId);
          console.log("⛓️ Approve tx sent:", approveTx.hash);
          await approveTx.wait();
        }

        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceAbi, signer);
        const tx = await marketplace.listItem(tokenId, priceWei);
        console.log("⛓️ listItem tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ listItem confirmed:", receipt.transactionHash);
        return { txHash: receipt.transactionHash };
      } catch (err) {
        console.error("❌ Marketplace listing failed:", err);
        return { error: err?.message || "Marketplace listing failed" };
      }
    }

    // Fallback: approve the NFT contract itself (legacy behavior)
    const tx = await nftWithSigner.approve(CONTRACT_ADDRESS, tokenId);
    console.log("⛓️ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  } catch (error) {
    console.error("❌ Failed to send listing transaction:", error);
    return { error: error.message || "Transaction failed" };
  }
}

// Purchase a listed book by sending ETH to the marketplace (or seller if marketplace not set)
export async function purchaseListedBook(tokenId, sellerAddress, priceStr) {
  if (!window.ethereum) {
    if (window.showToast) window.showToast('warning', 'Please install MetaMask', 'Missing Wallet');
    else alert("Please install MetaMask");
    return { error: "No wallet" };
  }

  try {
    // Parse price (accept formats like "0.05" or "0.05 ETH")
    const cleaned = String(priceStr || "").replace(/[^0-9.]/g, "");
    if (!cleaned) return { error: "Invalid price for this listing" };

    const value = ethers.parseEther(cleaned);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // If a marketplace is configured, call its buyItem payable method so the NFT is transferred atomically
    if (MARKETPLACE_ADDRESS) {
      try {
        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceAbi, signer);
        console.log(`💸 Calling marketplace.buyItem(${tokenId}) value=${cleaned} ETH`);
        const tx = await marketplace.buyItem(tokenId, { value });
        console.log("⛓️ buyItem tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ buyItem confirmed:", receipt.transactionHash);
        return { txHash: receipt.transactionHash };
      } catch (err) {
        console.error("❌ Marketplace purchase failed:", err);
        return { error: err?.message || "Marketplace purchase failed" };
      }
    }

    // Fallback: send ETH directly to seller (does NOT transfer NFT)
    const tx = await signer.sendTransaction({ to: sellerAddress, value, data: "0x" });
    console.log("⛓️ Purchase tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Purchase confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  } catch (error) {
    console.error("❌ Purchase transaction failed:", error);
    return { error: error?.message || "Transaction failed" };
  }
}

// Convert ipfs:// link to HTTP gateway
function convertIPFSToHttp(ipfsUrl) {
  if (!ipfsUrl) return "";

  // Handle double ipfs:// prefix (from old buggy tokens)
  let cleanUrl = ipfsUrl;
  if (ipfsUrl.startsWith("ipfs://ipfs://")) {
    cleanUrl = ipfsUrl.replace("ipfs://ipfs://", "ipfs://");
    console.warn("⚠️ Fixed double ipfs:// prefix");
  }

  if (cleanUrl.startsWith("ipfs://")) {
    const hash = cleanUrl.replace("ipfs://", "");
    const httpUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
    console.log(`🔄 Converting IPFS: ${cleanUrl} → ${httpUrl}`);
    return httpUrl;
  }

  return ipfsUrl;
}
