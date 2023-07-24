import {
  ADDRESS_ZERO,
  FUNC,
  MIN_DELAY,
  NEW_STORE_VALUE,
  PROPOSAL_DESCRIPTION,
  VOTING_DELAY,
  VOTING_PERIOD,
  developmentChains,
} from "../helper-hardhat-config";
import { GovernorContract, Greeter, KyrieDaoNft, TimeLock } from "../types";
import { keccak256, toUtf8Bytes } from "../utils/ethers-utils";
import { moveBlocks } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";

describe("Governance Test", () => {
  let daoNft: KyrieDaoNft;
  let timeLock: TimeLock;
  let governor: GovernorContract;
  let targerContract: Greeter;

  let proposalId: any;
  let deployerAddress: string;
  before(async () => {
    await deployments.fixture(["all"]);
    const [deployer] = await ethers.getSigners();
    deployerAddress = deployer.address;

    // Get deployments data
    const KyrieDaoNft = await deployments.get("KyrieDaoNft");
    const TimeLock = await deployments.get("TimeLock");
    const GovernorContract = await deployments.get("GovernorContract");
    const Greeter = await deployments.get("Greeter");

    // Connect contract
    daoNft = (await ethers.getContractAt("KyrieDaoNft", KyrieDaoNft.address)).connect(deployer);
    timeLock = (await ethers.getContractAt("TimeLock", TimeLock.address)).connect(deployer);
    governor = (await ethers.getContractAt("GovernorContract", GovernorContract.address)).connect(deployer);
    targerContract = (await ethers.getContractAt("Greeter", Greeter.address)).connect(deployer);
  });

  beforeEach(async () => {
    console.log("----------------------------------------------------v");
  });

  it("Address Check", async () => {
    const signers = await ethers.getSigners();

    expect(deployerAddress).to.eq(signers[0].address);
    expect(await governor.name()).eq("KyrieDAO");

    console.log("daoNft", await daoNft.getAddress());
    console.log("timeLock", await timeLock.getAddress());
    console.log("governor", await governor.getAddress());
    console.log("targerContract", await targerContract.getAddress());
  });

  describe("", async () => {});

  it("Mint NFT to test account", async () => {
    const [deployer, other, other2] = await ethers.getSigners();
    const mintArray = [deployer.address, other.address, other2.address];
    for (let i = 0; i < mintArray.length; i++) {
      if (ethers.isAddress(mintArray[i])) {
        const element = await daoNft.safeMint(mintArray[i]);
        await element.wait();
      }
    }
  });

  it("NFT Shuld have DAO account ", async () => {
    const [deployer, other, other2] = await ethers.getSigners();
    const mintArray = [deployer.address, other.address, other2.address];
    const total = await daoNft.totalSupply();
    expect(total).eq(mintArray.length);
    for (let i = 0; i < Number(total); i++) {
      const account = daoNft.daoAccountOf(i);
      console.log(`${mintArray[i]} DAO account is ${account}`);
    }
  });

  it("Delegating to self", async () => {
    const [deployer, other, other2] = await ethers.getSigners();
    {
      const transactionResponse = await daoNft.connect(deployer).delegate(deployer.address);
      await transactionResponse.wait(1);
      const numCheckpoints = await daoNft.getVotes(deployer.address);
      expect(numCheckpoints).to.eq(1);
    }
    {
      const transactionResponse = await daoNft.connect(other).delegate(other.address);
      await transactionResponse.wait(1);
      const numCheckpoints = await daoNft.getVotes(other.address);
      expect(numCheckpoints).to.eq(1);
    }
    {
      const transactionResponse = await daoNft.connect(other2).delegate(other2.address);
      await transactionResponse.wait(1);
      const numCheckpoints = await daoNft.getVotes(other2.address);
      expect(numCheckpoints).to.eq(1);
    }
  });

  it("Setup Contracts", async () => {
    console.log("Setting up contracts for roles...");

    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();
    const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE();

    // The Governor contract has been granted the proposer role.
    const proposerTx = await timeLock.grantRole(proposerRole, await governor.getAddress());
    await proposerTx.wait(1);
    // The execution role has been granted to the "zero address," which means that anyone can execute the proposal.
    const executorTx = await timeLock.grantRole(executorRole, ADDRESS_ZERO);
    await executorTx.wait(1);
    // Cancel the TimeLock contract permissions for the deployer.
    const revokeTx = await timeLock.revokeRole(adminRole, deployerAddress);
    await revokeTx.wait(1);

    console.log("Setting up success!");
  });

  it("Submit Proposal", async () => {
    const args = [NEW_STORE_VALUE];
    const functionToCall = FUNC;
    const proposalDescription = PROPOSAL_DESCRIPTION;
    const targerContractAddress = await targerContract.getAddress();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const encodedFunctionCall = targerContract.interface.encodeFunctionData(functionToCall, args);

    console.log(`Proposing ${encodedFunctionCall} on ${targerContractAddress} with ${args}`);
    console.log(`Proposal Description:\n  ${proposalDescription}`);

    const proposeTx = await governor.propose([targerContractAddress], [0], [encodedFunctionCall], proposalDescription);
    // If working on a development chain, we will push forward till we get to the voting period.
    if (developmentChains.includes(network.name)) {
      await moveBlocks(VOTING_DELAY + 1);
    }
    const proposeReceipt = await proposeTx.wait(1);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    proposalId = proposeReceipt.logs[0].args[0];
    console.log(`Proposed with proposal ID:\n  ${proposalId}`);

    const proposalState = await governor.state(proposalId);
    const proposalSnapShot = await governor.proposalSnapshot(proposalId);
    const proposalDeadline = await governor.proposalDeadline(proposalId);

    // the Proposal State is an enum data type, defined in the IGovernor contract.
    // 0:Pending, 1:Active, 2:Canceled, 3:Defeated, 4:Succeeded, 5:Queued, 6:Expired, 7:Executed
    console.log(`Current Proposal State: ${proposalState}`);
    // What block # the proposal was snapshot
    console.log(`Current Proposal Snapshot: ${proposalSnapShot}`);
    // The block number the proposal voting expires
    console.log(`Current Proposal Deadline: ${proposalDeadline}`);
  });

  it("Voting Proposal", async () => {
    const [deployer, other, other2] = await ethers.getSigners();
    // Vote
    {
      const voteTx = await governor.connect(deployer).castVoteWithReason(proposalId, 1, "I lika do da cha cha");
      await voteTx.wait(1);
    }
    {
      const voteTx = await governor.connect(other).castVote(proposalId, 0);
      await voteTx.wait(1);
    }
    {
      const voteTx = await governor.connect(other2).castVote(proposalId, 1);
      await voteTx.wait(1);
    }

    // Current Proposal State is Active
    const proposalStateOld = await governor.state(proposalId);
    expect(proposalStateOld).eq(1);

    if (developmentChains.includes(network.name)) {
      await moveBlocks(VOTING_PERIOD + 1);
    }

    // Current Proposal Votes: againstVotes, forVotes, abstainVotes
    const proposalVotes = await governor.proposalVotes(proposalId);
    const governanceCoinTotal = await daoNft.totalSupply();
    console.log("governanceCoinTotal", governanceCoinTotal);
    // expect(proposalVotes.forVotes).eq(governanceCoinTotal);
    // expect(proposalVotes.forVotes).eq(await daoNft.balanceOf(deployerAddress));
    console.log(`Current Proposal Votes: ${proposalVotes}`);

    // Current Proposal State is Succeeded
    const proposalStateCurrent = await governor.state(proposalId);
    expect(proposalStateCurrent).eq(4);
    console.log(`Current Proposal State: ${proposalStateCurrent}`);
  });

  it("Queue Proposals", async () => {
    const targerContractAddress = await targerContract.getAddress();
    const args = [NEW_STORE_VALUE];
    const functionToCall = FUNC;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const encodedFunctionCall = targerContract.interface.encodeFunctionData(functionToCall, args);
    const descriptionHash = keccak256(toUtf8Bytes(PROPOSAL_DESCRIPTION));
    console.log("descriptionHash", descriptionHash);

    console.log("Queueing...");
    const queueTx = await governor.queue([targerContractAddress], [0], [encodedFunctionCall], descriptionHash);
    await queueTx.wait(1);

    if (developmentChains.includes(network.name)) {
      await moveTime(MIN_DELAY + 1);
      await moveBlocks(1);
    }

    // Current Proposal State is Queued
    const proposalStateCurrent = await governor.state(proposalId);
    expect(proposalStateCurrent).eq(5);
    console.log(`Current Proposal State: ${proposalStateCurrent}`);
  });

  it("Execute the proposal", async () => {
    const targerContractAddress = await targerContract.getAddress();
    const args = [NEW_STORE_VALUE];
    const functionToCall = FUNC;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const encodedFunctionCall = targerContract.interface.encodeFunctionData(functionToCall, args);
    const descriptionHash = keccak256(toUtf8Bytes(PROPOSAL_DESCRIPTION));

    console.log("Executing...");
    // this will fail on a testnet because you need to wait for the MIN_DELAY!
    const executeTx = await governor.execute([targerContractAddress], [0], [encodedFunctionCall], descriptionHash);
    await executeTx.wait(1);
    console.log(`Targer value: ${await targerContract.retrieve()}`);

    // Current Proposal State is Executed
    const proposalStateCurrent = await governor.state(proposalId);
    expect(proposalStateCurrent).eq(7);
    console.log(`Current Proposal State: ${proposalStateCurrent}`);
  });
});
