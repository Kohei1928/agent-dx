import { prisma } from "./prisma";

/**
 * 求職者データへのアクセス権限を確認
 * 自分が作成したデータのみアクセス可能
 */
export async function canAccessJobSeeker(
  jobSeekerId: string,
  userIdOrEmail?: string | null
): Promise<boolean> {
  if (!userIdOrEmail) return false;
  
  // userIdOrEmailがemailの場合はユーザーを検索してからuserIdを取得
  let userId = userIdOrEmail;
  if (userIdOrEmail.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: userIdOrEmail },
      select: { id: true },
    });
    if (!user) return false;
    userId = user.id;
  }
  
  const jobSeeker = await prisma.jobSeeker.findFirst({
    where: {
      id: jobSeekerId,
      userId: userId,
    },
  });

  return !!jobSeeker;
}

/**
 * 複数の求職者IDに対するアクセス権限を確認
 * 全てのIDがアクセス可能な場合のみtrueを返す
 */
export async function canAccessJobSeekers(
  jobSeekerIds: string[],
  userIdOrEmail?: string | null
): Promise<boolean> {
  if (!userIdOrEmail || jobSeekerIds.length === 0) return false;

  // userIdOrEmailがemailの場合はユーザーを検索してからuserIdを取得
  let userId = userIdOrEmail;
  if (userIdOrEmail.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: userIdOrEmail },
      select: { id: true },
    });
    if (!user) return false;
    userId = user.id;
  }

  const count = await prisma.jobSeeker.count({
    where: {
      id: { in: jobSeekerIds },
      userId: userId,
    },
  });

  return count === jobSeekerIds.length;
}

/**
 * ユーザーが許可されたドメインかチェック
 */
export function isAllowedDomain(email?: string | null): boolean {
  if (!email) return false;
  return email.endsWith("@migi-nanameue.co.jp");
}




