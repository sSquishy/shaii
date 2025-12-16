import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BookModule", (m) => {
  //yung m ay parang context or environment, sya yung kukuha ng library or contract, kaya nagagmit yung m.contract
  const book = m.contract("BookNFT"); //pangalan ng contract.sol, pwedeng baguhin yung "counter" na local variable, pwede ring hindi

  //   m.call(counter, "incBy", [5n]); //tatawagin nya yung function pagka deploy, pag wala delete

  return { book }; //dyan malalaman ano yung magiging contract address pag na deploy na
});
