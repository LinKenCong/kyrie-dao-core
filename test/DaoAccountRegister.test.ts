import { ERC6551Account, GovernanceNFT, KyrieDaoAccountRegister } from "../types";
import { expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";

describe("DaoAccountRegister Test", () => {
  let daoRegister: KyrieDaoAccountRegister;
  let nft: GovernanceNFT;
  let erc6551Account: ERC6551Account;
  let deployerAddress: string;

  before(async () => {
    await deployments.fixture(["all"]);
    const signers = await ethers.getSigners();
    const deployerSigners = signers[0];
    const { deployer } = await getNamedAccounts();
    deployerAddress = deployer;

    const ERC6551Account = await deployments.get("ERC6551Account");
    const GovernanceNFT = await deployments.get("GovernanceNFT");
    const KyrieDaoAccountRegister = await deployments.get("KyrieDaoAccountRegister");

    erc6551Account = (await ethers.getContractAt("ERC6551Account", ERC6551Account.address)).connect(deployerSigners);
    nft = (await ethers.getContractAt("GovernanceNFT", GovernanceNFT.address)).connect(deployerSigners);
    daoRegister = (await ethers.getContractAt("KyrieDaoAccountRegister", KyrieDaoAccountRegister.address)).connect(
      deployerSigners,
    );
  });

  // basic register set
  const nftId = 0;

  it("Mint NFT, Get ready for registration", async () => {
    await nft.safeMint(deployerAddress);
    const ownerOf = await nft.ownerOf(nftId);
    expect(ownerOf).eq(deployerAddress);
  });

  it("Shold be wrong, if use createAccount() register DAO account", async () => {
    const implementation = await erc6551Account.getAddress();
    const chainId = String(network.config.chainId);
    const tokenContract = await nft.getAddress();

    await expect(daoRegister.createAccount(implementation, chainId, tokenContract, nftId, 1, "0x")).revertedWith(
      "Plz use 'createDaoAccount()' register dao.",
    );
  });

  it("Register Account", async () => {
    const tx = await daoRegister.createDaoAccount(nftId);
    const txReceipt = await tx.wait(1);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const newAccount = txReceipt.logs[0].args[0];
    const getAccount = await daoRegister.daoAccountOf(nftId);
    expect(getAccount).eq(newAccount);
    console.log("newAccount", newAccount);
  });

  it("Shold be wrong, if register again", async () => {
    await expect(daoRegister.createDaoAccount(nftId)).revertedWith("The NFT has already been registered.");
  });

  it("Shold be wrong, if register not mint nft", async () => {
    await expect(daoRegister.createDaoAccount(nftId + 1)).revertedWith("ERC721: invalid token ID");
  });

  it("Shold be wrong, if register the same nftId from other user", async () => {
    const signers = await ethers.getSigners();
    await expect(daoRegister.connect(signers[1]).createDaoAccount(nftId)).revertedWith(
      "You need to be the owner of the NFT.",
    );
  });
});
