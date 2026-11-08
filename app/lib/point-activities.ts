export const raffles = [
  { id: 'weekend', name: '週末超商好禮', points: 100, status: '開放中' },
  { id: 'new-item', name: '新品嚐鮮抽獎', points: 150, status: '開放中' },
  { id: 'grand-prize', name: '超商人氣大獎', points: 300, status: '開放中' },
] as const;

export const pointRewards = [
  { id: 'drink-reward', name: '飲品兌換申請', points: 50, description: '兌換一份指定超商飲品' },
  { id: 'snack-reward', name: '點心兌換申請', points: 100, description: '兌換一份指定超商點心' },
  { id: 'meal-reward', name: '餐食兌換申請', points: 250, description: '兌換一份指定超商餐食' },
] as const;