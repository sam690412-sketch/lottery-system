// ============================================================
// P0-1: URL Alias Router
// /combine/49 → lotto49c
// /combine/39 → daily39c
// ============================================================

import { useParams } from 'react-router';
import CombineLotteryPage from './CombineLotteryPage';
import type { LotteryType } from '@/utils/lotteryConfig';

const ALIAS_MAP: Record<string, LotteryType> = {
  '49': 'lotto49c',
  '39': 'daily39c',
};

export default function CombineAliasRouter() {
  const { lotteryType } = useParams<{ lotteryType: string }>();
  const aliased = ALIAS_MAP[lotteryType || ''] || lotteryType;
  
  // Pass the aliased type as a prop to the page
  return <CombineLotteryPage forcedType={aliased as LotteryType} />;
}
