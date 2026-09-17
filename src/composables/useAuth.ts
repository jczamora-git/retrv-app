import { ref, computed } from "vue";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { disconnectSocket, getApiServerUrl } from "../services/socket";
import { useProfiles } from "./useProfiles";
import type { Profile, ProfileFormData } from "../types/profile";

export interface User {
  uid: string;
  id?: string;
  email?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  isAnonymous?: boolean;
  isDevAccount?: boolean;
}

export interface DevSession {
  uid: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  avatarUrl?: string | null;
  avatarKey?: string | null;
  isDevAccount: true;
}

const DEV_AUTH_STORAGE_KEY = "dev_auth_session";

export const isDevBypassAuth =
  import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export const isDevBypassEnabled = (): boolean => {
  return isDevBypassAuth;
};

export const getDevSession = (): DevSession | null => {
  try {
    const raw = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.isDevAccount) {
      return parsed as DevSession;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveDevSession = (session: DevSession): void => {
  if (!isDevBypassAuth) return;
  try {
    localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn("[DEV] Failed to save dev session to localStorage:", e);
  }
};

export const clearDevSession = (): void => {
  try {
    localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
  } catch {}
};

export const createDevUser = (session: DevSession): User => {
  return {
    uid: session.uid,
    id: session.uid,
    email: session.email,
    isAnonymous: false,
    displayName: session.name,
    phoneNumber: session.phone,
    isDevAccount: true
  };
};

const currentUser = ref<User | null>(null);
const currentProfile = ref<Profile | null>(null);
const isAuthReady = ref(false);
const authLoading = ref(true);

let authInitPromise: Promise<User | null> | null = null;

export const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9_.]/g, "");
};

export function formatAuthError(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  const msg = (err.message || err.error_description || "").toLowerCase();

  if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("email-already-in-use")) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials") || msg.includes("wrong password")) {
    return "Incorrect email/username or password.";
  }
  if (msg.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("password should be at least") || msg.includes("weak password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many attempts. Try again later.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Unable to connect. Check your connection.";
  }

  return err.message || "Authentication failed. Please try again.";
}

export function mapSupabaseUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser) return null;
  return {
    uid: sbUser.id,
    id: sbUser.id,
    email: sbUser.email,
    displayName: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || null,
    phoneNumber: sbUser.phone || sbUser.user_metadata?.phone || null,
    isAnonymous: sbUser.is_anonymous || false,
    isDevAccount: false
  };
}

export function initializeAuthSession(): Promise<User | null> {
  if (isDevBypassAuth) {
    const devSession = getDevSession();
    if (devSession) {
      const devUser = createDevUser(devSession);
      currentUser.value = devUser;
      currentProfile.value = {
        id: devSession.uid,
        name: devSession.name,
        username: devSession.username,
        phone: devSession.phone,
        email: devSession.email,
        avatarUrl: devSession.avatarUrl || null,
        avatarKey: devSession.avatarKey || null,
        avatarPath: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      isAuthReady.value = true;
      authLoading.value = false;
      return Promise.resolve(devUser);
    }
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = new Promise<User | null>((resolve) => {
    let initialResolved = false;

    // Listen to Supabase Auth State Changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      authLoading.value = true;
      try {
        if (session?.user) {
          clearDevSession();
          const user = mapSupabaseUser(session.user);
          currentUser.value = user;

          if (user?.uid) {
            try {
              const profile = await fetchProfile(user.uid);
              currentProfile.value = profile;
            } catch (err) {
              console.warn("[Auth] Error fetching profile for user:", err);
            }
          }
          isAuthReady.value = true;

          if (!initialResolved) {
            initialResolved = true;
            resolve(user);
          }
        } else {
          if (isDevBypassAuth) {
            const devSession = getDevSession();
            if (devSession) {
              const devUser = createDevUser(devSession);
              currentUser.value = devUser;
              currentProfile.value = {
                id: devSession.uid,
                name: devSession.name,
                username: devSession.username,
                phone: devSession.phone,
                email: devSession.email,
                avatarUrl: devSession.avatarUrl || null,
                avatarKey: devSession.avatarKey || null,
                avatarPath: null,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              isAuthReady.value = true;

              if (!initialResolved) {
                initialResolved = true;
                resolve(devUser);
              }
              return;
            }
          }

          currentUser.value = null;
          currentProfile.value = null;
          isAuthReady.value = true;

          if (!initialResolved) {
            initialResolved = true;
            resolve(null);
          }
        }
      } catch (e) {
        console.warn("[Auth] Initialization error:", e);
        if (!initialResolved) {
          initialResolved = true;
          resolve(currentUser.value);
        }
      } finally {
        authLoading.value = false;
      }
    });

    // Also trigger initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!initialResolved && !session) {
        if (!isDevBypassAuth || !getDevSession()) {
          currentUser.value = null;
          currentProfile.value = null;
          isAuthReady.value = true;
          authLoading.value = false;
          initialResolved = true;
          resolve(null);
        }
      }
    }).catch(() => {
      if (!initialResolved) {
        initialResolved = true;
        resolve(currentUser.value);
      }
    });
  });

  return authInitPromise;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  if (currentUser.value) {
    return currentUser.value;
  }
  return await initializeAuthSession();
}

