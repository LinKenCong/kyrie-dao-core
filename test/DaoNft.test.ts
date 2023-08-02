import { KyrieDaoNft } from "../types";
import { expect } from "chai";
import { deployments, ethers, getNamedAccounts } from "hardhat";

describe("DaoNft Test", () => {
  let nft: KyrieDaoNft;
  let deployerAddress: string;

  before(async () => {
    await deployments.fixture(["all"]);
    const signers = await ethers.getSigners();
    const deployerSigners = signers[0];
    const { deployer } = await getNamedAccounts();
    deployerAddress = deployer;

    const KyrieDaoNft = await deployments.get("KyrieDaoNft");

    nft = (await ethers.getContractAt("KyrieDaoNft", KyrieDaoNft.address)).connect(deployerSigners);
  });

  it("Should mint new NFT", async () => {
    const initialSupply = await nft.totalSupply();
    const account = await nft.safeMint(deployerAddress);
    const newSupply = await nft.totalSupply();
    expect(newSupply).to.be.equal(initialSupply + BigInt(1), "Total supply did not increment correctly");
    expect(account).to.not.equal("0x0000000000000000000000000000000000000000", "Account address should not be zero");
  });

  it("Should pause and unpause", async () => {
    await nft.pause();
    expect(await nft.paused()).to.be.true;
    await nft.unpause();
    expect(await nft.paused()).to.be.false;
  });

  it("Should set base URI", async () => {
    const uri = "https://example.com/nft/";
    await nft.setBaseURI(uri);
    expect(await nft.baseURI()).to.be.equal(uri, "Base URI was not set correctly");
  });

  it("Should register an account", async () => {
    const [, other] = await ethers.getSigners();
    expect(await nft.isRegistered(other.address)).to.be.false;
    await nft.safeMint(other.address);
    expect(await nft.isRegistered(other.address)).to.be.true;
  });
});
