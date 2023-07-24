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

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const daoNft = await get("KyrieDaoNft");
  const timeLock = await get("TimeLock");

  // [GovernanceToken, TimeLock, x% of voters required to pass, duration of voting (in blocks), x blocks before proposal voting takes effect]
  const args = [daoNft.address, timeLock.address, QUORUM_PERCENTAGE, VOTING_PERIOD, VOTING_DELAY];

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

export default func;
func.tags = ["all", "governor"];
