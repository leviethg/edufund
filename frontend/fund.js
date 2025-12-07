console.log("fund.js loaded!");

// ===== Lấy địa chỉ quỹ từ URL =====
const urlParams = new URLSearchParams(window.location.search);
const fundAddress = urlParams.get("address");

if (!fundAddress) {
    alert("URL thiếu ?address=...");
    throw new Error("Missing fund address");
}

// ===== ĐỊA CHỈ FACTORY =====
const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";  // giống index.js và factory.js

// ===== ABI FACTORY =====
const factoryAbi = [
    "function deleteFund(address fundAddr)",
    "function isDeleted(address fundAddr) view returns (bool)"
];

// ===== ABI FUND =====
const fundAbi = [
    "function name() view returns (string)",
    "function description() view returns (string)",
    "function owner() view returns (address)",
    "function totalFund() view returns (uint256)",
    "function slots() view returns (uint8)",
    "function rewardDistributed() view returns (bool)",

    "function submitApplication(string name,uint256 gpa,string link)",
    "function getApplicationCount() view returns (uint256)",
    "function applications(uint256) view returns (string name,uint256 gpa,string link,address applicant,uint256 voteCount,uint256 lastVoteTimestamp)",

    "function vote(uint256 applicantIndex)",
    "function distributeReward()"
];


let provider, signer, fund;

// ===== CONNECT WALLET =====
async function connectWallet() {
    if (!window.ethereum) return alert("MetaMask chưa cài!");

    await ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    fund = new ethers.Contract(fundAddress, fundAbi, signer);

    const addr = await signer.getAddress();
    document.getElementById("status").innerText = "Kết nối: " + addr;

    loadFundInfo();
}

document.getElementById("connectBtn").onclick = connectWallet;


// ===== LOAD FUND INFO =====
async function loadFundInfo() {
    const name = await fund.name();
    const desc = await fund.description();
    const creator = await fund.owner();
    const value = await fund.totalFund();
    const slots = await fund.slots();
    const currentAccount = await signer.getAddress();

    document.getElementById("fundName").innerText = name;
    document.getElementById("fundDesc").innerText = desc;
    document.getElementById("fundValue").innerText = ethers.utils.formatEther(value) + " ETH";
    document.getElementById("fundSlots").innerText = slots;
    document.getElementById("fundOwner").innerText = creator;

    if (currentAccount.toLowerCase() === creator.toLowerCase()) {
        document.getElementById("deleteFundBtn").style.display = "inline-block";
    }
    
}


// ===== SUBMIT APPLICATION =====
document.getElementById("submitBtn").onclick = async function () {
    const name = document.getElementById("name").value.trim();
    const gpa = parseFloat(document.getElementById("gpa").value);
    const link = document.getElementById("link").value.trim();

    if (!name || !gpa || !link) return alert("Điền đầy đủ!");

    const gInt = Math.round(gpa * 10);

    const tx = await fund.submitApplication(name, gInt, link);
    await tx.wait();

    alert("Nộp hồ sơ thành công!");
};


// ===== LOAD APPLICANTS =====
document.getElementById("loadBtn").onclick = async function () {
    const count = await fund.getApplicationCount();
    const tbody = document.getElementById("tBody");
    tbody.innerHTML = "";

    let arr = [];

    for (let i = 0; i < count; i++) {
        const app = await fund.applications(i);

        arr.push({
            id: i,
            name: app.name,
            gpa: Number(app.gpa.toString()) / 10,
            link: app.link,
            votes: Number(app.voteCount),
            ts: Number(app.lastVoteTimestamp)
        });
    }

    // Sort theo vote DESC, rồi timestamp ASC, rồi id ASC
    arr.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.ts !== b.ts) return a.ts - b.ts;
        return a.id - b.id;
    });

    arr.forEach((a, rank) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${rank + 1}</td>
            <td>#${a.id}</td>
            <td>${a.name}</td>
            <td>${a.gpa}</td>
            <td><a href="${a.link}" target="_blank">Link</a></td>
            <td>${a.votes}</td>
        `;
        tbody.appendChild(row);
    });
};


// ===== VOTE =====
document.getElementById("voteBtn").onclick = async function () {
    const idx = parseInt(document.getElementById("voteIndex").value);
    if (isNaN(idx)) return alert("ID sai!");

    const tx = await fund.vote(idx);
    await tx.wait();

    alert("Vote thành công!");
};


// ===== DISTRIBUTE =====
document.getElementById("rewardBtn").onclick = async function () {
    const tx = await fund.distributeReward();
    await tx.wait();

    alert("Đã phát thưởng!");
};

// ===== DELETE FUND =====
document.getElementById("deleteFundBtn").onclick = async function () {
    // Tạo object factory contract
    const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);

    // Kiểm tra đã phát thưởng chưa
    const distributed = await fund.rewardDistributed();
    if (!distributed) {
        return alert("Chưa phát thưởng — không thể xóa quỹ!");
    }

    try {
        const tx = await factory.deleteFund(fundAddress);
        await tx.wait();

        alert("Đã xóa quỹ thành công!");

        // Quay lại trang chủ
        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        alert("Không thể xóa quỹ!");
    }
};
