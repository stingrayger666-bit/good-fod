import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/app/lib/prisma';
import type { PointRedemption, RaffleEntry, Review, User } from '@/app/lib/types';

type StoredUser = User & {
  passwordHash: string;
  passwordSalt: string;
};

type AnonymousVisitor = {
  id: string;
  ipHash: string;
  name: string;
  redraws: number;
  used: boolean;
  createdAt: string;
  expiresAt: string;
};

type Database = {
  reviewScaleVersion?: number;
  inviteCodeVersion?: number;
  experienceVersion?: number;
  anonymousVersion?: number;
  dailyRankingDate?: string;
  users: StoredUser[];
  reviews: Review[];
  raffleEntries?: RaffleEntry[];
  redemptions?: PointRedemption[];
  anonymousVisitors?: AnonymousVisitor[];
  nextMemberNumber?: number;
};

const anonymousAdjectives = [
  '微光', '清爽', '悠然', '溫柔', '明亮', '安靜', '甜甜', '閃亮', '自在', '柔軟',
  '晴朗', '可愛', '俐落', '香香', '亮晶晶', '慢慢', '暖暖', '清新', '愉快', '輕快',
  '圓圓', '薄荷', '焦糖', '奶油', '午後', '晨間', '星光', '月光', '透明', '元氣',
];
const anonymousNouns = [
  '奶茶', '珍珠', '咖啡', '布丁', '泡芙', '風鈴', '鬆餅', '飯糰', '茶凍', '蛋糕',
  '可樂', '果凍', '吐司', '米果', '檸檬', '蘇打', '棉花糖', '糖果', '冰淇淋', '豆花',
  '吸管', '紙盒', '玻璃杯', '餐盒', '小湯匙', '三明治', '拿鐵', '果汁', '麻糬', '銅鑼燒',
  '蛋塔', '餅乾', '海苔', '玉米', '蘋果', '橘子', '鳳梨', '可頌', '鬆餅', '雪花冰',
];

const dataDirectory = path.join(process.cwd(), '.data');
const dataFile = path.join(dataDirectory, 'snackrank.json');
let writeQueue: Promise<void> = Promise.resolve();

function getLevelFromExperience(experience: number) {
  if (experience <= 10) return '新手級';
  if (experience <= 50) return '木牌級';
  if (experience <= 200) return '黃銅級';
  if (experience <= 500) return '黑鐵級';
  if (experience <= 1000) return '白銀級';
  if (experience <= 2500) return '黃金級';
  if (experience <= 5000) return '白金級';
  return '鑽石級';
}

function getTaiwanDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function readDatabase(): Promise<Database> {
  try {
    return JSON.parse(await readFile(dataFile, 'utf8')) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: [], reviews: [] };
    }

    throw error;
  }
}

function createAnonymousName(database: Database, excludedVisitorId?: string, previousName?: string) {
  const now = Date.now();
  const existingNames = new Set(
    (database.anonymousVisitors ?? [])
      .filter((visitor) =>
        visitor.id !== excludedVisitorId &&
        (visitor.used || new Date(visitor.expiresAt).getTime() > now),
      )
      .map((visitor) => visitor.name),
  );
  if (previousName) existingNames.add(previousName);

  const availableNames: string[] = [];
  for (const adjective of anonymousAdjectives) {
    for (const noun of anonymousNouns) {
      const name = `${adjective}的${noun}`;
      if (!existingNames.has(name)) availableNames.push(name);
    }
  }

  if (availableNames.length === 0) {
    throw new Error('目前沒有可用的匿名名稱，請稍後再試。');
  }

  return availableNames[randomInt(availableNames.length)];
}

function toPublicAnonymousVisitor(visitor: AnonymousVisitor) {
  return {
    id: visitor.id,
    name: visitor.name,
    redraws: visitor.redraws,
    redrawsRemaining: 10 - visitor.redraws,
    expiresAt: visitor.expiresAt,
  };
}

async function updateDatabase<T>(update: (database: Database) => T): Promise<T> {
  let release: () => void = () => {};
  const previousWrite = writeQueue;
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previousWrite;

  try {
    const database = await readDatabase();
    migrateDatabase(database);
    const result = update(database);
    await mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${dataFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(database, null, 2), 'utf8');
    await rename(temporaryFile, dataFile);
    return result;
  } finally {
    release();
  }
}

