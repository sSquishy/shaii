import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import contractData from "../utilities/BookNFT.json";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../services/pinata.js";

const contractAddress = import.meta.env.VITE_BOOKNFT_CONTRACT;
const contractABI = contractData.abi;

export default function Upload() {
  // Wallet state (synced from localStorage)
  const [walletAccount, setWalletAccount] = useState(null);

  // Form state
  const [form, setForm] = useState({
    book_title: "",
    author: "",
    author_wallet_address: "",
    isbn: "",
    genre: "",
    price: "",
  });

  // File states: cover image and PDF — UI shows textfield that opens file picker
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const coverInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync wallet state automatically
  useEffect(() => {
    const checkWalletConnection = () => {
      const account = localStorage.getItem("walletAccount");
      const connected = localStorage.getItem("isWalletConnected") === "true";

      if (connected && account) {
        setWalletAccount(account);
        setForm((prev) => ({
          ...prev,
          author_wallet_address: account,
        }));
      } else {
        setWalletAccount(null);
        setForm((prev) => ({ ...prev, author_wallet_address: "" }));
      }
    };

    checkWalletConnection();
    const interval = setInterval(checkWalletConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Build preview URLs when files change
  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setCoverPreviewUrl(null);
  }, [coverFile]);

  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPdfPreviewUrl(null);
    return () => {};
  }, [pdfFile]);

  // -----------------------------
  // HANDLE SUBMIT
  // -----------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const newErrors = {};
    if (!form.book_title || !form.book_title.trim())
      newErrors.book_title = "Title is required";
    if (!form.author || !form.author.trim())
      newErrors.author = "Author is required";
    if (!form.isbn || !form.isbn.trim()) newErrors.isbn = "ISBN is required";
    if (!form.genre || !form.genre.trim())
      newErrors.genre = "Genre is required";
    if (!form.price || !form.price.trim())
      newErrors.price = "Price is required";
    if (!coverFile) newErrors.cover = "Cover image file is required";
    if (!pdfFile) newErrors.pdf = "PDF file is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    setErrors({});

    try {
      // Upload files to IPFS if files provided; otherwise use provided text URL (keep as-is)
      // Upload cover and pdf files to IPFS
      let coverURI;
      if (coverFile) {
        const coverCID = await uploadFileToIPFS(coverFile);
        coverURI = `ipfs://${coverCID}`;
      }

      let pdfURI;
      if (pdfFile) {
        const pdfCID = await uploadFileToIPFS(pdfFile);
        pdfURI = `ipfs://${pdfCID}`;
      }

      // Build metadata JSON
      const metadata = {
        title: form.book_title,
        author: form.author,
        genre: form.genre,
        isbn: form.isbn,
        price: form.price,
        author_wallet_address: form.author_wallet_address,
        image: coverURI,
        pdf: pdfURI,
      };

      // Upload metadata.json to IPFS
      const metadataCID = await uploadJSONToIPFS(metadata);
      const metadataURI = `ipfs://${metadataCID}`;

      console.log("Metadata URI:", metadataURI);

      // Connect to Ethereum wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      // Mint NFT
      const tx = await contract.mintBook(walletAccount, metadataURI);
      await tx.wait();

      if (window.showToast) window.showToast('success', 'Book NFT minted successfully!', 'Mint Complete');
      else
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { type: "success", message: "Book NFT minted successfully!" },
          })
        );
      // Reset form and previews after successful mint
      setForm({
        book_title: "",
        author: "",
        author_wallet_address: walletAccount || "",
        isbn: "",
        genre: "",
        price: "",
      });
      setCoverFile(null);
      setPdfFile(null);
      setCoverPreviewUrl(null);
      setPdfPreviewUrl(null);
      setErrors({});
    } catch (err) {
      console.error("Minting Error:", err);
      if (window.handleErrorToast) window.handleErrorToast(err);
      else if (window.showToast) window.showToast('error', 'Transaction failed.', 'Error');
      else
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { type: "error", message: "Transaction failed." },
          })
        );
    }

    setLoading(false);
  }

  return (
    <div className="w-full bg-gray-100 h-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold">Upload Books</h1>
        <p className="text-gray-600 mt-1">
          Upload your book files & metadata, then mint a Book NFT
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: fields */}
          <div>
            <h2 className="text-xl font-bold mb-2">Upload a New Book</h2>

            <label className="text-sm font-medium">Book Title *</label>
            <input
              placeholder="Book Title"
              className={`w-full border px-3 py-2 rounded mb-2 ${
                errors.book_title ? "border-red-500" : ""
              }`}
              value={form.book_title}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, book_title: v });
                if (errors.book_title && v && v.trim()) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.book_title;
                    return c;
                  });
                }
              }}
            />
            {errors.book_title && (
              <div className="text-red-600 text-sm mb-2">
                {errors.book_title}
              </div>
            )}

            <label className="text-sm font-medium">Author Name *</label>
            <input
              placeholder="Author Name"
              className={`w-full border px-3 py-2 rounded mb-2 ${
                errors.author ? "border-red-500" : ""
              }`}
              value={form.author}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, author: v });
                if (errors.author && v && v.trim()) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.author;
                    return c;
                  });
                }
              }}
            />
            {errors.author && (
              <div className="text-red-600 text-sm mb-2">{errors.author}</div>
            )}

            <label className="text-sm font-medium">Author Wallet Address</label>
            <input
              className={`w-full border px-3 py-2 rounded mb-2 ${
                walletAccount
                  ? "bg-green-50 border-green-300"
                  : "bg-gray-100 border-gray-300"
              }`}
              value={form.author_wallet_address}
              readOnly
              placeholder={
                walletAccount
                  ? "Wallet address auto-filled"
                  : "Connect wallet first"
              }
            />

            <label className="text-sm font-medium">ISBN *</label>
            <input
              placeholder="ISBN"
              className={`w-full border px-3 py-2 rounded mb-2 ${
                errors.isbn ? "border-red-500" : ""
              }`}
              value={form.isbn}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, isbn: v });
                if (errors.isbn && v && v.trim()) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.isbn;
                    return c;
                  });
                }
              }}
            />
            {errors.isbn && (
              <div className="text-red-600 text-sm mb-2">{errors.isbn}</div>
            )}

            <label className="text-sm font-medium">Genre *</label>
            <input
              placeholder="Genre"
              className={`w-full border px-3 py-2 rounded mb-2 ${
                errors.genre ? "border-red-500" : ""
              }`}
              value={form.genre}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, genre: v });
                if (errors.genre && v && v.trim()) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.genre;
                    return c;
                  });
                }
              }}
            />
            {errors.genre && (
              <div className="text-red-600 text-sm mb-2">{errors.genre}</div>
            )}

            <label className="text-sm font-medium">Price (ETH) *</label>
            <input
              placeholder="Price (ETH)"
              inputMode="decimal"
              className={`w-full border px-3 py-2 rounded mb-2 ${
                errors.price ? "border-red-500" : ""
              }`}
              value={form.price}
              onChange={(e) => {
                // Allow numbers and a single decimal point, format with commas for thousands
                let raw = e.target.value;
                // remove any characters except digits and dot
                raw = raw.replace(/[^0-9.]/g, "");
                // keep only first dot
                const parts = raw.split(".");
                if (parts.length > 1) {
                  raw = parts[0] + "." + parts.slice(1).join("");
                }

                // format integer part with commas
                const [intPart, decPart] = raw.split(".");
                const intFormatted = intPart
                  ? Number(intPart).toLocaleString("en-US")
                  : "";
                const formatted = decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;

                setForm((prev) => ({ ...prev, price: formatted }));
                if (errors.price && raw && raw.trim()) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.price;
                    return c;
                  });
                }
              }}
            />
            {errors.price && (
              <div className="text-red-600 text-sm mb-2">{errors.price}</div>
            )}

            {/* Cover: text-like field that opens file picker */}
            <label className="text-sm font-medium">Cover Image *</label>
            <div
              className={`mb-2 w-full rounded overflow-hidden ${
                errors.cover ? "border border-red-500" : "border"
              }`}
            >
              <div className="flex w-full">
                <button
                  type="button"
                  onClick={() => coverInputRef.current && coverInputRef.current.click()}
                  className="px-4 py-2 bg-white text-sm font-medium border-r border-gray-200 hover:bg-gray-50"
                >
                  Choose File
                </button>
                <div
                  onClick={() => coverInputRef.current && coverInputRef.current.click()}
                  className="flex-1 px-4 py-2 bg-white text-sm text-gray-600 cursor-pointer"
                >
                  {coverFile ? coverFile.name : "No file chosen"}
                </div>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setCoverFile(file);
                  if (file && errors.cover) {
                    setErrors((prev) => {
                      const c = { ...prev };
                      delete c.cover;
                      return c;
                    });
                  }
                }}
              />
            </div>
            {errors.cover && (
              <div className="text-red-600 text-sm mb-2">{errors.cover}</div>
            )}

            {/* PDF: text-like field that opens file picker */}
            <label className="text-sm font-medium">Book PDF *</label>
            <div
              className={`mb-3 w-full rounded overflow-hidden ${
                errors.pdf ? "border border-red-500" : "border"
              }`}
            >
              <div className="flex w-full">
                <button
                  type="button"
                  onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                  className="px-4 py-2 bg-white text-sm font-medium border-r border-gray-200 hover:bg-gray-50"
                >
                  Choose File
                </button>
                <div
                  onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                  className="flex-1 px-4 py-2 bg-white text-sm text-gray-600 cursor-pointer"
                >
                  {pdfFile ? pdfFile.name : "No file chosen"}
                </div>
              </div>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setPdfFile(file);
                  if (file && errors.pdf) {
                    setErrors((prev) => {
                      const c = { ...prev };
                      delete c.pdf;
                      return c;
                    });
                  }
                }}
              />
            </div>
            {errors.pdf && (
              <div className="text-red-600 text-sm mb-2">{errors.pdf}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!walletAccount || loading}
              className={`w-full py-2 rounded-lg text-white ${
                !walletAccount
                  ? "bg-gray-400 cursor-not-allowed"
                  : loading
                  ? "bg-blue-600 text-white cursor-wait"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Uploading & Minting...
                </>
              ) : !walletAccount ? (
                "Connect Wallet First"
              ) : (
                "Upload & Mint NFT"
              )}
            </button>
          </div>

          {/* Right: previews */}
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">Previews</h3>
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Cover Preview</p>
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
                  alt="cover preview"
                  className="w-full h-72 object-contain rounded"
                />
              ) : (
                <div className="w-full h-56 flex items-center justify-center bg-white border border-dashed border-gray-300 rounded text-gray-500">
                  No cover selected
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">PDF Preview</p>
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  title="pdf-preview"
                  className="w-full h-72"
                />
              ) : (
                <div className="w-full h-72 flex items-center justify-center bg-white border border-dashed border-gray-300 rounded text-gray-500">
                  No PDF selected
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
