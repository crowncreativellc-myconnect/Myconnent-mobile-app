import { useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, db } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserProfile, ApiResult } from '../types';

WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const {
    session,
    profile,
    isLoading,
    isInitialized,
    setSession,
    setProfile,
    setLoading,
    setInitialized,
    signOut: clearAuth,
  } = useAuthStore();

  // ─── Fetch Profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(
    async (userId: string): Promise<ApiResult<UserProfile>> => {
      try {
        const { data, error } = await db
          .profiles()
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data as UserProfile);
        return { data: data as UserProfile, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        return { data: null, error: { message } };
      }
    },
    [setProfile],
  );

  // ─── Initialize Session ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession?.user?.id) {
        await fetchProfile(currentSession.user.id);
      }

      setInitialized(true);
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession: Session | null) => {
        if (!mounted) return;
        setSession(newSession);

        if (newSession?.user?.id) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, setInitialized, setProfile, setSession]);

  // ─── Sign In ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<ApiResult<Session>> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        return { data: data.session!, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign in failed';
        return { data: null, error: { message } };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  // ─── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
    ): Promise<ApiResult<Session>> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;
        return { data: data.session!, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        return { data: null, error: { message } };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  // ─── Facebook OAuth ─────────────────────────────────────────────────────────
  const signInWithFacebook = useCallback(async (): Promise<ApiResult<Session>> => {
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        return { data: null, error: { message: 'Facebook sign-in was cancelled' } };
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(result.url);

      if (sessionError) throw sessionError;
      return { data: sessionData.session!, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facebook sign-in failed';
      return { data: null, error: { message } };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // ─── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setLoading]);

  // ─── Reset Password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(
    async (email: string): Promise<ApiResult<null>> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: 'myconnect://reset-password' },
        );

        if (error) throw error;
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password reset failed';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  return {
    session,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: session !== null,
    signIn,
    signUp,
    signInWithFacebook,
    signOut,
    resetPassword,
    refreshProfile: () => session?.user?.id ? fetchProfile(session.user.id) : Promise.resolve({ data: null, error: { message: 'No session' } }),
  };
}