function toPublicUser(user: StoredUser): User {
  const { passwordHash: _passwordHash, passwordSalt: _passwordSalt, ...publicUser } = user;
  return publicUser;
}

function toPublicUserFromPrisma(user: {
  id: string;
  name: string;
  email: string;
  inviteCode: string;
  memberNumber: number;
  points: number;
  level: string;
  experience: number;
  dailyExperience: number;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    inviteCode: user.inviteCode,
    memberNumber: user.memberNumber,
    points: user.points,
    level: user.level,
    experience: user.experience,
    dailyExperience: user.dailyExperience,
    createdAt: user.createdAt.toISOString(),
  } satisfies User;
}

function toReviewFromPrisma(review: {
  id: string;
  userId: string | null;
  userName: string;
  isAnonymous: boolean;
  product: string;
  category: string | null;
  store: string;
  rating: number;
  content: string;
  imageUrl: string | null;
  imageUrls: string | null;
  createdAt: Date;
}): Review {
  return {
    id: review.id,
    userId: review.userId ?? '',
    userName: review.userName,
    isAnonymous: review.isAnonymous,
    product: review.product,
    category: review.category ?? undefined,
    store: review.store,
    rating: review.rating,
    content: review.content,
    imageUrl: review.imageUrl ?? undefined,
    imageUrls: review.imageUrls ? review.imageUrls.split('|') : undefined,
    createdAt: review.createdAt.toISOString(),
  };
}

function createInviteCode(database: Database) {
  const existingCodes = new Set(database.users.map((user) => user.inviteCode).filter(Boolean));
  let inviteCode = '';
  do {
    inviteCode = randomBytes(5).toString('hex').toUpperCase();
  } while (existingCodes.has(inviteCode));
  return inviteCode;
}

async function ensureDatabaseMigrations() {
  const database = await readDatabase();
  if (
    database.reviewScaleVersion !== 2 ||
    database.inviteCodeVersion !== 1 ||
    database.experienceVersion !== 1 ||
    database.anonymousVersion !== 2 ||
    database.dailyRankingDate !== getTaiwanDateKey() ||
    !Array.isArray(database.anonymousVisitors) ||
    database.anonymousVisitors.some((visitor) =>
      !visitor.id || typeof visitor.used !== 'boolean' || !visitor.expiresAt,
    ) ||
    !Number.isInteger(database.nextMemberNumber) ||
    database.users.some((user) =>
      !user.inviteCode ||
      !Number.isInteger(user.memberNumber) ||
      typeof user.experience !== 'number' ||
      typeof user.dailyExperience !== 'number',
    )
  ) {
    await updateDatabase(() => undefined);
  }
}

export async function createUser({
  name,
  email,
  password,
  inviteCode,
}: {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
}) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return { error: 'email_exists' as const };
      }

      const inviter = inviteCode
        ? await prisma.user.findUnique({ where: { inviteCode } })
        : null;
      if (inviteCode && !inviter) {
        return { error: 'invalid_invite_code' as const };
      }

      const nextNumber = (await prisma.user.findFirst({ orderBy: { memberNumber: 'desc' } }))?.memberNumber ?? 0;
      const passwordSalt = randomBytes(16).toString('hex');
      const user = await prisma.user.create({
        data: {
          name,
          email,
          inviteCode: randomBytes(5).toString('hex').toUpperCase(),
          memberNumber: nextNumber + 1,
          passwordSalt,
          passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
          points: 100,
          experience: 0,
          dailyExperience: 0,
          level: getLevelFromExperience(0),
        },
      });

      if (inviter) {
        await prisma.user.update({
          where: { id: inviter.id },
          data: { points: { increment: 20 } },
        });
      }

      return {
        user: toPublicUserFromPrisma(user),
        inviterRewarded: Boolean(inviter),
      };
    } catch {
      // fall through to legacy JSON store if Prisma fails
    }
  }

  return updateDatabase((database) => {
    if (database.users.some((user) => user.email === email)) {
      return { error: 'email_exists' as const };
    }

    const inviter = inviteCode
      ? database.users.find((user) => user.inviteCode === inviteCode)
      : undefined;
    if (inviteCode && !inviter) {
      return { error: 'invalid_invite_code' as const };
    }

    const memberNumber = database.nextMemberNumber ?? 1;
    database.nextMemberNumber = memberNumber + 1;
    const passwordSalt = randomBytes(16).toString('hex');
    const user: StoredUser = {
      id: randomUUID(),
      name,
      email,
      inviteCode: createInviteCode(database),
      memberNumber,
      passwordSalt,
      passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
      points: 100,
      experience: 0,
      dailyExperience: 0,
      level: getLevelFromExperience(0),
      createdAt: new Date().toISOString(),
    };

    database.users.unshift(user);
    if (inviter) {
      inviter.points += 20;
      inviter.level = getLevelFromExperience(inviter.experience);
    }

    return { user: toPublicUser(user), inviterRewarded: Boolean(inviter) };
  });
}