export const fetchProfile = async (uid: string): Promise<Profile | null> => {
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      return {
        id: data.id || uid,
        name: data.name || "",
        username: data.username || "",
        phone: data.phone || "",
        email: data.email || currentUser.value?.email || undefined,
        avatarUrl: data.avatar_url || data.avatarUrl || null,
        avatarKey: data.avatar_key || data.avatarKey || null,
        avatarPath: null,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
      };
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch profile from Supabase:", err);
    return null;
  }
};

export const checkUsernameAvailable = async (
  rawUsername: string,
  currentUid?: string
): Promise<boolean> => {
  const clean = normalizeUsername(rawUsername);
  if (!clean) return false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("Could not check username availability:", error);
      return true;
    }

    if (!data) return true;
    return data.id === (currentUid || currentUser.value?.uid);
  } catch (err) {
    console.warn("Could not check username availability:", err);
    return true;
  }
};

export async function resolveUsername(rawUsername: string): Promise<string> {
  const clean = normalizeUsername(rawUsername);
  if (!clean) {
    throw new Error("Please enter a valid username.");
  }

  if (isDevBypassAuth) {
    return `${clean}@example.com`;
  }

  const serverUrl = getApiServerUrl();
  let resolvedEmail: string | null = null;

  if (serverUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${serverUrl}/api/auth/resolve-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.email) {
          resolvedEmail = data.email.trim().toLowerCase();
        }
      } else if (resp.status === 404) {
        throw new Error("Account not found.");
      }
    } catch (err: any) {
      if (err.message === "Account not found.") {
        throw err;
      }
    }
  }

  if (!resolvedEmail) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", clean)
        .maybeSingle();

      if (data && data.email) {
        resolvedEmail = data.email.trim().toLowerCase();
      }
    } catch (dbErr) {
      console.warn("[Auth] Supabase username lookup warning:", dbErr);
    }
  }

  const devSession = getDevSession();
  if (devSession && normalizeUsername(devSession.username) === clean) {
    throw new Error("This account was created in development mode. Please create a real account.");
  }

  if (!resolvedEmail) {
    throw new Error("Account not found.");
  }

  return resolvedEmail;
}

export interface SessionUser {
  id: string;
  uid: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  avatarUrl?: string | null;
  avatarKey?: string | null;
  isAnonymous: boolean;
  isDevAccount: boolean;
}

export const sessionUser = computed<SessionUser | null>(() => {
  if (currentUser.value) {
    const canonicalId = currentProfile.value?.id || currentUser.value.uid;
    return {
      id: canonicalId,
      uid: canonicalId,
      name: currentProfile.value?.name || currentUser.value.displayName || "Member",
      username: currentProfile.value?.username || "user",
      phone: currentProfile.value?.phone || currentUser.value.phoneNumber || undefined,
      email: currentUser.value.email || currentProfile.value?.email || undefined,
      avatarUrl: currentProfile.value?.avatarUrl || null,
      avatarKey: currentProfile.value?.avatarKey || null,
      isAnonymous: currentUser.value.isAnonymous || false,
      isDevAccount: !!(currentUser.value as any)?.isDevAccount
    };
  }
  return null;
});

export const currentAppUserId = computed<string | null>(() => {
  return currentProfile.value?.id || sessionUser.value?.id || sessionUser.value?.uid || currentUser.value?.uid || null;
});

