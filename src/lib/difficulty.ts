import type { Task } from '@db/schema';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

const MULTIPLIERS: Record<Difficulty, number> = { easy: 0.5, normal: 1, hard: 2 };

/** Returns pointValue adjusted by difficulty multiplier, rounded to nearest int. */
export function effectivePoints(task: Task): number {
  const d = (task.difficulty ?? 'normal') as Difficulty;
  return Math.round(task.pointValue * (MULTIPLIERS[d] ?? 1));
}
