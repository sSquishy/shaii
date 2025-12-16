import { useState, useEffect } from "react";
import {
  getListedBooks,
  buyBookFromMarketplace,
} from "../services/marketplace";

// Runtime loader for SweetAlert2 via CDN to avoid Vite import resolution errors
async function loadSweetAlert() {
  if (typeof window.Swal !== "undefined") return window.Swal;
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.async = true;
      script.onload = () => resolve(window.Swal);
      script.onerror = () => reject(new Error("Failed to load SweetAlert2"));
      document.head.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });
}

export default function Purchase() {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletAccount, setWalletAccount] = useState(null);
  const [buyingTokenId, setBuyingTokenId] = useState(null);

  // Load listed books from blockchain marketplace
  const loadListedBooks = async () => {
    setLoading(true);
    try {
      const listedBooks = await getListedBooks();
      setBooks(listedBooks);
      console.log("Loaded books from blockchain:", listedBooks);
    } catch (error) {
      console.error("Failed to load books:", error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadListedBooks();
  }, []);

  // Filter books by search term
  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    loadListedBooks();
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

  // Handle buying a book from blockchain marketplace
  async function handleBuy(book) {
    const isConnected = localStorage.getItem("isWalletConnected") === "true";
    const storedAccount = localStorage.getItem("walletAccount");

    if (!isConnected || !storedAccount) {
      if (window.showToast) window.showToast('warning', 'Please connect your wallet first.', 'Wallet');
      else alert("Please connect your wallet first.");
      return;
    }

    // Load SweetAlert2 from CDN at runtime; fall back to native confirm if unavailable
    try {
      const Swal = await loadSweetAlert();
      if (Swal) {
        const res = await Swal.fire({
          title: "Confirm Purchase",
          html: `Are you sure you want to buy <strong>${book.title}</strong> for ${book.priceETH}?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, purchase",
          cancelButtonText: "Cancel",
        });
        if (!res.isConfirmed) return;
      } else {
        const confirmed = window.confirm(`Are you sure you want to buy "${book.title}" for ${book.priceETH}?`);
        if (!confirmed) return;
      }
    } catch (e) {
      const confirmed = window.confirm(`Are you sure you want to buy "${book.title}" for ${book.priceETH}?`);
      if (!confirmed) return;
    }

    setBuyingTokenId(book.tokenId);

    try {
      await buyBookFromMarketplace(book.tokenId, book.priceWei);
      if (window.showToast) window.showToast('success', `Successfully purchased "${book.title}"!`, 'Purchase Complete');
      else alert(`Successfully purchased "${book.title}"!`);

      // Reload the books list
      await loadListedBooks();
    } catch (error) {
      console.error("Purchase error:", error);
      if (window.handleErrorToast) {
        window.handleErrorToast(error);
      } else if (window.showToast) {
        const msg = error?.message || 'Failed to purchase book';
        window.showToast('error', `Failed to purchase book: ${msg}`, 'Purchase Failed');
      } else {
        const errorMsg = error.message || "Failed to purchase book";
        alert(`Failed to purchase book: ${errorMsg}`);
      }
    } finally {
      setBuyingTokenId(null);
    }
  }

  return (
    <div className="w-full bg-gray-100 h-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold">Purchase Books</h1>
        <p className="text-gray-600 mt-1">
          Browse available books on the blockchain marketplace
        </p>
      </div>

      {/* Container wrapper for fixed width */}
      <div className="mx-auto min-w-[300px] max-w-[1300px]">
        {/* Search & Refresh aligned right */}
        <div className="flex justify-end mb-4 gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search books..."
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
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center ${
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

        {/* Books Cards Container */}
        <div className="border border-gray-300 p-4 gap-10 min-h-[400px] flex flex-wrap justify-start items-start">
          {loading ? (
            <div className="w-full flex flex-col items-center justify-center py-20">
              <svg
                className="animate-spin h-12 w-12 text-blue-600 mb-4"
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
              <h5 className="mb-1 text-lg font-semibold">
                Loading marketplace...
              </h5>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-20">
              <svg
                width="110"
                height="110"
                className="mb-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="7.5"
                  stroke="#ffc107"
                  strokeWidth="3"
                />
                <line
                  x1="15.5"
                  y1="15.5"
                  x2="21"
                  y2="21"
                  stroke="#6c757d"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <h5 className="mb-1 text-lg font-semibold">
                No books listed yet
              </h5>
              <p className="text-gray-500 mb-0">
                {searchTerm
                  ? "No books match your search."
                  : "Be the first to list a book for sale!"}
              </p>
            </div>
          ) : (
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
                  {/* Token ID intentionally hidden in marketplace view; visible in MyLibrary only */}

                  <h3 className="text-lg font-bold mb-1 truncate">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 truncate">
                    {book.author}
                  </p>

                  <p className="text-sm text-gray-600 mb-1 font-bold truncate">
                    Genre: {book.genre}
                  </p>
                  <p className="text-sm text-gray-600 mb-2 font-bold truncate">
                    ISBN: {book.isbn}
                  </p>

                  {/* Seller info */}
                  <p className="text-xs text-gray-500 mb-3 truncate">
                    Seller: {book.seller.slice(0, 6)}...{book.seller.slice(-4)}
                  </p>

                  <p className="text-orange-500 font-semibold mb-3 text-lg">
                    {book.priceETH}
                  </p>

                  <button
                    onClick={() => handleBuy(book)}
                    disabled={!walletAccount || buyingTokenId === book.tokenId}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition ${
                      !walletAccount
                        ? "bg-gray-400 cursor-not-allowed"
                        : buyingTokenId === book.tokenId
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {buyingTokenId === book.tokenId ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
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
                        Purchasing...
                      </>
                    ) : !walletAccount ? (
                      "Connect Wallet First"
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 8.25h19.5m-19.5 0A2.25 2.25 0 014.5 6h15a2.25 2.25 0 012.25 2.25m-19.5 0v7.5A2.25 2.25 0 004.5 18h15a2.25 2.25 0 002.25-2.25v-7.5m-9 6h.008v.008H12v-.008z"
                          />
                        </svg>
                        Buy Book
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
