<template>
  <ion-page class="auth-page">
    <ion-content :fullscreen="false" :force-overscroll="false" class="auth-content">
      <div class="auth-outer-wrap">
        <div class="auth-center-container">
          <!-- VIEW 1: SIGN IN -->
          <template v-if="view === 'signin'">
            <!-- Branding Header -->
            <header class="auth-brand">
              <img
                src="/retrv-app@300x.png"
                alt="Retrv app icon"
                class="auth-logo"
              />
              <img
                src="/retrv-text.svg"
                alt="Retrv"
                class="auth-wordmark"
              />
              <p class="auth-subtitle">Community item recovery &amp; reconnection</p>
            </header>

            <!-- Sign In Form -->
            <form class="auth-form" @submit.prevent="handleSignIn">
              <!-- Email or Username -->
              <div class="form-group">
                <label class="input-label" for="signin-identifier">Email or Username</label>
                <input
                  id="signin-identifier"
                  v-model="signInForm.identifier"
                  type="text"
                  class="auth-input"
                  placeholder="you@example.com or username"
                  autocomplete="username"
                  autocapitalize="none"
                  @input="clearError('signInIdentifier')"
                />
                <span v-if="errors.signInIdentifier" class="input-error">{{ errors.signInIdentifier }}</span>
              </div>

              <!-- Password -->
              <div class="form-group">
                <label class="input-label" for="signin-password">Password</label>
                <div class="password-wrap">
                  <input
                    id="signin-password"
                    v-model="signInForm.password"
                    :type="showSignInPassword ? 'text' : 'password'"
                    class="auth-input with-toggle"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                    @input="clearError('signInPassword')"
                  />
                  <button
                    type="button"
                    class="pwd-toggle-btn"
                    :aria-label="showSignInPassword ? 'Hide password' : 'Show password'"
                    @click="showSignInPassword = !showSignInPassword"
                  >
                    <EyeOff v-if="showSignInPassword" :size="18" />
                    <Eye v-else :size="18" />
                  </button>
                </div>
                <span v-if="errors.signInPassword" class="input-error">{{ errors.signInPassword }}</span>
              </div>

              <!-- Global Error Banner -->
              <div v-if="globalError" class="error-banner">
                <AlertCircle :size="16" class="error-banner-icon" />
                <span>{{ globalError }}</span>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="auth-primary-btn"
                :disabled="loading"
              >
                <ion-spinner v-if="loading" name="crescent" class="btn-spinner" />
                <span v-else>Sign In</span>
              </button>

              <!-- Switch Link -->
              <div class="auth-switch-prompt">
                <span>Don't have an account?</span>
                <button type="button" class="switch-link-btn" @click="switchView('create-profile')">
                  Create Account
                </button>
              </div>
            </form>
          </template>

          <!-- VIEW 2: CREATE PROFILE (Step 1 of Create Account) -->
          <template v-else-if="view === 'create-profile'">
            <!-- Branding Header -->
            <header class="auth-brand">
              <img
                src="/retrv-app@300x.png"
                alt="Retrv app icon"
                class="auth-logo"
              />
              <img
                src="/retrv-text.svg"
                alt="Retrv"
                class="auth-wordmark"
              />
              <p class="auth-section-title">Create your profile</p>
            </header>

            <!-- Profile Details Form -->
            <form class="auth-form" @submit.prevent="handleContinueToAccount">
              <!-- Full Name -->
              <div class="form-group">
                <label class="input-label" for="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  v-model="signUpForm.name"
                  type="text"
                  class="auth-input"
                  placeholder="e.g., Alex Johnson"
                  autocomplete="name"
                  maxlength="50"
                  @input="clearError('name')"
                />
                <span v-if="errors.name" class="input-error">{{ errors.name }}</span>
              </div>

              <!-- Username -->
              <div class="form-group">
                <label class="input-label" for="signup-username">Username</label>
                <div class="input-with-prefix">
                  <span class="prefix">@</span>
                  <input
                    id="signup-username"
                    v-model="signUpForm.username"
                    type="text"
                    class="auth-input with-prefix"
                    placeholder="alexj"
                    autocomplete="username"
                    autocapitalize="none"
                    maxlength="30"
                    @input="handleUsernameInput"
                    @blur="handleUsernameBlur"
                  />
                </div>
                <span v-if="errors.username" class="input-error">{{ errors.username }}</span>
              </div>

              <!-- Phone Number -->
              <div class="form-group">
                <label class="input-label" for="signup-phone">Phone Number</label>
                <input
                  id="signup-phone"
                  v-model="signUpForm.phone"
                  type="tel"
                  class="auth-input"
                  placeholder="e.g., 09123456789"
                  autocomplete="tel"
                  maxlength="20"
                  @input="clearError('phone')"
                />
                <span class="input-hint">Private — never visible to other users</span>
                <span v-if="errors.phone" class="input-error">{{ errors.phone }}</span>
              </div>

              <!-- Global Error Banner -->
              <div v-if="globalError" class="error-banner">
                <AlertCircle :size="16" class="error-banner-icon" />
                <span>{{ globalError }}</span>
              </div>

              <!-- Continue Button -->
              <button
                type="submit"
                class="auth-primary-btn"
                :disabled="loading"
              >
                <ion-spinner v-if="loading" name="crescent" class="btn-spinner" />
                <span v-else>Continue</span>
              </button>

              <!-- Switch Link -->
              <div class="auth-switch-prompt">
                <span>Already have an account?</span>
                <button type="button" class="switch-link-btn" @click="switchView('signin')">
                  Sign In
                </button>
              </div>
            </form>
          </template>

          <!-- VIEW 3: CREATE ACCOUNT (Step 2 of Create Account) -->
          <template v-else-if="view === 'create-account'">
            <!-- Consistent Branding Header -->
            <header class="auth-brand auth-brand-compact">
              <img
                src="/retrv-app@300x.png"
                alt="Retrv app icon"
                class="auth-logo"
              />
              <img
                src="/retrv-text.svg"
                alt="Retrv"
                class="auth-wordmark"
              />
            </header>

            <!-- Step Title Row with inline Back Button -->
            <div class="auth-step-row">
              <button
                type="button"
                class="auth-back-btn"
                aria-label="Back to profile details"
                @click="goBackToProfile"
              >
                <ArrowLeft :size="20" />
              </button>
              <div class="auth-step-text">
                <h2 class="auth-step-title">Create your account</h2>
                <p class="auth-step-subtitle">Set your email and password</p>
              </div>
            </div>

            <!-- Credentials Form -->
            <form class="auth-form" @submit.prevent="handleCreateAccount">
              <!-- Email -->
              <div class="form-group">
                <label class="input-label" for="signup-email">Email</label>
                <input
                  id="signup-email"
                  v-model="signUpForm.email"
                  type="email"
                  class="auth-input"
                  placeholder="name@example.com"
                  autocomplete="email"
                  autocapitalize="none"
                  @input="clearError('email')"
                />
                <span class="input-hint">Private — used for account sign-in</span>
                <span v-if="errors.email" class="input-error">{{ errors.email }}</span>
              </div>

              <!-- Password -->
              <div class="form-group">
                <label class="input-label" for="signup-password">Password</label>
                <div class="password-wrap">
                  <input
                    id="signup-password"
                    v-model="signUpForm.password"
                    :type="showSignUpPassword ? 'text' : 'password'"
                    class="auth-input with-toggle"
                    placeholder="At least 6 characters"
                    autocomplete="new-password"
                    @input="clearError('password')"
                  />
                  <button
                    type="button"
                    class="pwd-toggle-btn"
                    :aria-label="showSignUpPassword ? 'Hide password' : 'Show password'"
                    @click="showSignUpPassword = !showSignUpPassword"
                  >
                    <EyeOff v-if="showSignUpPassword" :size="18" />
                    <Eye v-else :size="18" />
                  </button>
                </div>
                <span v-if="errors.password" class="input-error">{{ errors.password }}</span>
              </div>

              <!-- Confirm Password -->
              <div class="form-group">
                <label class="input-label" for="signup-confirm-password">Confirm Password</label>
                <div class="password-wrap">
                  <input
                    id="signup-confirm-password"
                    v-model="signUpForm.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    class="auth-input with-toggle"
                    placeholder="Repeat your password"
                    autocomplete="new-password"
                    @input="clearError('confirmPassword')"
                  />
                  <button
                    type="button"
                    class="pwd-toggle-btn"
                    :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <EyeOff v-if="showConfirmPassword" :size="18" />
                    <Eye v-else :size="18" />
                  </button>
                </div>
                <span v-if="errors.confirmPassword" class="input-error">{{ errors.confirmPassword }}</span>
              </div>

              <!-- Global Error Banner -->
              <div v-if="globalError" class="error-banner">
                <AlertCircle :size="16" class="error-banner-icon" />
                <span>{{ globalError }}</span>
              </div>

              <!-- Terms & Guidelines Agreement Checkbox -->
              <div class="legal-agreement-group">
                <label class="agreement-checkbox-label">
                  <input
                    id="signup-agree-policies"
                    v-model="agreedToPolicies"
                    type="checkbox"
                    class="agreement-checkbox"
                  />
                  <span class="agreement-text">
                    I agree to the
                    <button type="button" class="legal-inline-btn" @click.stop="openPolicy('/legal/terms')">Terms of Use</button>
                    and
                    <button type="button" class="legal-inline-btn" @click.stop="openPolicy('/legal/community-guidelines')">Community Guidelines</button>.
                  </span>
                </label>

                <p class="legal-policy-hint">
                  Read our
                  <button type="button" class="legal-inline-btn" @click.stop="openPolicy('/legal/privacy')">Privacy Policy</button>
                  to learn how we protect your data.
                </p>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="auth-primary-btn"
                :disabled="loading || !agreedToPolicies"
              >
                <ion-spinner v-if="loading" name="crescent" class="btn-spinner" />
                <span v-else>Create Account</span>
              </button>
            </form>
          </template>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { IonContent, IonPage, IonSpinner, toastController } from "@ionic/vue";
import { Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-vue-next";
import { useAuth, normalizeUsername } from "../composables/useAuth";

const router = useRouter();
const route = useRoute();
const { signIn, signUp, isAnonymous, checkUsernameAvailable, currentProfile } = useAuth();

type AuthView = "signin" | "create-profile" | "create-account";
const view = ref<AuthView>("signin");
const loading = ref(false);
const globalError = ref("");
const agreedToPolicies = ref(false);

const openPolicy = (path: string) => {
  router.push(path);
};

// Password visibility states (hidden by default)
const showSignInPassword = ref(false);
const showSignUpPassword = ref(false);
const showConfirmPassword = ref(false);

const signInForm = reactive({
  identifier: "",
  password: ""
});

const signUpForm = reactive({
  name: "",
  username: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: ""
});

const errors = reactive<Record<string, string>>({
  signInIdentifier: "",
  signInPassword: "",
  name: "",
  username: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: ""
});

let usernameDebounceTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  // If user is anonymous or coming from /onboarding, show profile setup
  if (isAnonymous.value || route.path === "/onboarding") {
    view.value = "create-profile";
  }
  // Pre-fill profile data if present
  if (currentProfile.value) {
    signUpForm.name = currentProfile.value.name || "";
    signUpForm.username = currentProfile.value.username || "";
    signUpForm.phone = currentProfile.value.phone || "";
  }
});

