// ==== CONFIG ====
const fundAddress = "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be";

const fundAbi = [
  "function submitApplication(string name, uint256 gpa, string link) external",
  "function vote(uint256 applicantIndex) external",
  "function distributeReward() external",
  "function applications(uint256) view returns (string name, uint256 gpa, string link, address applicant, uint256 voteCount)"
];

// ==== GLOBAL ====
let provider, signer, fund;

// ==== CONNECT ====
async function connectWallet() {
  await ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer   = provider.getSigner();
  fund     = new ethers.Contract(fundAddress, fundAbi, signer);

  document.getElementById("status").innerText =
    "Connected as " + await signer.getAddress();
}

// ==== SUBMIT ====
async function submitApp() {
  const n = document.getElementById("name").value.trim();
  const gStr = document.getElementById("gpa").value.trim();
  const l = document.getElementById("link").value.trim();

  if (!n || !gStr || !l) return alert("Missing fields");

  const gFloat = parseFloat(gStr);
  if (isNaN(gFloat)) return alert("Invalid GPA");

  const gInt = Math.round(gFloat * 10);

  const tx = await fund.submitApplication(n, gInt, l);
  await tx.wait();
  alert("Submitted!");
  loadApplicants();
}

// ==== LOAD ====
async function loadApplicants() {
  const list = document.getElementById("appList");
  list.innerHTML = "";

  for (let i = 0; i < 50; i++) {
    try {
      const a = await fund.applications(i);
      const gpa = Number(a.gpa.toString()) / 10;

      const li = document.createElement("li");
      li.innerText = `#${i}: ${a.name} – GPA ${gpa} – votes ${a.voteCount}`;
      list.appendChild(li);
    } catch {
      break;
    }
  }
}

// ==== VOTE ====
async function voteFunc() {
  const idx = parseInt(document.getElementById("voteIndex").value);
  if (isNaN(idx)) return alert("Invalid index");

  const tx = await fund.vote(idx);
  await tx.wait();
  alert("Voted!");
  loadApplicants();
}

// ==== DISTRIBUTE ====
async function distribute() {
  const tx = await fund.distributeReward();
  await tx.wait();
  alert("Reward sent!");
}

// Expose functions to DOM
window.connectWallet = connectWallet;
window.submitApp = submitApp;
window.loadApplicants = loadApplicants;
window.voteFunc = voteFunc;
window.distribute = distribute;
