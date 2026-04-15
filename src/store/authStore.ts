import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,

  // Actions
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  signOut: () =>
    set({
      session: null,
      profile: null,
      isLoading: false,
    }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectIsAuthenticated = (state: AuthStore): boolean =>
  state.session !== null;

export const selectUserId = (state: AuthStore): string | undefined =>
  state.session?.user?.id;

export const selectTrustTier = (state: AuthStore) =>
  state.profile?.trust_tier ?? 'Member';

export const selectKonnectPoints = (state: AuthStore) =>
  state.profile?.konnect_points ?? 0;
