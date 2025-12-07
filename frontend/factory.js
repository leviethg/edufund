console.log("FACTORY JS LOADED");

const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
const factoryAbi = [
  "function createFund(string name, uint256 fundAmount, uint8 slots, string description) external payable returns (address)",
  "event FundCreated(address indexed fundAddress, address indexed creator, uint256 fundAmount, uint8 slots, uint256 fee)"
];

let provider, signer, factory;

const connectBtn = document.getElementById("connectBtn");
const createBtn = document.getElementById("createBtn");
const status = document.getElementById("status");
const result = document.getElementById("result");

connectBtn.onclick = connectWallet;
createBtn.onclick = createFund;

async function connectWallet() {
  await ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();

  const addr = await signer.getAddress();
  status.innerText = "Kết nối: " + addr;

  factory = new ethers.Contract(factoryAddress, factoryAbi, signer);
}

async function createFund() {
  if (!factory) return alert("Chưa kết nối ví!");

  const name = document.getElementById("fundName").value.trim();
  const amount = parseFloat(document.getElementById("fundAmount").value.trim());
  const slots = parseInt(document.getElementById("fundSlots").value.trim());
  const desc = document.getElementById("fundDesc").value.trim();

  if (!name || !amount || !slots || slots < 1 || slots > 5) {
    return alert("Điền thông tin hợp lệ!");
  }

  if (amount < 1000) {
    return alert("Giá trị tối thiểu: 1000 ETH");
  }

  // Tính số tiền cần gửi (105%)
  const eth = ethers.utils.parseEther(amount.toString());
  const fee = eth.mul(5).div(100);
  const total = eth.add(fee);

  try {
    const tx = await factory.createFund(name, eth, slots, desc, {
      value: total
    });

    const receipt = await tx.wait();

    const event = receipt.events.find(e => e.event === "FundCreated");
    const fundAddr = event.args.fundAddress;

    result.innerHTML = `
      <b>Tạo quỹ thành công!</b><br/>
      Fund address: ${fundAddr}<br/>
      <a href="fund.html?address=${fundAddr}">Mở quỹ</a>
    `;
  } catch (err) {
    console.error(err);
    alert("Tạo quỹ thất bại: " + err.message);
  }
}
