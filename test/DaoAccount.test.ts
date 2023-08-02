import {
  ERC20,
  ERC20Mock__factory,
  ERC721,
  ERC721Mock__factory,
  ERC6551Account,
  ERC6551Account__factory,
  KyrieDaoNft,
} from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers } from "hardhat";

describe("DaoAccount Test", () => {
  let nft: KyrieDaoNft;
  let erc6551Account: ERC6551Account;
  let deployerAddress: string;
  let erc20: ERC20;
  let erc721: ERC721;
  let deployerSigner: HardhatEthersSigner;
  let erc6551AccountAddress: string;

  before(async () => {
    await deployments.fixture(["all"]);
    const [deployer] = await ethers.getSigners();
    deployerSigner = deployer;
    deployerAddress = deployerSigner.address;

    const KyrieDaoNft = await deployments.get("KyrieDaoNft");

    const erc20Factory = new ERC20Mock__factory(deployer);
    erc20 = await erc20Factory.deploy();
    const erc721Factory = new ERC721Mock__factory(deployer);
    erc721 = await erc721Factory.deploy();

    nft = (await ethers.getContractAt("KyrieDaoNft", KyrieDaoNft.address)).connect(deployer);
    await nft.safeMint(deployerAddress);
    erc6551AccountAddress = await nft.daoAccountOf(1);

    const erc6551AccountFactory = new ERC6551Account__factory(deployer);
    erc6551Account = erc6551AccountFactory.attach(erc6551AccountAddress) as ERC6551Account;
  });

  it("Should revert if executeCall is called by someone other than the owner", async () => {
    const [, other] = await ethers.getSigners();
    const recipient = other.address;
    const amount = ethers.parseEther("0.1");
    await expect(erc6551Account.connect(other).executeCall(recipient, amount, "0x")).to.be.revertedWith(
      "Not token owner",
    );
  });

  it("Should receive ETH", async () => {
    const sendETH = ethers.parseEther("1");
    const initialBalance = await ethers.provider.getBalance(erc6551AccountAddress);
    await deployerSigner.sendTransaction({ to: erc6551AccountAddress, value: sendETH });
    const finalBalance = await ethers.provider.getBalance(erc6551AccountAddress);
    expect(finalBalance - BigInt(initialBalance)).to.equal(sendETH);
  });

  it("Should send ETH through executeCall", async () => {
    const [, other] = await ethers.getSigners();
    const recipient = other.address;
    const amount = ethers.parseEther("0.1");
    const initialBalance = await ethers.provider.getBalance(recipient);
    await erc6551Account.executeCall(recipient, amount, "0x");
    const finalBalance = await ethers.provider.getBalance(recipient);
    expect(finalBalance - BigInt(initialBalance)).to.equal(amount);
  });

  const ERC20Amount = 1000;

  it("Should receive ERC20 tokens", async () => {
    await erc20.transfer(erc6551AccountAddress, ERC20Amount);
    const balance = await erc20.balanceOf(erc6551AccountAddress);
    expect(balance).to.equal(ERC20Amount);
  });

  it("Should send ERC20 tokens through executeCall", async () => {
    const [, other] = await ethers.getSigners();
    const recipient = other.address;
    const data = erc20.interface.encodeFunctionData("transfer", [recipient, ERC20Amount]);
    await erc6551Account.executeCall(await erc20.getAddress(), 0, data);
    const balance = await erc20.balanceOf(recipient);
    expect(balance).to.equal(ERC20Amount);
  });

  const ERC721TokenId = 0;

  it("Should receive ERC721 token", async () => {
    await erc721.transferFrom(deployerAddress, erc6551AccountAddress, ERC721TokenId);
    expect(await erc721.ownerOf(ERC721TokenId)).to.equal(erc6551AccountAddress);
  });

  it("Should send ERC721 token through executeCall", async () => {
    const [, other] = await ethers.getSigners();
    const recipient = other.address;
    const data = erc721.interface.encodeFunctionData("transferFrom", [erc6551AccountAddress, recipient, ERC721TokenId]);
    await erc6551Account.executeCall(await erc721.getAddress(), 0, data);
    expect(await erc721.ownerOf(ERC721TokenId)).to.equal(recipient);
  });
});
