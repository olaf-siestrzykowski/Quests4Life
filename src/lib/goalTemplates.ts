import type { ScheduleRule } from '@lib/recurrence';

export interface GoalTemplate {
  id: string;
  label: string;
  emoji: string;
  goal: {
    title: string;
    description: string;
    bonusPoints: number;
    rule: ScheduleRule;
  };
  tasks: {
    title: string;
    pointValue: number;
    rule: ScheduleRule;
  }[];
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'morning_routine',
    label: 'Morning Routine',
    emoji: '🌅',
    goal: {
      title: 'Morning Routine',
      description: 'Start each day with intention',
      bonusPoints: 50,
      rule: { type: 'daily', startDate: today() },
    },
    tasks: [
      { title: 'Wake up on time', pointValue: 10, rule: { type: 'daily', startDate: today() } },
      { title: 'Drink a glass of water', pointValue: 5, rule: { type: 'daily', startDate: today() } },
      { title: 'Exercise / stretch', pointValue: 15, rule: { type: 'daily', startDate: today() } },
    ],
  },
  {
    id: 'weekly_fitness',
    label: 'Weekly Fitness',
    emoji: '💪',
    goal: {
      title: 'Weekly Fitness',
      description: 'Stay active this week',
      bonusPoints: 100,
      rule: { type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], startDate: today() },
    },
    tasks: [
      { title: 'Cardio workout', pointValue: 25, rule: { type: 'weekly', daysOfWeek: [1, 3, 5], startDate: today() } },
      { title: 'Strength training', pointValue: 25, rule: { type: 'weekly', daysOfWeek: [2, 4], startDate: today() } },
      { title: 'Track calories / food', pointValue: 10, rule: { type: 'daily', startDate: today() } },
      { title: 'Walk 10,000 steps', pointValue: 15, rule: { type: 'daily', startDate: today() } },
      { title: 'Rest & recover', pointValue: 10, rule: { type: 'weekly', daysOfWeek: [0, 6], startDate: today() } },
    ],
  },
  {
    id: 'read_daily',
    label: 'Read Daily',
    emoji: '📚',
    goal: {
      title: 'Read Daily',
      description: 'Build a reading habit',
      bonusPoints: 30,
      rule: { type: 'daily', startDate: today() },
    },
    tasks: [
      { title: 'Read for 20 minutes', pointValue: 15, rule: { type: 'daily', startDate: today() } },
    ],
  },
  {
    id: 'deep_work',
    label: 'Deep Work',
    emoji: '🧠',
    goal: {
      title: 'Deep Work Week',
      description: 'Focused, high-value work sessions',
      bonusPoints: 200,
      rule: { type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], startDate: today() },
    },
    tasks: [
      { title: '2-hour focus session (no distractions)', pointValue: 50, rule: { type: 'daily', startDate: today() } },
      { title: 'Plan tomorrow the night before', pointValue: 15, rule: { type: 'daily', startDate: today() } },
      { title: 'Inbox zero', pointValue: 10, rule: { type: 'weekly', daysOfWeek: [5], startDate: today() } },
    ],
  },
];
