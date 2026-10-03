import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  // App Route Shell (Canonical user-facing routes without /tabs prefix)
  {
    path: '/',
    component: () => import('../views/TabsPage.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/HomePage.vue'),
        meta: { desktopNav: true, desktopContextRail: true }
      },
      {
        path: 'messages',
        name: 'Messages',
        component: () => import('../views/MessagesPage.vue'),
        meta: { desktopNav: false, desktopContextRail: false }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/ProfilePage.vue'),
        meta: { desktopNav: false, desktopContextRail: false }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('../views/HomePage.vue'),
        meta: { desktopNav: true, desktopContextRail: false }
      }
    ]
  },
  // Public standalone Landing / Welcome
  {
    path: '/landing',
    alias: ['/welcome'],
    name: 'Landing',
    component: () => import('../views/LandingPage.vue')
  },
  // Authentication & Onboarding
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('../views/AuthPage.vue')
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/AuthPage.vue')
  },
  // Direct Messaging / Chat
  {
    path: '/chat/:conversationId',
    name: 'Chat',
    component: () => import('../views/ChatPage.vue')
  },
  // Post Details & Editing
  {
    path: '/post/:id',
    name: 'PostDetails',
    component: () => import('../views/PostDetailsPage.vue')
  },
  {
    path: '/edit-post/:id',
    name: 'EditPost',
    component: () => import('../views/EditPostPage.vue')
  },
  // Member Public Profile & Editing
  {
    path: '/profile/:userId',
    alias: ['/profile/:uid'],
    name: 'PublicProfile',
    component: () => import('../views/PublicProfilePage.vue')
  },
  {
    path: '/edit-profile',
    name: 'EditProfile',
    component: () => import('../views/EditProfilePage.vue')
  },
  // Dedicated Settings Pages
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsPage.vue')
  },
  {
    path: '/settings/notifications',
    name: 'NotificationSettings',
    component: () => import('../views/NotificationSettingsPage.vue')
  },
  {
    path: '/settings/security',
    name: 'SecuritySettings',
    component: () => import('../views/SecuritySettingsPage.vue')
  },
  {
    path: '/settings/help',
    name: 'HelpCenter',
    component: () => import('../views/HelpCenterPage.vue')
  },
  // Legal & Policies
  {
    path: '/legal',
    redirect: '/settings'
  },
  {
    path: '/legal/privacy',
    name: 'PrivacyPolicyLegal',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'privacy' }
  },
  {
    path: '/legal/terms',
    name: 'TermsOfUseLegal',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'terms' }
  },
  {
    path: '/legal/community-guidelines',
    name: 'CommunityGuidelinesLegal',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'community-guidelines' }
  },
  {
    path: '/legal/delete-account',
    name: 'DeleteAccountLegal',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'delete-account' }
  },
  {
    path: '/legal/:slug',
    name: 'LegalPolicy',
    component: () => import('../views/PolicyPage.vue')
  },
  {
    path: '/privacy',
    name: 'PrivacyPolicy',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'privacy' }
  },
  {
    path: '/terms',
    name: 'TermsOfUse',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'terms' }
  },
  {
    path: '/community-guidelines',
    name: 'CommunityGuidelines',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'community-guidelines' }
  },
  {
    path: '/delete-account',
    name: 'DeleteAccount',
    component: () => import('../views/PolicyPage.vue'),
    props: { policySlug: 'delete-account' }
  },
  // Legacy /tabs redirects for backward compatibility
  {
    path: '/tabs/home',
    redirect: '/'
  },
  {
    path: '/tabs/messages',
    redirect: '/messages'
  },
  {
    path: '/tabs/profile',
    redirect: '/profile'
  },
  {
    path: '/tabs/notifications',
    redirect: '/notifications'
  },
  {
    path: '/tabs',
    redirect: '/'
  },
  {
    path: '/tabs/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/items',
    redirect: '/'
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/activity',
    redirect: '/profile'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Authentication and Onboarding navigation guard
router.beforeEach(async (to, from, next) => {
  const { initializeAuthSession, currentUser, hasProfile } = useAuth();
  
  // Await auth initialization
  await initializeAuthSession();

  const isPublicRoute =
    to.path === '/landing' ||
    to.path === '/welcome' ||
    to.path === '/auth' ||
    to.path === '/onboarding' ||
    to.path.startsWith('/legal') ||
    to.path === '/privacy' ||
    to.path === '/terms' ||
    to.path === '/community-guidelines' ||
    to.path === '/delete-account';

  const user = currentUser.value;

  if (!user) {
    // 1. No authenticated user -> allow public/auth routes, otherwise redirect to Auth
    if (isPublicRoute) {
      next();
    } else {
      next('/auth');
    }
  } else if (user.isAnonymous) {
    // 2. Authenticated anonymous user with unfinished account -> allow public routes, else /auth
    if (isPublicRoute) {
      next();
    } else {
      next('/auth');
    }
  } else if (!hasProfile.value) {
    // 3. Authenticated non-anonymous user without completed profile
    if (isPublicRoute) {
      next();
    } else {
      next('/auth');
    }
  } else {
    // 4. Authenticated non-anonymous user with full profile
    if (to.path === '/auth' || to.path === '/onboarding' || to.path === '/landing' || to.path === '/welcome') {
      next('/');
    } else {
      next();
    }
  }
});

export default router;
