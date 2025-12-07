// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ScholarshipFund {
    struct Application {
        string name;
        uint256 gpa;              // ví dụ: 3.6 -> lưu 36
        string link;
        address applicant;
        uint256 voteCount;
        uint256 lastVoteTimestamp; // dùng để tie-break: ai đạt mức vote hiện tại trước
    }

    address public immutable owner;       // người tạo quỹ
    string public name;
    string public description;
    uint256 public totalFund;            // tổng ngân sách quỹ
    uint8 public slots;                  // số suất (1..5)
    bool public rewardDistributed;

    Application[] public applications;

    mapping(address => bool) public hasSubmitted;            // mỗi ví chỉ submit 1 lần
    mapping(address => uint8) public votesUsed;              // mỗi ví tối đa 3 vote
    mapping(address => mapping(uint256 => bool)) public hasVotedFor; // ví -> applicantIndex -> đã vote?

    event ApplicationSubmitted(uint256 indexed id, address indexed applicant);
    event Voted(address indexed voter, uint256 indexed applicantId);
    event RewardDistributed(uint256 winnerCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not fund owner");
        _;
    }

    constructor(
        address _owner,
        string memory _name,
        uint256 _totalFund,
        uint8 _slots,
        string memory _description
    ) payable {
        require(_slots >= 1 && _slots <= 5, "Slots must be 1..5");
        require(_totalFund >= 1000 ether, "Min fund is 1000 ETH");
        require(msg.value == _totalFund, "Fund value mismatch");

        owner = _owner;
        name = _name;
        totalFund = _totalFund;
        slots = _slots;
        description = _description;
    }

    // Cho phép nhận thêm ETH (nếu sau này muốn donate thêm)
    receive() external payable {
        totalFund += msg.value;
    }

    function getApplicationCount() external view returns (uint256) {
        return applications.length;
    }

    function submitApplication(
        string memory _name,
        uint256 _gpa,
        string memory _link
    ) external {
        require(!hasSubmitted[msg.sender], "Already submitted");

        uint256 id = applications.length;
        applications.push(
            Application({
                name: _name,
                gpa: _gpa,
                link: _link,
                applicant: msg.sender,
                voteCount: 0,
                lastVoteTimestamp: 0
            })
        );

        hasSubmitted[msg.sender] = true;

        emit ApplicationSubmitted(id, msg.sender);
    }

    /// @notice Mỗi ví có 3 lượt vote cho mỗi quỹ, và không vote 2 lần cho cùng 1 applicant
    function vote(uint256 applicantIndex) external {
        require(applicantIndex < applications.length, "Invalid applicant");
        require(!hasVotedFor[msg.sender][applicantIndex], "Already voted this applicant");
        require(votesUsed[msg.sender] < 3, "No votes left");

        hasVotedFor[msg.sender][applicantIndex] = true;
        votesUsed[msg.sender] += 1;

        Application storage a = applications[applicantIndex];
        a.voteCount += 1;
        a.lastVoteTimestamp = block.timestamp;

        emit Voted(msg.sender, applicantIndex);
    }

    /// @notice Tính chỉ số winner theo thứ tự rank (vote DESC, rồi thời gian đạt vote hiện tại sớm hơn)
    /// Dùng nội bộ trong distributeReward.
    function _isBetter(uint256 i, uint256 best, bool[] memory taken) internal view returns (bool) {
        if (taken[i]) return false;
        if (taken[best]) return true;

        Application storage ai = applications[i];
        Application storage ab = applications[best];

        if (ai.voteCount > ab.voteCount) return true;
        if (ai.voteCount < ab.voteCount) return false;

        // Tie: ai đạt mức vote hiện tại trước thì xếp trước
        // lastVoteTimestamp nhỏ hơn => đạt sớm hơn
        if (ai.lastVoteTimestamp == 0 && ab.lastVoteTimestamp == 0) {
            // chưa ai được vote -> theo id nhỏ hơn (đăng ký trước)
            return i < best;
        }
        if (ai.lastVoteTimestamp == 0) return false;
        if (ab.lastVoteTimestamp == 0) return true;

        if (ai.lastVoteTimestamp < ab.lastVoteTimestamp) return true;
        if (ai.lastVoteTimestamp > ab.lastVoteTimestamp) return false;

        // Nếu timestamp cũng bằng nhau (rất hiếm) -> id nhỏ hơn trước
        return i < best;
    }

    /// @notice Phát thưởng top-k
    /// Chia đều balance hiện tại cho k người thắng (k = slots hoặc ít hơn nếu ít ứng viên hơn).
    function distributeReward() external onlyOwner {
        require(!rewardDistributed, "Already distributed");
        uint256 appCount = applications.length;
        require(appCount > 0, "No applicants");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        uint256 winnerCount = slots;
        if (appCount < winnerCount) {
            winnerCount = appCount;
        }

        bool[] memory taken = new bool[](appCount);
        uint256[] memory winnerIds = new uint256[](winnerCount);

        // Chọn top-k
        for (uint256 w = 0; w < winnerCount; w++) {
            uint256 best = type(uint256).max;

            for (uint256 i = 0; i < appCount; i++) {
                if (taken[i]) continue;
                if (best == type(uint256).max) {
                    best = i;
                    continue;
                }
                if (_isBetter(i, best, taken)) {
                    best = i;
                }
            }

            taken[best] = true;
            winnerIds[w] = best;
        }

        uint256 payoutPerWinner = balance / winnerCount;
        require(payoutPerWinner > 0, "Too little to distribute");

        rewardDistributed = true;

        for (uint256 w = 0; w < winnerCount; w++) {
            address payable to = payable(applications[winnerIds[w]].applicant);
            (bool ok, ) = to.call{value: payoutPerWinner}("");
            require(ok, "Transfer failed");
        }

        emit RewardDistributed(winnerCount);
    }
}
