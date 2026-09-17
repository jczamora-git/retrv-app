<template>
  <ion-page class="landing-page">
    <ion-content :fullscreen="true" :force-overscroll="false" class="landing-content">
      <main class="landing-wrapper">
        <div class="landing-container">
          <!-- Top Left Brand Logo -->
          <header class="landing-header">
            <img
              src="/retrv-text.svg"
              alt="Retrv"
              class="brand-logo"
              width="132"
              height="34"
            />
          </header>

          <!-- Hero Section: Split Desktop / Stacked Mobile -->
          <section class="landing-hero" aria-labelledby="hero-title">
            <!-- Visual Column (Pure blend into white background, no effects/glow) -->
            <div class="hero-visual-col">
              <img
                src="/landing-image.png"
                alt="Retrv community lost and found"
                class="hero-illustration"
                loading="eager"
              />
            </div>

            <!-- Content Column (Headline, Tagline & CTA) -->
            <div class="hero-content-col">
              <h1 id="hero-title" class="hero-headline">
                Your way back<br />
                <span class="hero-highlight">to what matters.</span>
              </h1>

              <p class="hero-description">
                Retrv is a community-powered Lost & Found platform that helps people report, discover, and recover what matters.
              </p>

              <div class="hero-action-row">
                <button
                  type="button"
                  class="join-community-btn"
                  @click="handleJoinCommunity"
                >
                  <span>{{ isAuthenticated ? 'Go to App' : 'Join Community' }}</span>
                  <ArrowRight :size="18" class="cta-arrow" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { ArrowRight } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { isAuthenticated } = useAuth();

const handleJoinCommunity = () => {
  if (isAuthenticated.value) {
    router.push('/tabs/home');
  } else {
    router.push('/auth');
  }
};
</script>

<style scoped>
/* Pure White Clean Background */
.landing-page {
  --background: #ffffff;
  background-color: #ffffff;
  color: #0f172a;
  font-family: var(--ion-font-family, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif);
}

.landing-content {
  --background: #ffffff;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.landing-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  background-color: #ffffff;
  box-sizing: border-box;
}

.landing-container {
  width: 100%;
  max-width: 1240px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

/* Header & Brand Logo */
.landing-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-bottom: 24px;
}

.brand-logo {
  width: 132px;
  height: auto;
  object-fit: contain;
  display: block;
}

/* Hero Split Layout (Desktop default) */
.landing-hero {
  display: grid;
  grid-template-columns: 1.25fr 0.85fr;
  align-items: center;
  gap: 48px;
  width: 100%;
  margin: auto 0;
}

/* Left Visual Column */
.hero-visual-col {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.hero-illustration {
  display: block;
  width: min(100%, 720px);
  max-height: 680px;
  height: auto;
  object-fit: contain;
  user-select: none;
  /* Completely clean blend into white background - no shadows, glow, or borders */
}

/* Right Content Column */
.hero-content-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.hero-headline {
  font-size: clamp(48px, 4.2vw, 62px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: #0f172a;
  margin: 0 0 20px 0;
}

.hero-highlight {
  color: #2640db;
  display: inline;
}

.hero-description {
  font-size: 18px;
  line-height: 1.58;
  color: #475569;
  margin: 0 0 32px 0;
  max-width: 460px;
}

.hero-action-row {
  display: flex;
  align-items: center;
}

/* CTA Button */
.join-community-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 50px;
  padding: 0 32px;
  width: fit-content;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background-color: #2640db;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 8px 20px -4px rgba(38, 64, 219, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  outline: none;
}

.join-community-btn:hover {
  background-color: #0019b7;
  box-shadow: 0 12px 24px -4px rgba(0, 25, 183, 0.42);
  transform: translateY(-1.5px);
}

.join-community-btn:active {
  background-color: #0019b7;
  transform: translateY(0.5px) scale(0.99);
  box-shadow: 0 4px 12px -2px rgba(0, 25, 183, 0.3);
}

.join-community-btn:focus-visible {
  outline: 3px solid rgba(38, 64, 219, 0.4);
  outline-offset: 3px;
}

.cta-arrow {
  transition: transform 0.2s ease;
}

.join-community-btn:hover .cta-arrow {
  transform: translateX(3px);
}

/* Mobile & Tablet Portrait Layout (<= 768px) */
@media (max-width: 768px) {
  .landing-wrapper {
    min-height: 100vh;
    min-height: 100dvh;
    justify-content: center;
  }

  .landing-container {
    padding: max(16px, env(safe-area-inset-top, 0px)) 20px max(20px, env(safe-area-inset-bottom, 0px));
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .landing-header {
    justify-content: center;
    padding-bottom: 0;
    margin-bottom: 20px;
  }

  .brand-logo {
    width: 115px;
  }

  .landing-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    text-align: center;
    margin: 0;
  }

  .hero-visual-col {
    width: 100%;
    margin-bottom: 24px;
  }

  .hero-illustration {
    width: min(88vw, 380px);
    max-height: none;
    height: auto;
  }

  .hero-content-col {
    align-items: center;
    width: 100%;
  }

  .hero-headline {
    font-size: clamp(32px, 8.5vw, 40px);
    line-height: 1.05;
    margin-bottom: 12px;
    text-align: center;
  }

  .hero-description {
    font-size: 14.5px;
    line-height: 1.5;
    margin-bottom: 22px;
    max-width: 340px;
    text-align: center;
  }

  .hero-action-row {
    width: 100%;
    justify-content: center;
  }

  .join-community-btn {
    width: 100%;
    max-width: 360px;
    height: 50px;
    font-size: 15.5px;
  }
}
</style>