export const sessionUid = computed<string | null>(() => currentAppUserId.value);
export const isRealSupabaseUser = computed<boolean>(() => !!currentUser.value && !currentUser.value.isAnonymous && !currentUser.value.isDevAccount);
export const isRealFirebaseUser = isRealSupabaseUser;
export const isDevBypassUser = computed<boolean>(() => isDevBypassEnabled() && !!(currentUser.value as any)?.isDevAccount);
export const hasValidSession = computed<boolean>(() => !!sessionUser.value && (!sessionUser.value.isAnonymous || sessionUser.value.isDevAccount));

export async function getSessionUser(): Promise<SessionUser | null> {
  await initializeAuthSession();
  return sessionUser.value;
}

export function useAuth() {
  const signIn = async (identifier: string, password: string): Promise<User> => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error("Email or username is required.");
    if (!password) throw new Error("Password is required.");

    let targetEmail = "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (isDevBypassEnabled()) {
      const cleanUsername = normalizeUsername(trimmed);
      let targetUid: string | null = null;

      try {
        if (cleanUsername) {
          const { data } = await supabase.from("profiles").select("id").eq("username", cleanUsername).maybeSingle();
          if (data?.id) targetUid = data.id;
        }
      } catch {}

      if (!targetUid) {
        const existingDev = getDevSession();
        if (
          existingDev &&
          (existingDev.username === cleanUsername ||
            existingDev.email.toLowerCase() === trimmed.toLowerCase())
        ) {
          targetUid = existingDev.uid;
        }
      }

      if (!targetUid) {
        targetUid = `dev_${cleanUsername || Math.random().toString(36).substring(2, 9)}`;
      }

      let profile = await fetchProfile(targetUid);
      if (!profile) {
        const defaultName = isEmail ? trimmed.split("@")[0] : trimmed;
        const defaultUsername = cleanUsername || normalizeUsername(defaultName);
        profile = {
          id: targetUid,
          name: defaultName,
          username: defaultUsername,
          phone: "09123456789",
          email: isEmail ? trimmed.toLowerCase() : `${defaultUsername}@example.com`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        try {
          await supabase.from("profiles").upsert({
            id: targetUid,
            name: profile.name,
            username: profile.username,
            phone: profile.phone,
            email: profile.email
          });
        } catch {}
      }

      const devSession: DevSession = {
        uid: targetUid,
        name: profile.name,
        username: profile.username,
        phone: profile.phone,
        email: profile.email || `${profile.username}@example.com`,
        avatarUrl: profile.avatarUrl,
        avatarKey: profile.avatarKey,
        isDevAccount: true
      };

      saveDevSession(devSession);
      const devUser = createDevUser(devSession);
      currentUser.value = devUser;
      currentProfile.value = profile;
      useProfiles().setCachedProfile(profile);
      return devUser;
    }

    if (isEmail) {
      targetEmail = trimmed.toLowerCase();
    } else {
      targetEmail = await resolveUsername(trimmed);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error("Authentication failed.");

      clearDevSession();
      const user = mapSupabaseUser(data.user)!;
      currentUser.value = user;
      const profile = await fetchProfile(user.uid);
      currentProfile.value = profile;
      return user;
    } catch (err: any) {
      console.error("[Auth] Sign in failed:", err);
      throw new Error(formatAuthError(err));
    }
  };

  const signUp = async (params: {
    name: string;
    username: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<User> => {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanUsername = normalizeUsername(params.username);
    const cleanName = params.name.trim();
    const cleanPhone = params.phone.trim();

    if (!cleanName) throw new Error("Full name is required.");
    if (!cleanUsername || cleanUsername.length < 3) throw new Error("Username must be at least 3 characters.");
    if (!cleanEmail) throw new Error("Email is required.");
    if (!params.password || params.password.length < 6) throw new Error("Password must be at least 6 characters.");

    if (isDevBypassEnabled()) {
      const isAvail = await checkUsernameAvailable(cleanUsername);
      if (!isAvail) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      const uid = `dev_${cleanUsername}`;
      const devSession: DevSession = {
        uid,
        name: cleanName,
        username: cleanUsername,
        phone: cleanPhone,
        email: cleanEmail,
        isDevAccount: true
      };

      saveDevSession(devSession);
      const devUser = createDevUser(devSession);
      currentUser.value = devUser;

      await saveProfile({
        name: cleanName,
        username: cleanUsername,
        phone: cleanPhone,
        email: cleanEmail
      });

      return devUser;
    }

    const isAvail = await checkUsernameAvailable(cleanUsername, currentUser.value?.uid);
    if (!isAvail) {
      throw new Error("Username is already taken. Please choose another one.");
    }

    let user: User;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            name: cleanName,
            username: cleanUsername,
            phone: cleanPhone
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Sign up failed.");

      clearDevSession();
      user = mapSupabaseUser(data.user)!;
    } catch (err: any) {
      console.error("[Auth] Sign up failed:", err);
      throw new Error(formatAuthError(err));
    }

    currentUser.value = user;

    await saveProfile({
      name: cleanName,
      username: cleanUsername,
      phone: cleanPhone,
      email: cleanEmail
    });

    return user;
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] Supabase signOut warning:", err);
    } finally {
      clearDevSession();
      currentUser.value = null;
      currentProfile.value = null;
      authInitPromise = null;
      disconnectSocket();
    }
  };

  const saveProfile = async (data: ProfileFormData): Promise<Profile> => {
    let user = currentUser.value;
    if (!user) {
      user = await initializeAuthSession();
    }
    if (!user?.uid) {
      throw new Error("Unable to save profile: Authentication session is missing.");
    }

    const uid = user.uid;
    const cleanUsername = normalizeUsername(data.username);
    const now = Date.now();

    const isAvail = await checkUsernameAvailable(cleanUsername, uid);
    if (!isAvail) {
      throw new Error("Username is already taken. Please pick another one.");
    }

    const newProfile: Profile = {
      id: uid,
      name: data.name.trim(),
      username: cleanUsername,
      phone: data.phone.trim(),
      email: data.email || user.email || currentProfile.value?.email || undefined,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (currentProfile.value?.avatarUrl || null),
      avatarKey: data.avatarKey !== undefined ? data.avatarKey : (currentProfile.value?.avatarKey || null),
      avatarPath: data.avatarPath !== undefined ? data.avatarPath : (currentProfile.value?.avatarPath || null),
      createdAt: currentProfile.value?.createdAt || now,
      updatedAt: now
    };

    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      name: newProfile.name,
      username: newProfile.username,
      phone: newProfile.phone,
      email: newProfile.email,
      avatar_url: newProfile.avatarUrl,
      avatar_key: newProfile.avatarKey,
      updated_at: new Date(now).toISOString()
    });

    if (error) {
      console.warn("[Auth] Profile upsert warning:", error);
    }

    currentProfile.value = newProfile;
    useProfiles().setCachedProfile(newProfile);

    if (isDevBypassEnabled() && (currentUser.value as any)?.isDevAccount) {
      saveDevSession({
        uid,
        name: newProfile.name,
        username: newProfile.username,
        phone: newProfile.phone,
        email: newProfile.email || `${newProfile.username}@example.com`,
        avatarUrl: newProfile.avatarUrl,
        avatarKey: newProfile.avatarKey,
        isDevAccount: true
      });
    }

    return newProfile;
  };

  const getPublicProfile = async (uid: string): Promise<Omit<Profile, "phone" | "email"> | null> => {
    const p = await fetchProfile(uid);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      username: p.username,
      avatarUrl: p.avatarUrl || null,
      avatarPath: p.avatarPath || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  };

  return {
    currentUser,
    currentProfile,
    sessionUser,
    sessionUid,
    currentAppUserId,
    currentSessionUser: sessionUser,
    isSessionReady: isAuthReady,
    isRealSupabaseUser,
    isRealFirebaseUser,
    isDevBypassUser,
    hasValidSession,
    isAuthReady,
    authLoading,
    uid: computed(() => currentUser.value?.uid || null),
    isAuthenticated: computed(() => !!currentUser.value && !currentUser.value.isAnonymous),
    isAnonymous: computed(() => !!currentUser.value?.isAnonymous),
    isDevAccount: computed(() => !!(currentUser.value as any)?.isDevAccount),
    hasProfile: computed(() => !!currentProfile.value?.username),
    initAuth: initializeAuthSession,
    initializeAuthSession,
    getAuthenticatedUser,
    getSessionUser,
    fetchProfile,
    checkUsernameAvailable,
    resolveUsername,
    signIn,
    signUp,
    signOutUser,
    saveProfile,
    getPublicProfile
  };
}