onBeforeUnmount(() => {
  if (usernameDebounceTimer) {
    clearTimeout(usernameDebounceTimer);
  }
});

const switchView = (newView: AuthView) => {
  view.value = newView;
  globalError.value = "";
  Object.keys(errors).forEach((k) => {
    errors[k] = "";
  });
};

const goBackToProfile = () => {
  view.value = "create-profile";
  globalError.value = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";
};

const clearError = (field: string) => {
  errors[field] = "";
  globalError.value = "";
};

const handleUsernameInput = () => {
  signUpForm.username = normalizeUsername(signUpForm.username);
  clearError("username");

  // Debounced check — avoid annoying errors while actively typing
  if (usernameDebounceTimer) {
    clearTimeout(usernameDebounceTimer);
  }
  if (signUpForm.username.length >= 3) {
    usernameDebounceTimer = setTimeout(async () => {
      await checkUsernameAvailability();
    }, 600);
  }
};

const handleUsernameBlur = async () => {
  if (usernameDebounceTimer) {
    clearTimeout(usernameDebounceTimer);
  }
  await checkUsernameAvailability();
};

const checkUsernameAvailability = async (): Promise<boolean> => {
  const clean = signUpForm.username.trim();
  if (!clean || clean.length < 3) return true;
  try {
    const isAvail = await checkUsernameAvailable(clean);
    if (!isAvail) {
      errors.username = "This username is already taken. Please choose another.";
      return false;
    } else if (errors.username === "This username is already taken. Please choose another.") {
      errors.username = "";
    }
    return true;
  } catch (err) {
    return true;
  }
};

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const validateSignIn = (): boolean => {
  let valid = true;
  globalError.value = "";

  const raw = signInForm.identifier.trim();
  if (!raw) {
    errors.signInIdentifier = "Email or username is required.";
    valid = false;
  }

  if (!signInForm.password) {
    errors.signInPassword = "Password is required.";
    valid = false;
  }

  return valid;
};

