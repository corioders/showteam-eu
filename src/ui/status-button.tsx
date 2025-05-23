import { cn } from '@/lib/utils.js';
import type { VariantProps, cva } from 'class-variance-authority';
import { AnimatePresence, type AnimationProps, motion } from 'framer-motion';
import type { ComponentProps, ReactNode } from 'react';

interface Props<T extends string> extends Omit<ComponentProps<'button'>, 'children'>, Omit<AnimationProps, 'variants'> {
	status: T;
	children: Record<T, ReactNode>;
	variants: ReturnType<typeof cva<{ status: Record<T, string> }>>;
	contentClassName?: string;
}

/**
 * https://h.corioders.com/cstd-next/status-button
 */
export function StatusButton<T extends string>({ children, status, variants, className, contentClassName, transition, initial, animate, exit, ...props }: Props<T>) {
	return (
		<button className={cn(className, 'relative overflow-hidden', variants({ status: status as VariantProps<Props<T>['variants']>['status'] }))} {...props}>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={status}
					className={cn('inline-flex items-center gap-2', contentClassName)}
					transition={transition ?? { duration: 0.2, type: 'spring', bounce: 0 }}
					initial={initial ?? { opacity: 0, y: -25, filter: 'blur(2px)' }}
					animate={animate ?? { opacity: 1, y: 0, filter: 'blur(0)' }}
					exit={exit ?? { opacity: 0, y: 25, filter: 'blur(2px)' }}
				>
					{children[status]}
				</motion.span>
			</AnimatePresence>
		</button>
	);
}
