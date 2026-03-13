import React, { useState } from 'react';
import { ProposalCard } from './ProposalCard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUIStore } from '../../store/uiStore';
import type { Proposal, ProposalType } from '../../types/governance';
import { Plus } from 'lucide-react';

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: '1',
    proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    description: 'Update global model with v2 architecture: larger embedding layer for improved accuracy on frontal lobe signals.',
    ipfsCID: 'QmProposalCID1',
    forVotes: 7,
    againstVotes: 2,
    deadline: Date.now() + 86400000 * 3,
    executed: false,
    proposalType: 'MODEL_UPDATE',
    createdAt: Date.now() - 86400000,
  },
  {
    id: '2',
    proposer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    description: 'Reduce global epsilon from 0.1 to 0.05 to strengthen privacy guarantees across the federation.',
    ipfsCID: 'QmProposalCID2',
    forVotes: 12,
    againstVotes: 1,
    deadline: Date.now() + 86400000 * 5,
    executed: false,
    proposalType: 'PRIVACY_BUDGET_CHANGE',
    createdAt: Date.now() - 43200000,
  },
];

export const DataDAOPanel: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [votedProposals, setVotedProposals] = useState<Set<string>>(new Set());
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<ProposalType>('MODEL_UPDATE');
  const [newCID, setNewCID] = useState('');
  const uiStore = useUIStore();

  const handleVote = async (proposalId: string, support: boolean) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? { ...p, forVotes: support ? p.forVotes + 1 : p.forVotes, againstVotes: !support ? p.againstVotes + 1 : p.againstVotes }
          : p
      )
    );
    setVotedProposals((prev) => new Set([...prev, proposalId]));
    uiStore.addToast(`Vote ${support ? 'for' : 'against'} recorded`, 'success');
  };

  const handleCreateProposal = () => {
    if (!newDesc.trim()) return;
    const newProposal: Proposal = {
      id: String(proposals.length + 1),
      proposer: '0xlocal',
      description: newDesc,
      ipfsCID: newCID || 'QmEmptyCID',
      forVotes: 0,
      againstVotes: 0,
      deadline: Date.now() + 86400000 * 7,
      executed: false,
      proposalType: newType,
      createdAt: Date.now(),
    };
    setProposals((prev) => [newProposal, ...prev]);
    setShowNewProposal(false);
    setNewDesc('');
    setNewCID('');
    uiStore.addToast('Proposal created', 'success');
  };

  const activeProposals = proposals.filter((p) => !p.executed && p.deadline > Date.now());
  const pastProposals = proposals.filter((p) => p.executed || p.deadline <= Date.now());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
          Active Proposals
        </h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowNewProposal(true)}
          aria-label="Create new proposal"
        >
          <Plus size={12} className="mr-1" />
          New Proposal
        </Button>
      </div>

      <div className="space-y-3">
        {activeProposals.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            onVote={handleVote}
            hasVoted={votedProposals.has(p.id)}
          />
        ))}
        {activeProposals.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            No active proposals.
          </p>
        )}
      </div>

      {pastProposals.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, marginTop: '16px' }}>
            Past Proposals
          </h3>
          <div className="space-y-2">
            {pastProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onVote={handleVote} hasVoted />
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showNewProposal} onClose={() => setShowNewProposal(false)} title="New Proposal">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="proposal-type"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}
            >
              PROPOSAL TYPE
            </label>
            <select
              id="proposal-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as ProposalType)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '8px',
                width: '100%',
              }}
            >
              <option value="MODEL_UPDATE">Model Update</option>
              <option value="PRIVACY_BUDGET_CHANGE">Privacy Budget Change</option>
              <option value="GRANTEE_WHITELIST">Grantee Whitelist</option>
              <option value="BOUNTY_ALLOCATION">Bounty Allocation</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="proposal-desc"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}
            >
              DESCRIPTION
            </label>
            <textarea
              id="proposal-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={4}
              placeholder="Describe the proposal..."
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                padding: '8px',
                width: '100%',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="proposal-cid"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}
            >
              IPFS CID (optional)
            </label>
            <input
              id="proposal-cid"
              type="text"
              value={newCID}
              onChange={(e) => setNewCID(e.target.value)}
              placeholder="QmYourProposalDataCID..."
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '8px',
                width: '100%',
              }}
            />
          </div>

          <Button variant="primary" onClick={handleCreateProposal} style={{ width: '100%' }}>
            Create Proposal
          </Button>
        </div>
      </Modal>
    </div>
  );
};
