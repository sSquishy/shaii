import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

export default function Nav() {
  const [walletAccount, setWalletAccount] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync wallet state from localStorage
  useEffect(() => {
    const updateWalletState = () => {
      const account = localStorage.getItem("walletAccount");
      const isConnected = localStorage.getItem("isWalletConnected") === "true";

      if (isConnected && account) {
        setWalletAccount(account);
      } else {
        setWalletAccount(null);
      }
    };

    updateWalletState();

    window.addEventListener("storage", updateWalletState);

    const interval = setInterval(updateWalletState, 1000);

    return () => {
      window.removeEventListener("storage", updateWalletState);
      clearInterval(interval);
    };
  }, []);

  // FIXED: Fully functional connect wallet
  async function connectWallet() {
    if (!window.ethereum) {
      if (window.showToast) window.showToast('warning', 'Please install MetaMask', 'Missing Wallet');
      else alert("Please install MetaMask");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const account = accounts[0];

        // Update state
        setWalletAccount(account);

        // Store for sync with all components
        localStorage.setItem("walletAccount", account);
        localStorage.setItem("isWalletConnected", "true");

        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      console.error("Connection rejected:", err);
    }
  }

  // Logout wallet
  function disconnectWallet() {
    setWalletAccount(null);

    localStorage.removeItem("walletAccount");
    localStorage.setItem("isWalletConnected", "false");

    window.dispatchEvent(new Event("storage"));

    if (window.ethereum && window.ethereum.disconnect) {
      window.ethereum.disconnect();
    }

    setDropdownOpen(false);
  }

  const shortAddress =
    walletAccount?.length > 6
      ? `${walletAccount.slice(0, 6)}...${walletAccount.slice(-4)}`
      : "";

  return (
    <nav className="w-full bg-blue-900 text-white px-6 py-4 flex items-center shadow relative">
      {/* LEFT LOGO */}
      <div className="w-1/3 text-2xl font-bold">Web3 Library</div>

      {/* CENTER NAV LINKS */}
      <div className="w-1/3 flex justify-center gap-6">
        <NavLink
          to="/purchase"
          className={({ isActive }) =>
            `transition pb-2 border-b-2 ${
              isActive ? "border-white" : "border-transparent"
            } hover:border-white`
          }
        >
          Purchase
        </NavLink>
        <NavLink
          to="/sell"
          className={({ isActive }) =>
            `transition pb-2 border-b-2 ${
              isActive ? "border-white" : "border-transparent"
            } hover:border-white`
          }
        >
          Sell
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `transition pb-2 border-b-2 ${
              isActive ? "border-white" : "border-transparent"
            } hover:border-white`
          }
        >
          Upload
        </NavLink>
        <NavLink
          to="/my-library"
          className={({ isActive }) =>
            `transition pb-2 border-b-2 ${
              isActive ? "border-white" : "border-transparent"
            } hover:border-white`
          }
        >
          Library
        </NavLink>
      </div>

      {/* RIGHT (Wallet + Dropdown) */}
      <div className="w-1/3 flex justify-end relative">
        {/* CONNECTED */}
        {walletAccount ? (
          <>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {shortAddress}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white text-black rounded-lg shadow-lg w-44 py-2 z-50">
                {/* LOGOUT */}
                <button
                  onClick={disconnectWallet}
                  className="w-full flex items-center gap-2 text-left px-4 py-2 text-red-600 font-semibold hover:bg-red-100 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5m0 0h-2m2 0h2"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          /* FIXED — Connect Wallet */
          <button
            onClick={connectWallet}
            className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
