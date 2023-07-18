import verify from "../helper-functions";
import {
  QUORUM_PERCENTAGE,
  VOTING_DELAY,
  VOTING_PERIOD,
  developmentChains,
  networkConfig,
} from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployGovernorContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const governanceCoin = await get("GovernanceCoin");
  const timeLock = await get("TimeLock");

  // [GovernanceToken, TimeLock, 需要 x% 的选民通过, 投票持续多长时间(区块), 提案投票生效之前需要 x 区块]
  const args = [governanceCoin.address, timeLock.address, QUORUM_PERCENTAGE, VOTING_PERIOD, VOTING_DELAY];

  log("----------------------------------------------------");
  log("Deploying GovernorContract and waiting for confirmations...");
  const governorContract = await deploy("GovernorContract", {
    from: deployer,
    args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`GovernorContract at ${governorContract.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(governorContract.address, args);
  }
};

export default deployGovernorContract;
deployGovernorContract.tags = ["all", "governor"];
