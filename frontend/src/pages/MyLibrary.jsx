import { useState, useEffect } from "react";
import { getOwnedBooks } from "../services/bookNFT";

export default function MyLibrary() {
  const [walletAddress, setWalletAddress] = useState("");
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync wallet state from localStorage (same as Nav)
  useEffect(() => {
    const updateWalletState = () => {
      const account = localStorage.getItem("walletAccount");
      const isConnected = localStorage.getItem("isWalletConnected") === "true";

      if (isConnected && account) {
        setWalletAddress(account);
      } else {
        setWalletAddress("");
      }
    };

    updateWalletState();

    // Listen for storage changes (when Nav connects/disconnects)
    window.addEventListener("storage", updateWalletState);

    // Listen for listings updates (when a purchase completes) and reload books
    const onListingsUpdated = () => {
      if (localStorage.getItem("walletAccount")) {
        loadBooks();
      }
    };
    window.addEventListener("listingsUpdated", onListingsUpdated);

    // Poll for changes every second
    const interval = setInterval(updateWalletState, 1000);

    return () => {
      window.removeEventListener("storage", updateWalletState);
      clearInterval(interval);
      window.removeEventListener("listingsUpdated", onListingsUpdated);
    };
  }, []);

  // Load owned books from blockchain when wallet is connected
  async function loadBooks() {
    if (!walletAddress) return;
    setLoading(true);

    try {
      const userBooks = await getOwnedBooks(walletAddress);
      setBooks(userBooks || []);
    } catch (err) {
      console.error("Failed to load books:", err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      loadBooks();
    } else {
      setBooks([]);
    }
  }, [walletAddress]);

  // Filter books by search term
  const filteredBooks = (books || []).filter(
    (book) =>
      book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book?.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book?.tokenId?.toString().includes(searchTerm)
  );

  const handleRefresh = () => loadBooks();

  // Copy Token ID to clipboard
  const copyTokenId = (tokenId) => {
    navigator.clipboard.writeText(tokenId.toString());
    if (window.showToast) window.showToast('success', `Token ID ${tokenId} copied to clipboard!`, 'Copied');
    else alert(`Token ID ${tokenId} copied to clipboard!`);
  };

  return (
    <div className="w-full bg-gray-100 h-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold">Library</h1>
        <p className="text-gray-600 mt-1">
          View your owned and purchased books as NFTs.
        </p>
      </div>

      {!walletAddress && (
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500 mt-2">
            Please connect your wallet using the navigation bar to view your
            library.
          </p>
        </div>
      )}

      {walletAddress && (
        <>
          {/* Search & Refresh */}
          <div className="flex justify-end mb-4 gap-2 max-w-[1300px] mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search books or Token ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
                />
              </svg>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              ) : (
                <i className="fa fa-refresh" aria-hidden="true"></i>
              )}
            </button>
          </div>

          {/* Books Cards */}
          <div className="mx-auto border border-gray-300 p-4 gap-10 min-h-[200px] min-w-[300px] max-w-[1300px] flex flex-wrap justify-start">
            {loading ? (
              <div className="w-full text-center py-20">
                <h5 className="mb-1 text-lg font-semibold">Loading books...</h5>
              </div>
            ) : filteredBooks.length > 0 ? (
              filteredBooks.map((book, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg overflow-hidden max-w-[380px] w-full"
                >
                  <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-4">
                    {/* Token ID Badge */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">
                        Token ID: {book.tokenId}
                      </span>
                      <button
                        onClick={() => copyTokenId(book.tokenId)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Copy Token ID"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>

                    <h3 className="text-lg font-bold mb-1 truncate">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 truncate">
                      {book.author}
                    </p>
                    <p className="text-xs text-gray-500 mb-1 truncate" title={book.contractAddress}>
                      Contract: {book.contractAddress}
                    </p>
                    <p className="text-xs text-gray-500 mb-2 truncate" title={book.walletAddress}>
                      Wallet: {book.walletAddress}
                    </p>
                    <p className="text-sm text-gray-600 mb-1 font-bold truncate">
                      Genre: {book.genre}
                    </p>
                    <p className="text-sm text-gray-600 mb-2 font-bold truncate">
                      ISBN: {book.isbn}
                    </p>
                    <p className="text-orange-500 font-semibold mb-2">
                      {book.priceETH}
                    </p>
                    <a
                      href={book.pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition w-full block text-center"
                    >
                      Read Book
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-20">
                <h5 className="mb-1 text-lg font-semibold">
                  No books available
                </h5>
                <p className="text-gray-500 mb-0">
                  {searchTerm
                    ? "No books match your search."
                    : "You don't own any book NFTs yet. Upload one to get started!"}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
