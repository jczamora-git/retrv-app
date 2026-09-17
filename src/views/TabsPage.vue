<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <AppDock
        :current-tab="currentTab"
        @select-tab="handleSelectTab"
        @open-create="openCreateComposer"
      />
    </ion-tabs>

    <!-- Post Composer Modal Directly Opened -->
    <PostComposerModal
      :is-open="showComposer"
      :initial-type="selectedType"
      @close="showComposer = false"
      @submit="handlePostSubmit"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonPage,
  IonRouterOutlet,
  IonTabs,
  toastController
} from "@ionic/vue";
import AppDock from "../components/AppDock.vue";
import PostComposerModal from "../components/PostComposerModal.vue";
import { usePosts } from "../composables/usePosts";
import type { PostFormData, PostType } from "../types/post";

const route = useRoute();
const router = useRouter();
const { createPost } = usePosts();

const showComposer = ref(false);
const selectedType = ref<PostType>("lost");

const currentTab = computed<"home" | "messages" | "profile">(() => {
  if (route.path.includes("/messages")) return "messages";
  if (route.path.includes("/profile")) return "profile";
  return "home";
});

const handleSelectTab = (tab: "home" | "messages" | "profile") => {
  if (tab === "home") {
    router.push("/tabs/home");
  } else if (tab === "messages") {
    router.push("/tabs/messages");
  } else {
    router.push("/tabs/profile");
  }
};

const openCreateComposer = () => {
  selectedType.value = "lost";
  showComposer.value = true;
};

const handlePostSubmit = () => {
  showComposer.value = false;
  router.push("/tabs/home");
};
</script>
