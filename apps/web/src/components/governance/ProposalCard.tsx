import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import type { Proposal, ProposalType } from '../../types/governance';

const TYPE_VARIANTS: Record<ProposalType, 'cyan' | 'green' | 'amber' | 'violet'> = {
  MODEL_UPDATE: 'cyan',
  PRIVACY_BUDGET_CHANGE: 'amber',
  GRANTEE_WHITELIST: 'green',
  BOUNTY_ALLOCATION: 'violet',
};

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (proposalId: string, support: boolean) => void;
  hasVoted?: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onVote, hasVoted }) => {
  const [voting, setVoting] = useState(false);
  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPct = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;

  const timeRemaining = () => {
    const ms = proposal.deadline - Date.now();
    if (ms <= 0) return 'Ended';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const handleVote = async (support: boolean) => {
    setVoting(true);
    try {
      await onVote(proposal.id, support);
    } finally {
      setVoting(false);
    }
  };

  const isExpired = proposal.deadline < Date.now();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <div className="flex items-start justify-between mb-3">
          <Badge variant={TYPE_VARIANTS[proposal.proposalType]}>
            {proposal.proposalType.replace(/_/g, ' ')}
          </Badge>
          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
              {timeRemaining()}
            </span>
          </div>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            marginBottom: '12px',
            lineHeight: 1.5,
          }}
        >
          {proposal.description}
        </p>

        <div className="mb-3">
          <ProgressBar
            value={forPct}
            label={`${proposal.forVotes} For / ${proposal.againstVotes} Against`}
            color="var(--neural-green)"
            showValue
          />
        </div>

        {!isExpired && !hasVoted && !proposal.executed && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={voting}
              onClick={() => handleVote(true)}
              aria-label={`Vote for proposal: ${proposal.description}`}
              style={{ flex: 1 }}
            >
              <ChevronUp size={12} className="mr-1" />
              For
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={voting}
              onClick={() => handleVote(false)}
              aria-label={`Vote against proposal: ${proposal.description}`}
              style={{ flex: 1 }}
            >
              <ChevronDown size={12} className="mr-1" />
              Against
            </Button>
          </div>
        )}

        {proposal.executed && (
          <Badge variant={forPct > 50 ? 'green' : 'red'}>
            {forPct > 50 ? 'PASSED' : 'FAILED'}
          </Badge>
        )}
        {hasVoted && !proposal.executed && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Vote recorded
          </p>
        )}
      </Card>
    </motion.div>
  );
};
