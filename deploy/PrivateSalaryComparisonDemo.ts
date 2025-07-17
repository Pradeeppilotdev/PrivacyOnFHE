import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivateSalaryComparisonDemo = await deploy("PrivateSalaryComparisonDemo", {
    from: deployer,
    log: true,
  });

  console.log(`PrivateSalaryComparisonDemo contract: `, deployedPrivateSalaryComparisonDemo.address);
};
export default func;
func.id = "deploy_privateSalaryComparisonDemo"; // id required to prevent reexecution
func.tags = ["PrivateSalaryComparisonDemo"];
