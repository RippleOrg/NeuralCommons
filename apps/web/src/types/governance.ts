export type ProposalType =
  | 'MODEL_UPDATE'
  | 'PRIVACY_BUDGET_CHANGE'
  | 'GRANTEE_WHITELIST'
  | 'BOUNTY_ALLOCATION';

export interface Proposal {
  id: string;
  proposer: string;
  description: string;
  ipfsCID: string;
  forVotes: number;
  againstVotes: number;
  deadline: number;
  executed: boolean;
  proposalType: ProposalType;
  createdAt: number;
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: boolean;
  timestamp: number;
}

export interface BountyTask {
  id: string;
  depositor: string;
  amount: bigint;
  description: string;
  dataType: number;
  claimed: boolean;
  contributor: string;
  ipfsProofCID: string;
  approved: boolean;
}
