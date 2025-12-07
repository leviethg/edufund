// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ScholarshipFund.sol";

contract FundFactory {
    address public immutable factoryOwner;
    uint256 public feeBalance;            // phí sàn tích lũy (5% mỗi quỹ)
    address[] public allFunds;
    mapping(address => bool) public isDeleted;

    event FundCreated(
        address indexed fundAddress,
        address indexed creator,
        uint256 fundAmount,              // số tiền dành cho học bổng
        uint8 slots,                     // số suất
        uint256 platformFee              // phí sàn thu được
    );

    constructor() {
        factoryOwner = msg.sender;
    }

    /// @notice Tạo quỹ học bổng mới
    /// @param name Tên quỹ
    /// @param fundAmount Số tiền muốn dành cho quỹ (>= 1000 ETH)
    /// @param slots Số suất học bổng (1..5)
    /// @param description Mô tả thêm (optional – có thể để "")
    function createFund(
        string memory name,
        uint256 fundAmount,
        uint8 slots,
        string memory description
    ) external payable returns (address) {
        require(slots >= 1 && slots <= 5, "Slots must be 1..5");
        require(fundAmount >= 1000 ether, "Min fund is 1000 ETH");

        // Phí sàn 5%
        uint256 platformFee = (fundAmount * 5) / 100;
        uint256 requiredValue = fundAmount + platformFee;
        require(msg.value == requiredValue, "Incorrect ETH sent");

        // Tạo quỹ, forward fundAmount vào quỹ
        ScholarshipFund fund = new ScholarshipFund{value: fundAmount}(
            msg.sender,
            name,
            fundAmount,
            slots,
            description
        );

        address fundAddr = address(fund);
        allFunds.push(fundAddr);

        // Lưu phí trong factory
        feeBalance += platformFee;

        emit FundCreated(fundAddr, msg.sender, fundAmount, slots, platformFee);

        return fundAddr;
    }

    function deleteFund(address payable fundAddr) external {
        require(!isDeleted[fundAddr], "Already deleted");

        ScholarshipFund fund = ScholarshipFund(fundAddr);
        

        // Chỉ chủ quỹ mới được xoá
        require(msg.sender == fund.owner(), "Not fund owner");

        // Chỉ xoá sau khi đã phát thưởng
        require(fund.rewardDistributed(), "Reward not distributed yet");

        isDeleted[fundAddr] = true;
    }


    function getAllFunds() external view returns (address[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < allFunds.length; i++) {
            if (!isDeleted[allFunds[i]]) count++;
        }

        address[] memory active = new address[](count);
        uint256 j = 0;

        for (uint256 i = 0; i < allFunds.length; i++) {
            if (!isDeleted[allFunds[i]]) {
                active[j] = allFunds[i];
                j++;
            }
        }

        return active;
    }


    /// @notice Rút phí sàn về ví chủ factory (tuỳ bạn dùng hay demo)
    function withdrawFees(address payable to) external {
        require(msg.sender == factoryOwner, "Not factory owner");
        uint256 amount = feeBalance;
        require(amount > 0, "No fees");
        feeBalance = 0;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Fee transfer failed");
    }
}
