const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
// PINATA_JWT → yung secret key para makagamit ng Pinata API
// import.meta.env → galing sa environment variables, parang "hidden settings" ng app

export async function uploadFileToIPFS(file) {
  // function na mag-upload ng file sa IPFS gamit Pinata
  console.log(PINATA_JWT);
  // check lang kung tama yung JWT key sa console

  const formData = new FormData();
  // FormData → parang "container" ng files na ipapadala sa server
  formData.append("file", file);
  // idinadagdag natin yung file sa container

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    // fetch → parang magpadala ng request sa server
    method: "POST",
    // POST → para mag-send ng data
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      // Authorization → kailangan para i-verify yung user (JWT key)
    },
    body: formData,
    // body → dito nilalagay yung file na ipapadala
  });

  if (!res.ok) throw new Error(`File upload failed: ${res.statusText}`);
  // kung may error sa upload, magthrow ng error
  const data = await res.json();
  // response galing sa server → convert sa JSON para mabasa
  console.log("File uploaded:", data.IpfsHash);
  // makita sa console yung IPFS info
  return `ipfs://${data.IpfsHash}`;
  // ibabalik yung IPFS link para magamit sa app
}

export async function uploadJSONToIPFS(json) {
  // function na mag-upload ng JSON (data object) sa IPFS
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
      // Content-Type → sinasabi sa server na JSON ang ipadadala
    },
    body: JSON.stringify(json),
    // JSON.stringify → gawang string yung JSON object para ma-send
  });

  if (!res.ok) throw new Error(`JSON upload failed: ${res.statusText}`);
  // kung may error sa upload, magthrow ng error
  const data = await res.json();
  // convert response sa JSON
  return `ipfs://${data.IpfsHash}`;
  // ibabalik yung IPFS link ng JSON
}

// Flow:
// The user opens the app.
// The app checks if MetaMask is installed; if not, it shows an alert asking the user to install it.
// The user clicks the “Connect Wallet” button.
// The wallet gets connected, and the account address is saved in the app.
// The user selects a file or JSON data to upload.
// The app sends the selected data to Pinata’s API.
// The app checks if the upload was successful; if not, it shows an error message.
// If successful, the app returns the IPFS link, which can then be displayed or used in the application.
