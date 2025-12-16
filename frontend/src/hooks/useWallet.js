import { useState, useEffect } from "react";

export default function useWallet() {
  const [account, setAccount] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  // Check if wallet already connected on page load
  useEffect(() => {
    async function checkConnection() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            setAccount("");
          }
        } catch (err) {
          console.error("MetaMask check failed:", err);
        }
      }
      setIsChecking(false);
    }
    checkConnection();
  }, []);

  // Connect wallet
  async function connectWallet() {
    if (!window.ethereum) {
      if (window.showToast) window.showToast('warning', 'MetaMask is not installed.', 'Missing Wallet');
      else alert("MetaMask is not installed.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    } catch (err) {
      console.error("MetaMask connection failed:", err);
    }
  }

  // Disconnect simply clears state
  function disconnectWallet() {
    setAccount("");
  }

  return {
    account,
    isChecking,
    connectWallet,
    disconnectWallet,
  };
}