export async function authenticateUser(email: string, password: string) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        scryptSync(password, 'snackrank-invalid-user-salt', 64);
        return null;
      }

      const suppliedHash = scryptSync(password, user.passwordSalt, 64);
      const storedHash = Buffer.from(user.passwordHash, 'hex');
      if (suppliedHash.length !== storedHash.length || !timingSafeEqual(suppliedHash, storedHash)) {
        return null;
      }

      return toPublicUserFromPrisma(user);
    } catch {
      // fallback to legacy JSON
    }
  }

  await ensureDatabaseMigrations();
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === email);

  if (!user) {
    scryptSync(password, 'snackrank-invalid-user-salt', 64);
    return null;
  }

  const suppliedHash = scryptSync(password, user.passwordSalt, 64);
  const storedHash = Buffer.from(user.passwordHash, 'hex');

  if (suppliedHash.length !== storedHash.length || !timingSafeEqual(suppliedHash, storedHash)) {
    return null;
  }

  return toPublicUser(user);
}

export async function getUserById(userId: string) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user ? toPublicUserFromPrisma(user) : null;
    } catch {
      // fallback to legacy JSON
    }
  }

  await ensureDatabaseMigrations();
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);
  return user ? toPublicUser(user) : null;
}

export async function createAnonymousReservation(ipHash: string) {
  return updateDatabase((database) => {
    const now = Date.now();
    const visitors = (database.anonymousVisitors ?? []).filter(
      (visitor) => visitor.used || new Date(visitor.expiresAt).getTime() > now,
    );

    const visitor: AnonymousVisitor = {
      id: randomUUID(),
      ipHash,
      name: createAnonymousName(database),
      redraws: 0,
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + 30 * 60 * 1000).toISOString(),
    };
    database.anonymousVisitors = [...visitors, visitor];
    return toPublicAnonymousVisitor(visitor);
  });
}

export async function redrawAnonymousName(ipHash: string, reservationId: string) {
  return updateDatabase((database) => {
    const visitors = database.anonymousVisitors ?? [];
    const visitor = visitors.find((item) => item.id === reservationId && item.ipHash === ipHash);
    if (!visitor || visitor.used || new Date(visitor.expiresAt).getTime() <= Date.now()) {
      return { error: 'reservation_expired' as const };
    }

    if (visitor.redraws >= 10) return { error: 'redraw_limit' as const };

    visitor.name = createAnonymousName(database, reservationId, visitor.name);
    visitor.redraws += 1;
    database.anonymousVisitors = visitors;
    return { identity: toPublicAnonymousVisitor(visitor) };
  });
}

export async function getReviews() {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const reviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return reviews.map(toReviewFromPrisma);
    } catch {
      // fallback to legacy JSON
    }
  }

  await ensureDatabaseMigrations();
  const database = await readDatabase();
  return database.reviews.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getDailyLeaderboard() {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const users = await prisma.user.findMany({
        where: { dailyExperience: { gt: 0 } },
        orderBy: [{ dailyExperience: 'desc' }, { createdAt: 'asc' }],
        take: 100,
      });
      return {
        date: getTaiwanDateKey(),
        users: users.map(toPublicUserFromPrisma),
      };
    } catch {
      // fallback to legacy JSON
    }
  }

  await ensureDatabaseMigrations();
  const database = await readDatabase();
  const users = [...database.users]
    .filter((user) => user.dailyExperience > 0)
    .sort((left, right) =>
      right.dailyExperience - left.dailyExperience ||
      left.createdAt.localeCompare(right.createdAt),
    )
    .slice(0, 100)
    .map(toPublicUser);

  return { date: database.dailyRankingDate ?? getTaiwanDateKey(), users };
}

