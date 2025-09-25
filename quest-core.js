export const QUEST_DEFINITIONS = Object.freeze([
  {
    id: 'starterPackPurchase',
    title: '초보자 패키지 구매',
    description: '상점에서 초보자 패키지를 1회 구매하세요.',
    rewardLabel: '다이아 20 (우편 지급)',
    delivery: 'mail',
    mail: {
      title: '퀘스트 보상 — 초보자 패키지',
      message: '첫 구매 축하드려요! 초보자 패키지를 구매해 주셔서 감사보상으로 다이아 20개를 우편으로 보냈어요.',
      rewards: { diamonds: 20 }
    }
  },
  {
    id: 'firstBattleWin',
    title: '첫 전투 승리',
    description: '전투에서 첫 승리를 거두세요.',
    rewardLabel: '다이아 10',
    delivery: 'instant',
    rewards: { diamonds: 10 }
  },
  {
    id: 'slayLevel100',
    title: 'Lv.100 처치',
    description: 'Lv.100 이상의 몬스터를 1회 처치하세요.',
    rewardLabel: '다이아 70',
    delivery: 'instant',
    rewards: { diamonds: 70 }
  }
]);

export const QUEST_LOOKUP = Object.freeze(
  Object.fromEntries(QUEST_DEFINITIONS.map((quest) => [quest.id, quest]))
);

export function createDefaultQuestState() {
  const statuses = {};
  QUEST_DEFINITIONS.forEach((quest) => {
    statuses[quest.id] = {
      completed: false,
      rewardGranted: false,
      completedAt: null,
      rewardAt: null
    };
  });
  return {
    seenIntro: false,
    statuses
  };
}

export function sanitizeQuestState(raw) {
  const base = createDefaultQuestState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  base.seenIntro = !!raw.seenIntro;
  const incoming = raw.statuses && typeof raw.statuses === 'object' ? raw.statuses : {};
  QUEST_DEFINITIONS.forEach((quest) => {
    const entry = incoming[quest.id];
    if (entry && typeof entry === 'object') {
      base.statuses[quest.id] = {
        completed: !!entry.completed,
        rewardGranted: !!entry.rewardGranted,
        completedAt: typeof entry.completedAt === 'number' ? entry.completedAt : null,
        rewardAt: typeof entry.rewardAt === 'number' ? entry.rewardAt : null
      };
    }
  });
  return base;
}

export function questRewardSummary(quest) {
  if (!quest) return '';
  if (quest.delivery === 'mail') {
    return quest.rewardLabel || '보상 지급';
  }
  const rewards = quest.rewards || {};
  const parts = [];
  if (rewards.diamonds) parts.push(`다이아 ${formatNumber(rewards.diamonds)}`);
  if (rewards.gold) parts.push(`골드 ${formatNumber(rewards.gold)}`);
  if (rewards.points) parts.push(`포인트 ${formatNumber(rewards.points)}`);
  return parts.length ? parts.join(', ') : quest.rewardLabel || '보상 지급';
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '0');
  return num.toLocaleString('ko-KR');
}