const validateProfileStep = async (): Promise<boolean> => {
  let valid = true;
  globalError.value = "";

  if (!signUpForm.name.trim()) {
    errors.name = "Full name is required.";
    valid = false;
  } else if (signUpForm.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
    valid = false;
  }

  if (!signUpForm.username.trim()) {
    errors.username = "Username is required.";
    valid = false;
  } else if (signUpForm.username.length < 3) {
    errors.username = "Username must be at least 3 characters.";
    valid = false;
  }

  if (!signUpForm.phone.trim()) {
    errors.phone = "Phone number is required.";
    valid = false;
  } else if (!/^[0-9+()-\s]{7,20}$/.test(signUpForm.phone.trim())) {
    errors.phone = "Please enter a valid phone number.";
    valid = false;
  }

  // Validate uniqueness
  if (valid && signUpForm.username.trim()) {
    const isAvail = await checkUsernameAvailability();
    if (!isAvail) {
      valid = false;
    }
  }

  return valid;
};

const validateAccountStep = (): boolean => {
  let valid = true;
  globalError.value = "";

  if (!signUpForm.email.trim()) {
    errors.email = "Email is required.";
    valid = false;
  } else if (!validateEmail(signUpForm.email)) {
    errors.email = "Please enter a valid email address.";
    valid = false;
  }

  if (!signUpForm.password) {
    errors.password = "Password is required.";
    valid = false;
  } else if (signUpForm.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
    valid = false;
  }

  if (!signUpForm.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
    valid = false;
  } else if (signUpForm.confirmPassword !== signUpForm.password) {
    errors.confirmPassword = "Passwords do not match.";
    valid = false;
  }

  return valid;
};

const handleSignIn = async () => {
  if (!validateSignIn() || loading.value) return;
  loading.value = true;
  try {
    await signIn(signInForm.identifier, signInForm.password);
    const toast = await toastController.create({
      message: "Signed in successfully!",
      duration: 2000,
      position: "top",
      color: "success"
    });
    await toast.present();
    router.replace("/tabs/home");
  } catch (err: any) {
    globalError.value = err.message || "Failed to sign in. Please verify your credentials.";
  } finally {
    loading.value = false;
  }
};

