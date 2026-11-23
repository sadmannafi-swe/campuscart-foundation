import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@shared/types";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";

export type BuyerProfile = Profile & { student_id: string | null };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: BuyerProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const rawUser = session.data?.user;
  const user: AuthUser | null = rawUser
    ? {
        id: rawUser.id,
        email: rawUser.email,
        name: rawUser.name,
        emailVerified: rawUser.emailVerified,
      }
    : null;

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => api<BuyerProfile>("/me"),
    staleTime: 60_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: profileQuery.data ?? null,
      loading: session.isPending,
      refreshProfile: async () => {
        // Profile edits touch the user, the seller account and public store data.
        await Promise.all([queryClient.invalidateQueries(), session.refetch()]);
      },
      signOut: async () => {
        await authClient.signOut();
        queryClient.clear();
        await session.refetch();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.email, user?.name, profileQuery.data, session.isPending],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
