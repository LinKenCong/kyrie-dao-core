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
import { GovernanceCoin, GovernorContract, Greeter, TimeLock } from "../types";
import { keccak256, toUtf8Bytes } from "../utils/ethers-utils";
import { moveBlocks } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";
import { expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";

describe("Governance Test", () => {
  let governanceCoin: GovernanceCoin;
  let timeLock: TimeLock;
  let governor: GovernorContract;
  let targerContract: Greeter;
  let proposalId: any;
  let deployerAddress: string;
  before(async () => {
    await deployments.fixture(["all"]);
    const signers = await ethers.getSigners();
    const deployerSigners = signers[0];
    const { deployer } = await getNamedAccounts();
    deployerAddress = deployer;

    // Get deployments data
    const GovernanceCoin = await deployments.get("GovernanceCoin");
    const TimeLock = await deployments.get("TimeLock");
    const GovernorContract = await deployments.get("GovernorContract");
    const Greeter = await deployments.get("Greeter");

    // Connect contract
    governanceCoin = (await ethers.getContractAt("GovernanceCoin", GovernanceCoin.address)).connect(deployerSigners);
    timeLock = (await ethers.getContractAt("TimeLock", TimeLock.address)).connect(deployerSigners);
    governor = (await ethers.getContractAt("GovernorContract", GovernorContract.address)).connect(deployerSigners);
    targerContract = (await ethers.getContractAt("Greeter", Greeter.address)).connect(deployerSigners);
  });

  beforeEach(async () => {
    console.log("----------------------------------------------------v");
  });

  it("Address Check", async () => {
    const signers = await ethers.getSigners();

    expect(deployerAddress).to.eq(signers[0].address);
    expect(await governor.name()).eq("KyrieDAO");

    console.log("governanceCoin", await governanceCoin.getAddress());
    console.log("timeLock", await timeLock.getAddress());
    console.log("governor", await governor.getAddress());
    console.log("targerContract", await targerContract.getAddress());
  });

  it("Delegating to deployer", async () => {
    const coin = await ethers.getContractAt("GovernanceCoin", await governanceCoin.getAddress());
    const transactionResponse = await coin.delegate(deployerAddress);
    await transactionResponse.wait(1);

    const numCheckpoints = await coin.numCheckpoints(deployerAddress);
    expect(numCheckpoints).to.eq(1);

    console.log(`Checkpoints: ${numCheckpoints}`);
  });

  it("Setup Contracts", async () => {
    console.log("Setting up contracts for roles...");

    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();
    const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE();
    console.log("adminRole", adminRole);

    // Governor合约被授予提案者角色
    const proposerTx = await timeLock.grantRole(proposerRole, await governor.getAddress());
    await proposerTx.wait(1);
    // 执行角色被授予“零地址”，这意味着任何人都可以执行提案
    const executorTx = await timeLock.grantRole(executorRole, ADDRESS_ZERO);
    await executorTx.wait(1);
    // 取消部署者的 TimeLock 合约权限
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
    const voteWay = 1;
    const reason = "I lika do da cha cha";

    // Vote
    const voteTx = await governor.castVoteWithReason(proposalId, voteWay, reason);
    const voteTxReceipt = await voteTx.wait(1);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    console.log(voteTxReceipt.logs[0].args[0]);

    // Current Proposal State is Active
    const proposalStateOld = await governor.state(proposalId);
    expect(proposalStateOld).eq(1);

    if (developmentChains.includes(network.name)) {
      await moveBlocks(VOTING_PERIOD + 1);
    }

    // Current Proposal Votes: againstVotes, forVotes, abstainVotes
    const proposalVotes = await governor.proposalVotes(proposalId);
    const governanceCoinTotal = await governanceCoin.totalSupply();
    expect(proposalVotes.forVotes).eq(governanceCoinTotal);
    expect(proposalVotes.forVotes).eq(await governanceCoin.balanceOf(deployerAddress));
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
