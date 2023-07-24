import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  console.log("----------------------------------------------------");
  const timeLock = await get("TimeLock");

  const greeter = await deploy("Greeter", {
    from: deployer,
    args: ["Bonjour, le monde!"],
    log: true,
  });

  console.log(`Greeter contract: `, greeter.address);
  console.log(`Greeter transferOwnership to TimeLock ...`);
  const greeterContract = await ethers.getContractAt("Greeter", greeter.address);
  const transferTx = await greeterContract.transferOwnership(timeLock.address);
  await transferTx.wait(1);
  console.log(`Greeter Owner: `, await greeterContract.owner());
};
export default func;
func.tags = ["all", "test_greeter"];
