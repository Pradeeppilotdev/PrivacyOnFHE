import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivateSalaryComparison = await deploy("PrivateSalaryComparison", {
    from: deployer,
    log: true,
  });

  console.log(`PrivateSalaryComparison contract: `, deployedPrivateSalaryComparison.address);
};
export default func;
func.id = "deploy_privateSalaryComparison"; // id required to prevent reexecution
func.tags = ["PrivateSalaryComparison"];