const handleContinueToAccount = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const isValid = await validateProfileStep();
    if (isValid) {
      view.value = "create-account";
      globalError.value = "";
    }
  } finally {
    loading.value = false;
  }
};

const handleCreateAccount = async () => {
  if (!agreedToPolicies.value) {
    globalError.value = "You must agree to the Terms of Use and Community Guidelines to create an account.";
    return;
  }
  if (!validateAccountStep() || loading.value) return;
  loading.value = true;
  try {
    await signUp({
      name: signUpForm.name,
      username: signUpForm.username,
      phone: signUpForm.phone,
      email: signUpForm.email,
      password: signUpForm.password
    });

    const toast = await toastController.create({
      message: "Account created successfully!",
      duration: 2000,
      position: "top",
      color: "success"
    });
    await toast.present();
    router.replace("/tabs/home");
  } catch (err: any) {
    globalError.value = err.message || "Failed to create account. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page {
  color-scheme: light !important;
  --background: #f1f5f9;
  --ion-background-color: #f1f5f9;
  --ion-text-color: #202124;
  --app-bg: #ffffff;
  --app-text-primary: #202124;
  --app-text-secondary: #72777D;
  --app-text-tertiary: #9AA0A6;
  --app-text-muted: #9AA0A6;
  --app-input-background: #F2F4F7;
  --app-input-border: rgba(20, 25, 30, 0.08);
  --app-border: rgba(20, 25, 30, 0.08);
  --app-surface: #ffffff;
  --app-surface-secondary: #F2F4F7;
  --app-primary: #2640DB;
  --app-primary-deep: #0019B7;
  --app-primary-accent: #3B82F6;
  --app-primary-soft: rgba(38, 64, 219, 0.10);
  --app-primary-subtle: rgba(38, 64, 219, 0.05);
}

.auth-content {
  --background: transparent;
}

/* Outer layout wrapper with background image */
.auth-outer-wrap {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  min-height: 100dvh;
  min-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  padding: max(24px, calc(env(safe-area-inset-top, 0px) + 24px)) 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px));
  background-image: url('/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* Center auth card with drop shadow (Forced Light Mode) */
.auth-center-container {
  width: 100%;
  max-width: 410px;
  margin: auto 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #202124;
  border-radius: 24px;
  padding: 36px 32px 32px;
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 10px 25px -5px rgba(15, 23, 42, 0.12);
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.9);
}

/* Branding Header */
.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 28px;
}

.auth-brand-compact {
  margin-bottom: 18px;
}

.auth-logo {
  width: 68px;
  height: 68px;
  object-fit: contain;
  margin-bottom: 12px;
  border-radius: 16px;
  filter: drop-shadow(0 4px 14px rgba(22, 55, 199, 0.22));
}

.auth-wordmark {
  height: 28px;
  width: auto;
  display: block;
  object-fit: contain;
}

.auth-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--app-text-primary, #202124);
}

