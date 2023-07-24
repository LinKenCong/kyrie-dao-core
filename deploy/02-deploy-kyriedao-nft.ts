import verify from "../helper-functions";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const ERC6551Account = await get("ERC6551Account");
  log("----------------------------------------------------");
  log("Deploying KyrieDaoNft and waiting for confirmations...");
  const daoNft = await deploy("KyrieDaoNft", {
    from: deployer,
    args: [ERC6551Account.address],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`KyrieDaoNft at ${daoNft.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(daoNft.address, []);
  }
};

export default func;
func.tags = ["all", "KyrieDaoNft"];