export async function getPointActivities(userId: string) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const [raffleEntries, redemptions] = await Promise.all([
        prisma.raffleEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.redemption.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      ]);
      return {
        raffleEntries: raffleEntries.map((entry) => ({
          id: entry.id,
          raffleId: entry.raffleId,
          raffleName: entry.raffleName,
          userId: entry.userId,
          pointsSpent: entry.pointsSpent,
          status: entry.status,
          createdAt: entry.createdAt.toISOString(),
        })),
        redemptions: redemptions.map((entry) => ({
          id: entry.id,
          rewardId: entry.rewardId,
          rewardName: entry.rewardName,
          userId: entry.userId,
          pointsSpent: entry.pointsSpent,
          status: entry.status,
          createdAt: entry.createdAt.toISOString(),
        })),
      };
    } catch {
      // fallback to legacy JSON
    }
  }

  const database = await readDatabase();
  return {
    raffleEntries: (database.raffleEntries ?? []).filter((entry) => entry.userId === userId),
    redemptions: (database.redemptions ?? []).filter((redemption) => redemption.userId === userId),
  };
}

export async function enterRaffleForUser({
  userId,
  raffleId,
  raffleName,
  points,
}: {
  userId: string;
  raffleId: string;
  raffleName: string;
  points: number;
}) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { error: 'user_not_found' as const };
      if (user.points < points) return { error: 'insufficient_points' as const, balance: user.points };

      const [updatedUser, entry] = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: points },
            level: getLevelFromExperience(user.experience),
          },
        });
        const entryData = await tx.raffleEntry.create({
          data: {
            raffleId,
            raffleName,
            userId,
            pointsSpent: points,
            status: '待抽獎',
          },
        });
        return [updated, entryData] as const;
      });

      return {
        entry: {
          id: entry.id,
          raffleId: entry.raffleId,
          raffleName: entry.raffleName,
          userId: entry.userId,
          pointsSpent: entry.pointsSpent,
          status: entry.status,
          createdAt: entry.createdAt.toISOString(),
        },
        user: toPublicUserFromPrisma(updatedUser),
      };
    } catch {
      // fallback to legacy JSON
    }
  }

  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return { error: 'user_not_found' as const };
    if (user.points < points) return { error: 'insufficient_points' as const, balance: user.points };

    const entry: RaffleEntry = {
      id: randomUUID(),
      raffleId,
      raffleName,
      userId,
      pointsSpent: points,
      status: '待抽獎',
      createdAt: new Date().toISOString(),
    };
    user.points -= points;
    user.level = getLevelFromExperience(user.experience);
    database.raffleEntries = [...(database.raffleEntries ?? []), entry];

    return { entry, user: toPublicUser(user) };
  });
}

export async function redeemRewardForUser({
  userId,
  rewardId,
  rewardName,
  points,
}: {
  userId: string;
  rewardId: string;
  rewardName: string;
  points: number;
}) {
  if (process.env.DATABASE_URL && process.env.USE_LEGACY_JSON !== 'true') {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { error: 'user_not_found' as const };
      if (user.points < points) return { error: 'insufficient_points' as const, balance: user.points };

      const [updatedUser, redemption] = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: points },
            level: getLevelFromExperience(user.experience),
          },
        });
        const redemptionData = await tx.redemption.create({
          data: {
            rewardId,
            rewardName,
            userId,
            pointsSpent: points,
            status: '待核發',
          },
        });
        return [updated, redemptionData] as const;
      });

      return {
        redemption: {
          id: redemption.id,
          rewardId: redemption.rewardId,
          rewardName: redemption.rewardName,
          userId: redemption.userId,
          pointsSpent: redemption.pointsSpent,
          status: redemption.status,
          createdAt: redemption.createdAt.toISOString(),
        },
        user: toPublicUserFromPrisma(updatedUser),
      };
    } catch {
      // fallback to legacy JSON
    }
  }

  return updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId);
    if (!user) return { error: 'user_not_found' as const };
    if (user.points < points) return { error: 'insufficient_points' as const, balance: user.points };

    const redemption: PointRedemption = {
      id: randomUUID(),
      rewardId,
      rewardName,
      userId,
      pointsSpent: points,
      status: '待核發',
      createdAt: new Date().toISOString(),
    };
    user.points -= points;
    user.level = getLevelFromExperience(user.experience);
    database.redemptions = [...(database.redemptions ?? []), redemption];

    return { redemption, user: toPublicUser(user) };
  });
}

