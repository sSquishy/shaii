import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BookMarketplaceModule = buildModule("BookMarketplaceModule", (m) => {
  // Your current BookNFT contract address
  const nftAddress = m.getParameter(
    "nftAddress",
    "0xED668f7Cb8cf414D089c2B46ee057c0792f37595"
  );

  const bookMarketplace = m.contract("BookMarketplace", [nftAddress]);

  return { bookMarketplace };
});

export default BookMarketplaceModule;
