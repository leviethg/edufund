console.log("INDEX PAGE LOADED");

const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const factoryAbi = [
  "function getAllFunds() view returns (address[])"
];

const fundAbi = [
  "function name() view returns (string)",
  "function totalFund() view returns (uint256)",
  "function slots() view returns (uint8)",
  "function owner() view returns (address)"
];

let provider, signer, factory;

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("loadBtn").onclick = loadFunds;

async function connectWallet() {
  await ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  factory = new ethers.Contract(factoryAddress, factoryAbi, signer);

  const addr = await signer.getAddress();
  document.getElementById("status").innerText = "Kết nối: " + addr;
}

async function loadFunds() {
  if (!factory) return alert("Chưa kết nối ví!");

  const listDiv = document.getElementById("fundList");
  listDiv.innerHTML = "Đang tải...";

  const addrs = await factory.getAllFunds();
  listDiv.innerHTML = "";

  for (let addr of addrs) {
    const fund = new ethers.Contract(addr, fundAbi, provider);

    const name = await fund.name();
    const value = ethers.utils.formatEther(await fund.totalFund());
    const slots = await fund.slots();
    const owner = await fund.owner();

    listDiv.innerHTML += `
      <div style="border:1px solid #ccc;padding:10px;margin:10px;">
        <b>${name}</b><br>
        Giá trị: ${value} ETH<br>
        Số suất: ${slots}<br>
        Chủ quỹ: ${owner}<br><br>
        <button onclick="window.location.href='fund.html?address=${addr}'">
          Xem quỹ
        </button>
      </div>
    `;
  }
}
