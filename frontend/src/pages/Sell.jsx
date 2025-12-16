import { useState, useEffect } from "react";
import { getBookByTokenId } from "../services/bookNFT";
import { listBookOnMarketplace } from "../services/marketplace";

export default function Sell() {
  const [tokenId, setTokenId] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [previewBook, setPreviewBook] = useState(null);
  const [listMessage, setListMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [walletAccount, setWalletAccount] = useState(null);

  // Handle searching for book by Token ID
  const handleSearchBook = async (e) => {
    e.preventDefault();

    setListMessage("");
    setErrorMessage("");
    setPreviewBook(null);

    const isConnected = localStorage.getItem("isWalletConnected") === "true";
    const storedAccount = localStorage.getItem("walletAccount");

    if (!isConnected || !storedAccount) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    if (!tokenId.trim()) {
      setErrorMessage("Please enter a Token ID");
      return;
    }

    setIsSearching(true);

    try {
      const bookData = await getBookByTokenId(tokenId.trim(), storedAccount);

      if (bookData && bookData.error) {
        setErrorMessage(bookData.error);
        setPreviewBook(null);
      } else if (bookData) {
        setPreviewBook(bookData);
        // Use the price from metadata or let user set a new price
        setListingPrice(bookData.priceETH.replace(" ETH", ""));
      } else {
        setErrorMessage("Book not found or failed to load");
      }
    } catch (error) {
      console.error("Search error:", error);
      const msg = "Failed to search for book. Please try again.";
      setErrorMessage(msg);
      if (window.handleErrorToast) window.handleErrorToast(error, msg);
      else if (window.showToast) window.showToast('error', msg, 'Search Failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Sync wallet connection state
  useEffect(() => {
    const checkWalletConnection = () => {
      const account = localStorage.getItem("walletAccount");
      const isConnected = localStorage.getItem("isWalletConnected") === "true";

      if (isConnected && account) {
        setWalletAccount(account);
      } else {
        setWalletAccount(null);
      }
    };

    checkWalletConnection();

    const handleStorageChange = (e) => {
      if (e.key === "walletAccount" || e.key === "isWalletConnected") {
        checkWalletConnection();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(checkWalletConnection, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Handle listing the book on the blockchain marketplace
  const listBookOnBlockchain = async () => {
    if (!previewBook) return;

    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      setErrorMessage("Please enter a valid price greater than 0");
      return;
    }

    setIsListing(true);
    setListMessage("");
    setErrorMessage("");

    try {
      setListMessage("Listing book on marketplace...");
      const result = await listBookOnMarketplace(
        previewBook.tokenId,
        listingPrice
      );

      setListMessage("✅ Book successfully listed on marketplace!");
      if (window.showToast) window.showToast('success', 'Book successfully listed on marketplace!', 'Listed');

      // Clear form after success
      setTimeout(() => {
        setPreviewBook(null);
        setTokenId("");
        setListingPrice("");
        setListMessage("");
      }, 3000);
    } catch (error) {
      console.error("Listing error:", error);
      const errorMsg = error?.message || "Failed to list book. Please try again.";
      // Use centralized error toast when available
      if (window.handleErrorToast) window.handleErrorToast(error, errorMsg);
      else if (window.showToast) window.showToast('error', `Failed to list book: ${errorMsg}`, 'Listing Failed');
      setErrorMessage(errorMsg.includes('user rejected') || errorMsg.includes('User denied') ? 'Transaction rejected by user' : errorMsg);
    } finally {
      setIsListing(false);
    }
  };

  const removePreview = () => {
    setPreviewBook(null);
    setListMessage("");
    setErrorMessage("");
    setTokenId("");
    setListingPrice("");
  };

  return (
    <div className="w-full bg-gray-100 h-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold">Sell Books</h1>
        <p className="text-gray-600 mt-1">
          List your book NFTs for sale on the blockchain marketplace
        </p>
      </div>

      {/* Main Flex Container */}
      <div className="flex flex-wrap justify-center gap-6 items-start">
        {/* Sell Form */}
        <div className="p-6 w-full max-w-md bg-white rounded-xl shadow-md flex-none">
          <h1 className="text-2xl font-bold mb-2">Sell Your Book</h1>
          <p className="text-gray-600 mb-6">
            Enter your book's token ID to search and list it
          </p>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {listMessage && !previewBook && (
            <div className="mb-4 p-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md">
              {listMessage}
            </div>
          )}

          <form onSubmit={handleSearchBook} className="space-y-4">
            <div>
              <label
                htmlFor="tokenId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Token ID
              </label>
              <input
                type="text"
                id="tokenId"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="Enter your book's token ID (e.g., 0, 1, 2)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSearching || previewBook}
              />
            </div>

            {!previewBook && (
              <button
                type="submit"
                disabled={isSearching || !walletAccount}
                className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                  isSearching || !walletAccount
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } transition-colors`}
              >
                {isSearching
                  ? "Searching..."
                  : !walletAccount
                  ? "Connect Wallet First"
                  : "Search Book"}
              </button>
            )}
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <h2 className="font-medium text-gray-800 mb-2">
              How to find your Token ID:
            </h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Go to "My Library" to see your owned books</li>
              <li>• Each book card shows its Token ID</li>
              <li>• Copy the Token ID and paste it here</li>
              <li>• Set your desired selling price</li>
            </ul>
          </div>
        </div>

        {/* Preview Book Panel */}
        {previewBook && (
          <div className="p-6 w-full max-w-md bg-white rounded-xl shadow-md flex-none">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">List Book</h2>
              <button
                onClick={removePreview}
                className="text-red-500 hover:text-red-700"
                disabled={isListing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <img
              src={previewBook.image}
              alt={previewBook.title}
              className="w-full h-72 object-cover rounded-md mb-4"
            />

            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">
                Token ID: {previewBook.tokenId}
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-1 truncate">
              {previewBook.title}
            </h3>
            <p className="text-sm text-gray-600 mb-1 truncate">
              {previewBook.author}
            </p>
            <p className="text-sm text-gray-600 mb-1 font-bold truncate">
              Genre: {previewBook.genre}
            </p>
            <p className="text-sm text-gray-600 mb-4 font-bold truncate">
              ISBN: {previewBook.isbn}
            </p>

            {/* Price Input */}
            <div className="mb-4">
              <label
                htmlFor="listingPrice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Listing Price (ETH)
              </label>
              <input
                type="number"
                id="listingPrice"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                step="0.001"
                min="0"
                placeholder="0.05"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isListing}
              />
            </div>

            {listMessage && (
              <div className="mb-3 p-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md">
                {listMessage}
              </div>
            )}

            {/* List Book button */}
            <button
              disabled={isListing || !listingPrice}
              onClick={listBookOnBlockchain}
              className={`w-full py-3 px-4 rounded-md font-medium text-white flex items-center justify-center ${
                isListing || !listingPrice
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } transition-colors`}
            >
              {isListing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Listing...
                </>
              ) : (
                "List Book for Sale"
              )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Note: You'll need to approve 2 transactions - one to approve the
              marketplace, and one to list your book.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
