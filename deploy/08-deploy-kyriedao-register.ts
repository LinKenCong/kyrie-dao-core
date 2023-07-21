import verify from "../helper-functions";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployKyrieDaoAccountRegister: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const erc6551Account = await get("ERC6551Account");
  const governanceNFT = await get("GovernanceNFT");
  const chainID = network.config.chainId;
  const args = [erc6551Account.address, governanceNFT.address, chainID];

  log("----------------------------------------------------");
  log("Deploying KyrieDaoAccountRegister and waiting for confirmations...");
  const kyrieDaoAccountRegister = await deploy("KyrieDaoAccountRegister", {
    from: deployer,
    args: args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`KyrieDaoAccountRegister at ${kyrieDaoAccountRegister.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(kyrieDaoAccountRegister.address, []);
  }
};

export default deployKyrieDaoAccountRegister;
deployKyrieDaoAccountRegister.tags = ["all", "KyrieDaoAccountRegister"];
