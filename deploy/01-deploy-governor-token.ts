import verify from "../helper-functions";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployGovernanceToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  log("----------------------------------------------------");
  log("Deploying GovernanceCoin and waiting for confirmations...");
  const governanceCoin = await deploy("GovernanceCoin", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`GovernanceCoin at ${governanceCoin.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(governanceCoin.address, []);
  }
  log(`Delegating to ${deployer}`);
  // await delegate(governanceCoin.address, deployer);
  log("Delegated!");
};

export default deployGovernanceToken;
deployGovernanceToken.tags = ["all", "governanceCoin"];
