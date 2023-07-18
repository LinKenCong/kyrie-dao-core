import verify from "../helper-functions";
import { MIN_DELAY, developmentChains, networkConfig } from "../helper-hardhat-config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployTimeLock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  log("----------------------------------------------------");
  log("Deploying TimeLock and waiting for confirmations...");
  const timeLock = await deploy("TimeLock", {
    from: deployer,
    /**
     * - `minDelay`：操作的初始最小延迟
     * - `proposers`：被授予提议者和取消者角色的账户
     * - `executors`：被授予执行者角色的账户
     * - `admin`：可选帐户被授予管理员角色； 禁用零地址
     *
     * 重要提示：可选的管理员可以在部署后帮助进行角色的初始配置
     * 不会延迟，但随后应放弃该角色，以支持
     * 通过限时提案进行管理。 本合同的先前版本将分配
     * 此管理员自动分配给部署者，也应该放弃。
     */
    args: [MIN_DELAY, [], [], deployer],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`TimeLock at ${timeLock.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(timeLock.address, []);
  }
};

export default deployTimeLock;
deployTimeLock.tags = ["all", "timelock"];
