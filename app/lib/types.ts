export type User = {
  id: string;
  name: string;
  email: string;
  inviteCode: string;
  memberNumber: number;
  points: number;
  level: string;
  experience: number;
  dailyExperience: number;
  createdAt: string;
};

export type Review = {
  id: string;
  userId: string;
  userName: string;
  isAnonymous?: boolean;
  product: string;
  category?: string;
  store: string;
  rating: number;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
};

export type RaffleEntry = {
  id: string;
  raffleId: string;
  raffleName: string;
  userId: string;
  pointsSpent: number;
  status: string;
  createdAt: string;
};

export type PointRedemption = {
  id: string;
  rewardId: string;
  rewardName: string;
  userId: string;
  pointsSpent: number;
  status: string;
  createdAt: string;
};