export async function createReviewForUser({
  userId,
  anonymousIdentityId,
  anonymousIpHash,
  product,
  category,
  store,
  rating,
  content,
  imageUrls,
}: {
  userId: string | null;
  anonymousIdentityId?: string;
  anonymousIpHash?: string;
  product: string;
  category: string;
  store: string;
  rating: number;
  content: string;
  imageUrls?: string[];
}) {
  return updateDatabase((database) => {
    const user = userId ? database.users.find((item) => item.id === userId) : undefined;
    const anonymousVisitor = !user && anonymousIdentityId && anonymousIpHash
      ? database.anonymousVisitors?.find((visitor) =>
          visitor.id === anonymousIdentityId &&
          visitor.ipHash === anonymousIpHash &&
          !visitor.used &&
          new Date(visitor.expiresAt).getTime() > Date.now(),
        )
      : undefined;
    if (userId && !user) {
      return { error: 'user_not_found' as const };
    }
    if (!user && !anonymousVisitor) {
      return { error: 'anonymous_reservation_invalid' as const };
    }

    const review: Review = {
      id: randomUUID(),
      userId: user?.id ?? '',
      userName: user?.name ?? anonymousVisitor!.name,
      isAnonymous: !user,
      product,
      category,
      store,
      rating,
      content,
      imageUrl: imageUrls?.[0],
      imageUrls,
      createdAt: new Date().toISOString(),
    };

    if (anonymousVisitor) anonymousVisitor.used = true;
    const imageCount = imageUrls?.length ?? 0;
    const experienceAwarded = user
      ? 1 + (content ? 5 : 0) + (content.length > 20 ? 10 : 0) + imageCount * 5
      : 0;
    database.reviews.unshift(review);
    if (user) {
      user.points += 5 + (content ? 10 : 0) + (imageCount > 0 ? 10 : 0);
      user.experience += experienceAwarded;
      user.dailyExperience += experienceAwarded;
      user.level = getLevelFromExperience(user.experience);
    }

    return { review, user: user ? toPublicUser(user) : null, experienceAwarded };
  });
}

function migrateDatabase(database: Database) {
  if (database.reviewScaleVersion !== 2) {
    if (database.reviewScaleVersion === undefined) {
      database.reviews = database.reviews.map((review) => ({
        ...review,
        rating: review.rating >= 1 && review.rating <= 5 ? review.rating * 20 : review.rating,
      }));
    }

    database.reviewScaleVersion = 2;
  }

  const usersInRegistrationOrder = [...database.users].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  let nextMemberNumber = 1;
  for (const user of usersInRegistrationOrder) {
    if (Number.isInteger(user.memberNumber)) {
      nextMemberNumber = Math.max(nextMemberNumber, user.memberNumber + 1);
    }
  }
  for (const user of usersInRegistrationOrder) {
    if (!Number.isInteger(user.memberNumber)) {
      user.memberNumber = nextMemberNumber;
      nextMemberNumber += 1;
    }
  }
  database.nextMemberNumber = Math.max(database.nextMemberNumber ?? 1, nextMemberNumber);

  for (const user of database.users) {
    if (!user.inviteCode) {
      user.inviteCode = createInviteCode(database);
    }
    user.experience ??= 0;
    user.dailyExperience ??= 0;
    user.level = getLevelFromExperience(user.experience);
  }

  const today = getTaiwanDateKey();
  if (database.dailyRankingDate !== today) {
    for (const user of database.users) {
      user.dailyExperience = 0;
    }
    database.dailyRankingDate = today;
  }

  database.experienceVersion = 1;
  database.inviteCodeVersion = 1;
  database.raffleEntries ??= [];
  database.redemptions ??= [];
  database.anonymousVisitors ??= [];
  if (database.anonymousVersion !== 2) {
    for (const visitor of database.anonymousVisitors) {
      if (!visitor.id) visitor.id = randomUUID();
      visitor.used = true;
      visitor.expiresAt ??= visitor.createdAt ?? new Date(0).toISOString();
    }
    database.anonymousVersion = 2;
  }
}