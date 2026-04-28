import { useAuthStore, selectIsAuthenticated, selectUserId } from '../store/authStore';
import type { UserProfile } from '../types';

/**
 * Lightweight hook for components that only need to read session state
 * without triggering auth side-effects. Use `useAuth` when you need
 * signIn / signOut / signUp actions.
 */
export function useSession(): {
  isAuthenticated: boolean;
  userId: string | undefined;
  profile: UserProfile | null;
  isInitialized: boolean;
} {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const userId = useAuthStore(selectUserId);
  const profile = useAuthStore((s) => s.profile);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return { isAuthenticated, userId, profile, isInitialized };
}
