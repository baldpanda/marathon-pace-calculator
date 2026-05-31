import { MARATHON_KM } from './pace';

export type DistanceKey = '5K' | '10K' | 'Half' | 'Marathon';

export const DISTANCES: Record<DistanceKey, number> = {
  '5K': 5,
  '10K': 10,
  Half: 21.0975,
  Marathon: MARATHON_KM,
};

export const DEFAULT_DISTANCE: DistanceKey = 'Marathon';

export const DISTANCE_KEYS: readonly DistanceKey[] = ['5K', '10K', 'Half', 'Marathon'];
