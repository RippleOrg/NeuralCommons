import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { ProposalCard } from './ProposalCard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  createProposalOnChain,
  fetchGovernanceState,
  voteOnProposalOnChain,
} from '../../lib/contracts/service';
import { useUIStore } from '../../store/uiStore';
import { useWallet } from '../../hooks/useWallet';
import type { Proposal, ProposalType } from '../../types/governance';

export const DataDAOPanel: React.FC = () => {
  const uiStore = useUIStore();
  const { address } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votedProposals, setVotedProposals] = useState<Set<string>>(new Set());
  const [isMember, setIsMember] = useState(false);
  const [memberScore, setMemberScore] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<ProposalType>('MODEL_UPDATE');
  const [newCID, setNewCID] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshGovernance = useCallback(async () => {
    setSyncing(true);
    try {
      const state = await fetchGovernanceState(address as `0x${string}` | undefined);
      setProposals(state.proposals);
      setVotedProposals(state.voted);
      setIsMember(state.isMember);
      setMemberScore(state.memberScore);
    } finally {
      setSyncing(false);
    }
  }, [address]);

  useEffect(() => {
    void refreshGovernance();
  }, [refreshGovernance]);

  const handleVote = async (proposalId: string, support: boolean) => {
    try {
      await voteOnProposalOnChain(proposalId, support);
      await refreshGovernance();
      uiStore.addToast(`Vote ${support ? 'for' : 'against'} recorded`, 'success');
    } catch (error) {
      uiStore.addToast(`Vote failed: ${String(error)}`, 'error');
    }
  };

  const handleCreateProposal = async () => {
    if (!newDesc.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await createProposalOnChain(newDesc.trim(), newCID.trim(), newType);
      await refreshGovernance();

      setShowNewProposal(false);
      setNewDesc('');
      setNewCID('');

      uiStore.logActivity({
        title: 'Proposal created',
        message: `${newType} proposal submitted to DataDAO onchain governance.`,
        tone: 'info',
      });
      uiStore.addToast('Proposal created', 'success');
    } catch (error) {
      uiStore.addToast(`Proposal creation failed: ${String(error)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeProposals = useMemo(
    () => proposals.filter((proposal) => !proposal.executed && proposal.deadline > Date.now()),
    [proposals]
  );
  const closedProposals = useMemo(
    () => proposals.filter((proposal) => proposal.executed || proposal.deadline <= Date.now()),
    [proposals]
  );

  return (
    <div className="page-grid">
      <section className="section-head">
        <div>
          <h2 className="page-title">DataDAO Governance</h2>
          <p className="page-subtitle">
            Submit proposals and cast votes directly against the DataDAO contract on Ethereum Sepolia.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNewProposal(true)} disabled={!address || !isMember || syncing}>
          <Plus size={12} />
          New Proposal
        </Button>
      </section>

      <section className="two-col">
        <div className="column-stack">
          <div className="section-label">Active Proposals ({activeProposals.length})</div>
          {activeProposals.length === 0 ? (
            <div className="card empty-card">
              <p>No active proposals yet. Draft one from the console to start governance.</p>
            </div>
          ) : (
            activeProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onVote={handleVote}
                hasVoted={votedProposals.has(proposal.id)}
              />
            ))
          )}
        </div>

        <div className="column-stack">
          <div className="card">
            <div className="card-header">
              <div className="card-title">DAO Stats</div>
            </div>
            <div className="stack-sm">
              <div className="metric-row">
                  <span>Onchain proposals</span>
                <strong>{proposals.length}</strong>
              </div>
              <div className="metric-row">
                  <span>Membership</span>
                  <strong>{isMember ? 'active' : 'missing'}</strong>
              </div>
              <div className="metric-row">
                  <span>Contribution score</span>
                  <strong>{memberScore}</strong>
                </div>
                <div className="metric-row">
                  <span>Voting wallet</span>
                <strong>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'not connected'}</strong>
              </div>
            </div>
          </div>

          <div className="section-label">Closed Proposals ({closedProposals.length})</div>
          {closedProposals.length === 0 ? (
            <div className="card empty-card">
              <p>Closed proposals will appear here after the voting window ends.</p>
            </div>
          ) : (
            closedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onVote={handleVote}
                hasVoted
              />
            ))
          )}
        </div>
      </section>

      <Modal isOpen={showNewProposal} onClose={() => setShowNewProposal(false)} title="New Proposal">
        <div className="stack-sm">
          <label className="form-label" htmlFor="proposal-type">
            PROPOSAL TYPE
          </label>
          <select
            id="proposal-type"
            className="form-input"
            value={newType}
            onChange={(event) => setNewType(event.target.value as ProposalType)}
          >
            <option value="MODEL_UPDATE">Model Update</option>
            <option value="PRIVACY_BUDGET_CHANGE">Privacy Budget Change</option>
            <option value="GRANTEE_WHITELIST">Grantee Whitelist</option>
            <option value="BOUNTY_ALLOCATION">Bounty Allocation</option>
          </select>

          <label className="form-label" htmlFor="proposal-desc">
            DESCRIPTION
          </label>
          <textarea
            id="proposal-desc"
            className="form-input"
            rows={5}
            value={newDesc}
            onChange={(event) => setNewDesc(event.target.value)}
          />

          <label className="form-label" htmlFor="proposal-cid">
            CID / REFERENCE
          </label>
          <input
            id="proposal-cid"
            className="form-input"
            value={newCID}
            onChange={(event) => setNewCID(event.target.value)}
          />

          <Button variant="primary" onClick={handleCreateProposal}>
            {submitting ? 'Submitting...' : 'Create Proposal'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
