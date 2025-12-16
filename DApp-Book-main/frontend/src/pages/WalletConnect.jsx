import { useState, useEffect, use } from "react";
// useState → para may "memory" ang UI tulad ng mga input values
// useEffect → para mag-run ang code kapag nag load or nag update ang component
import contractData from "../utilities/BookNFT.json";
// Ito ang contract ABI para makausap ang smart contract
import { uploadFileToIPFS, uploadJSONToIPFS } from "../services/pinata.js";
// function para mag upload ng files sa IPFS
import { ethers } from "ethers";
// ethers → library para makipag interact sa Ethereum blockchain

const contractAddress = "0xDAEEAe76F808c0A12A8A6D82918abCC45569fEA0";
const contractABI = contractData.abi;

export default function WalletConnect() {
  const [account, setLocalAccount] = useState(null);
  // account → dito naka-save ang MetaMask wallet address ng user
  // setLocalAccount → pang update sa address

  async function connectWallet() {
    // function para i-connect ang MetaMask ng user
    if (window.ethereum) {
      // window.ethereum → sign na naka-install ang MetaMask
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        // eth_requestAccounts → hihingi ng permission kay user
        setLocalAccount(accounts[0]);
        // iset ang unang wallet bilang active wallet
      } catch (err) {
        console.error("User rejected connection:", err);
        // kung nag-cancel si user, lalabas lang sa console ang reason
      }
    } else {
      alert("Please install MetaMask");
      // kung walang MetaMask, i-inform ang user
    }
  }

  useEffect(() => {
    setForm({ ...form, author_wallet_address: account || "" });
  }, [account]);

  const [form, setForm] = useState({
    book_title: "",
    author: "",
    author_wallet_address: account || "",
    isbn: "",
    genre: "",
    price: "",
  });

  const [cover, setCover] = useState(null); // store para sa image file
  const [pdf, setPdf] = useState(null); // store para sa pdf file
  const [loading, setLoading] = useState(false); // pang control ng loading state
  const [errors, setError] = useState({}); // storage ng error messages

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const coverCID = await uploadFileToIPFS(cover); // upload ang cover image sa IPFS
      const pdfCID = await uploadFileToIPFS(pdf); // upload ang pdf file sa IPFS

      const metadata = { ...form, cover_cid: coverCID, pdf_cid: pdfCID }; // buuin ang metadata object
      const metadataCID = await uploadJSONToIPFS(metadata); // upload ang metadata sa IPFS
      console.log("Metadata CID:", metadataCID); // ipakita ang metadata CID sa console

      const provider = new ethers.BrowserProvider(window.ethereum); // gumawa ng provider gamit ang MetaMask
      const signer = await provider.getSigner(); // kunin ang signer mula sa provider

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      ); // gumawa ng contract instance

      const tx = await contract.mintBook(account, metadataCID); // tawagin ang mintBookNFT function ng contract

      await tx.wait(); // hintayin matapos ang transaction
      alert("NFT minted successfully!");
    } catch (err) {
      console.error("Error uploading and minting NFT:", err);
      alert("Failed to mint NFT. See console for details.");
    }
    setLoading(false);
  }

  return (
    <>
      <div className="bg-[radial-gradient(circle,rgba(183,0,255,1),rgba(224,83,17,1),rgba(125,0,209,1))] p-6 shadow-md w-full mb-6 flex flex-col items-center">
        {/* 
          Wrapper container para sa wallet section
          Responsible for: 
          - nice design background
          - layout ng wallet connect button / connected wallet details
        */}
        <h2 className="text-xl text-white font-bold mb-4">
          🔗 Wallet Connection
        </h2>

        {account ? (
          // Kung may naka-connect na wallet → ito ang ipapakita
          <div className="w-full text-center">
            <p className="text-green-600 font-semibold mb-2">✅ Connected</p>

            {/* 
              Display ng wallet address ng user 
              Purpose:
              - Para aware si user na naka connect ang MetaMask
              - Para makita niya ang actual wallet address niya
            */}
            <div className="px-3 py-2 text-lg text-white">{account}</div>
          </div>
        ) : (
          // Kung wala pang wallet → button lang ang lalabas
          <button
            onClick={connectWallet} // kapag pinindot, magkoconnect sa MetaMask
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md"
          >
            Connect MetaMask
          </button>
        )}
      </div>

      {/* FORM START */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg max-w-lg mx-auto space-y-4"
      >
        <h2 className="text-xl font-bold">Upload a New Book</h2>

        {/* BOOK TITLE FIELD */}
        <div>
          {/* 
            Input → dito iti-type ang book title
            Label purpose: bigyan ng description ang input
          */}
          <input
            placeholder="Book Title"
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => setForm({ ...form, book_title: e.target.value })}
          />
          {errors.book_title && (
            <p className="text-red-500 text-sm">{errors.book_title}</p>
          )}
        </div>

        {/* AUTHOR NAME */}
        <div>
          <input
            placeholder="Author Name"
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          {errors.author && (
            <p className="text-red-500 text-sm">{errors.author}</p>
          )}
        </div>

        {/* AUTHOR WALLET ADDRESS - READ ONLY */}
        <div>
          <input
            className="w-full border px-3 py-2 rounded bg-gray-100 text-gray-600"
            value={form.author_wallet_address}
            readOnly
          />
          {/* 
            Explanation text:
            - Hindi editable ang wallet kasi automatic galing kay MetaMask
          */}
          <p className="text-xs text-gray-500">Wallet connected via MetaMask</p>
        </div>

        {/* ISBN */}
        <div>
          <input
            placeholder="ISBN"
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
          />
          {errors.isbn && <p className="text-red-500 text-sm">{errors.isbn}</p>}
        </div>

        {/* GENRE */}
        <div>
          <input
            placeholder="Genre"
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          />
          {errors.genre && (
            <p className="text-red-500 text-sm">{errors.genre}</p>
          )}
        </div>

        {/* PRICE */}
        <div>
          <input
            placeholder="Price (ETH)"
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          {errors.price && (
            <p className="text-red-500 text-sm">{errors.price}</p>
          )}
        </div>

        {/* COVER IMAGE */}
        <div>
          {/* Label → nagsasabi kung anong file ang hinihingi */}
          <label className="block">
            Cover Image:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files[0])}
            />
          </label>
          {errors.cover && (
            <p className="text-red-500 text-sm">{errors.cover}</p>
          )}
        </div>

        {/* PDF FILE */}
        <div>
          <label className="block">
            Book PDF:
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files[0])}
            />
          </label>
          {errors.pdf && <p className="text-red-500 text-sm">{errors.pdf}</p>}
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {/* 
            Text logic:
            - Kung loading → show "Uploading & Minting..."
            - Kung hindi → show "Upload & Mint NFT"
          */}
          {loading ? " Uploading & Minting ... " : "Upload & Mint NFT"}
        </button>
      </form>
    </>
  );
}
