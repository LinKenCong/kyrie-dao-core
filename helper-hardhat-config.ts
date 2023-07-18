export interface networkConfigItem {
  ethUsdPriceFeed?: string;
  blockConfirmations?: number;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  localhost: {},
  hardhat: {},
  sepolia: {
    blockConfirmations: 6,
  },
};

export const developmentChains = ["hardhat", "localhost"];
export const proposalsFile = "proposals.json";

// Governor Values
export const QUORUM_PERCENTAGE = 4; // 需要 4% 的选民通过
export const MIN_DELAY = 3600; // 1 小时 - 投票通过后，您有 1 小时的时间才能颁布
// export const VOTING_PERIOD = 45818 // 45818 区块 - 投票持续多长时间。 即使对于本地测试来说，这也相当长
export const VOTING_PERIOD = 5; // 5 区块 - 投票持续多长时间
export const VOTING_DELAY = 1; // 1 区块 - 提案投票生效之前需要多少个区块
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

// Test Contract Data
export const NEW_STORE_VALUE = 77;
export const FUNC = "store";
export const PROPOSAL_DESCRIPTION = "Proposal #1 77 in the Box!";
