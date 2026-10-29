"use client";

import { motion } from "motion/react";
import { useEffect } from "react";

// The first page load renders without an entrance so server HTML is never hidden;
// later client navigations fade and rise in (opacity only under reduced motion).
let navigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = navigated;
  useEffect(() => {
    navigated = true;
  }, []);
  return (
    <motion.div initial={animate ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
      {children}
    </motion.div>
  );
}
