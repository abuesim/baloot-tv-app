import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { db } from "./db";
import { getSession } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ============================================================
// مساعدات الصلاحيات
// ============================================================

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "أدمن",
  SUPPORT: "دعم فني",
  CONTENT_CREATOR: "صانع محتوى",
  USER: "مستخدم",
};

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}

/** الأدمن أو الدعم الفني */
export function canSupport(role: UserRole) {
  return role === "ADMIN" || role === "SUPPORT";
}

/** الأدمن أو صانع المحتوى — يقدر يدير إعلاناته الخاصة + اتجاه شاشته */
export function canManageAds(role: UserRole) {
  return role === "ADMIN" || role === "CONTENT_CREATOR";
}

// ============================================================
// المستخدم الحالي + التحقق
// ============================================================

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      active: true,
      tvOrientation: true,
      parentUserId: true,
      subCanManageTournaments: true,
      subCanDelete: true,
    },
  });

  if (!user || !user.active) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/");
  return user;
}

export async function requireSupport() {
  const user = await requireUser();
  if (!canSupport(user.role)) redirect("/");
  return user;
}

export async function requireContentCreator() {
  const user = await requireUser();
  if (!canManageAds(user.role)) redirect("/");
  return user;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
