"use client";

import { motion, type Variants, type HTMLMotionProps } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

const bounceItemVariants: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "backOut" } },
};

/** Fades + slides its children up as a scroll-triggered stagger group (replaces useScrollFade). */
export function RevealGroup({
  stagger = 0.1,
  amount = 0.2,
  className,
  style,
  children,
  ...rest
}: { stagger?: number; amount?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A single fade-up item — use inside a <RevealGroup> (or standalone with its own whileInView). */
export function RevealItem({
  bounce,
  standalone,
  amount = 0.2,
  className,
  style,
  children,
  ...rest
}: { bounce?: boolean; standalone?: boolean; amount?: number } & HTMLMotionProps<"div">) {
  const variants = bounce ? bounceItemVariants : itemVariants;
  return standalone ? (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </motion.div>
  ) : (
    <motion.div className={className} style={style} variants={variants} {...rest}>
      {children}
    </motion.div>
  );
}