.auth-subtitle {
  margin: 6px 0 0 0;
  font-size: 14px;
  color: var(--app-text-secondary, #72777D);
}

.auth-section-title {
  margin: 6px 0 0 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--app-text-secondary, #72777D);
}

/* Step 2 Row with inline Back Button */
.auth-step-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.auth-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: var(--app-input-background, #F2F4F7);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 50%;
  color: var(--app-text-primary, #202124);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
}

.auth-back-btn:active {
  transform: scale(0.92);
  background: var(--app-border, rgba(20, 25, 30, 0.12));
}

.auth-step-text {
  display: flex;
  flex-direction: column;
}

.auth-step-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--app-text-primary, #202124);
}

.auth-step-subtitle {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: var(--app-text-secondary, #72777D);
}

/* Form Styles */
.auth-form {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary, #202124);
  margin-bottom: 7px;
  letter-spacing: -0.01em;
}

.auth-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  background: var(--app-input-background, #F2F4F7);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 12px;
  font-size: 15px;
  color: var(--app-text-primary, #202124);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  -webkit-appearance: none;
}

.auth-input:focus {
  border-color: var(--app-primary, #2640DB);
  box-shadow: 0 0 0 3px rgba(38, 64, 219, 0.16);
}

.auth-input::placeholder {
  color: var(--app-text-muted, #9AA0A6);
}

/* Input with @ prefix */
.input-with-prefix {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.input-with-prefix .prefix {
  position: absolute;
  left: 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-secondary, #72777D);
  pointer-events: none;
  user-select: none;
}

.auth-input.with-prefix {
  padding-left: 32px;
}

/* Password with Show/Hide toggle */
.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.auth-input.with-toggle {
  padding-right: 44px;
}

.pwd-toggle-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--app-text-secondary, #72777D);
  cursor: pointer;
  transition: color 0.15s ease;
}

.pwd-toggle-btn:hover,
.pwd-toggle-btn:focus {
  color: var(--app-text-primary, #202124);
}

/* Hints & Errors */
.input-hint {
  font-size: 11.5px;
  color: var(--app-text-secondary, #72777D);
  margin-top: 5px;
}

.input-error {
  font-size: 12px;
  color: var(--ion-color-danger, #F04444);
  font-weight: 500;
  margin-top: 5px;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(240, 68, 68, 0.08);
  border: 1px solid rgba(240, 68, 68, 0.2);
  border-radius: 10px;
  color: var(--ion-color-danger, #F04444);
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 16px;
}

.error-banner-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Primary Button */
.auth-primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  margin-top: 8px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(38, 64, 219, 0.25);
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
}

.auth-primary-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: var(--app-primary-deep, #0019B7);
  box-shadow: 0 2px 8px rgba(0, 25, 183, 0.3);
}

.auth-primary-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-spinner {
  --color: #ffffff;
  width: 20px;
  height: 20px;
}

/* Switch Prompt Link */
.auth-switch-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  font-size: 13.5px;
  color: var(--app-text-secondary, #72777D);
}

.switch-link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--app-primary-accent, #3B82F6);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.switch-link-btn:active {
  opacity: 0.7;
}

/* Legal Agreement & Policy Checkbox */
.legal-agreement-group {
  margin: 6px 0 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agreement-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.agreement-checkbox {
  appearance: auto;
  -webkit-appearance: auto;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--app-primary, #2640DB);
  cursor: pointer;
  flex-shrink: 0;
}

.agreement-text {
  font-size: 13px;
  color: var(--app-text-secondary, #72777D);
  line-height: 1.45;
}

.legal-inline-btn {
  display: inline;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-primary-accent, #3B82F6);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.legal-inline-btn:hover {
  color: var(--app-primary, #2640DB);
}

.legal-inline-btn:active {
  opacity: 0.75;
}

.legal-policy-hint {
  margin: 0 0 0 28px;
  font-size: 12px;
  color: var(--app-text-muted, #9AA0A6);
  line-height: 1.4;
}

/* Responsive: Seamless Flat Mobile Layout (<= 768px) */
@media (max-width: 768px) {
  .auth-outer-wrap {
    background-image: none;
    background-color: #ffffff;
    padding: max(20px, calc(env(safe-area-inset-top, 0px) + 16px)) 24px max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px));
    justify-content: center;
  }

  .auth-center-container {
    background: transparent;
    box-shadow: none;
    border: none;
    border-radius: 0;
    padding: 8px 0 20px;
    max-width: 100%;
    margin: 0 auto;
  }

  .auth-brand {
    margin-bottom: 24px;
  }

  .auth-logo {
    filter: drop-shadow(0 4px 10px rgba(22, 55, 199, 0.16));
  }
}
</style>
