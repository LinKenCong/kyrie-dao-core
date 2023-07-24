import verify from "../helper-functions";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  log("----------------------------------------------------");
  log("Deploying ERC6551Account and waiting for confirmations...");
  const erc6551Account = await deploy("ERC6551Account", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`ERC6551Account at ${erc6551Account.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(erc6551Account.address, []);
  }
};

export default func;
func.tags = ["all", "ERC6551Account"];
