import React from 'react';
import { motion } from 'framer-motion';
import { FederatedDashboard } from '../components/federated/FederatedDashboard';
import { ContributionLeaderboard } from '../components/federated/ContributionLeaderboard';
import { GradientVisualizer } from '../components/federated/GradientVisualizer';
import { Card } from '../components/ui/Card';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const Federated: React.FC = () => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="grid grid-cols-5 gap-4">
        {/* Left: federated dashboard */}
        <div style={{ gridColumn: 'span 3' }}>
          <FederatedDashboard />
          <div className="mt-4">
            <Card>
              <GradientVisualizer />
            </Card>
          </div>
        </div>

        {/* Right: leaderboard */}
        <div style={{ gridColumn: 'span 2' }}>
          <Card>
            <ContributionLeaderboard />
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
