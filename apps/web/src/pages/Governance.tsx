import React from 'react';
import { motion } from 'framer-motion';
import { DataDAOPanel } from '../components/governance/DataDAOPanel';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const Governance: React.FC = () => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <DataDAOPanel />
    </motion.div>
  );
};
