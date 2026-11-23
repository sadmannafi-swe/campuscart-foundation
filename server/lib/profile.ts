import { ObjectId } from "mongodb";
import { col } from "./db";

/** Personal fields a user may edit about themselves. Everything else is fixed or admin-managed. */
export interface PersonalPatch {
  full_name?: string;
  phone?: string;
  department?: string;
  batch?: string;
  /** Private Cloudinary public_id (already checked to be in the user's own avatar folder), or null. */
  avatar_id?: string | null;
}

const userKey = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id);

/**
 * One person, one set of personal details: writes the change to the user record and,
 * when the user also sells, to their seller record, so buyer and seller views agree.
 * Always scoped to `userId` — callers pass the signed-in user's id, never a client value.
 */
export async function savePersonalDetails(userId: string, patch: PersonalPatch): Promise<void> {
  const now = new Date();
  const user: Record<string, unknown> = { updatedAt: now };
  const seller: Record<string, unknown> = { updated_at: now };

  if (patch.full_name !== undefined) {
    user["name"] = patch.full_name;
    seller["full_name"] = patch.full_name;
  }
  if (patch.phone !== undefined) {
    user["phone"] = patch.phone;
    seller["phone"] = patch.phone;
  }
  if (patch.department !== undefined) {
    user["department"] = patch.department;
    seller["department"] = patch.department;
  }
  if (patch.batch !== undefined) {
    user["batch"] = patch.batch;
    seller["batch"] = patch.batch;
  }
  if (patch.avatar_id !== undefined) {
    user["avatarId"] = patch.avatar_id;
    seller["avatar_path"] = patch.avatar_id;
  }

  await Promise.all([
    col.users().updateOne({ _id: userKey(userId) } as never, { $set: user }),
    col.sellers().updateOne({ user_id: userId }, { $set: seller }),
  ]);
}
