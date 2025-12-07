const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const Factory = await ethers.getContractFactory("FundFactory");
  const factory = await Factory.deploy();
  await factory.deployed();

  console.log("Factory deployed at:", factory.address);

  // Tạo quỹ mẫu từ deployer
  const fundAmount = ethers.utils.parseEther("1000");
  const fee = fundAmount.mul(5).div(100);
  const total = fundAmount.add(fee);

  const tx = await factory.createFund(
    "Quỹ Mẫu",
    fundAmount,
    3,
    "Demo Scholarship Fund",
    { value: total }
  );

  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === "FundCreated");

  console.log("Fund address:", event.args.fundAddress);
}

main().catch(e => console.error(e));
