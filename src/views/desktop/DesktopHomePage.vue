<template>
  <div class="desktop-home-page">
    <HomeFeedContent @open-composer="openComposer" />

    <!-- Create Post Modal when triggered from empty state -->
    <PostComposerModal
      :is-open="showComposer"
      :publishing="publishingPost"
      initial-type="lost"
      @close="showComposer = false"
      @submit="handleDirectCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import HomeFeedContent from "../../components/feed/HomeFeedContent.vue";
import PostComposerModal from "../../components/PostComposerModal.vue";

const showComposer = ref(false);
const publishingPost = ref(false);

const openComposer = () => {
  showComposer.value = true;
};

const handleDirectCreate = () => {
  showComposer.value = false;
};
</script>

<style scoped>
.desktop-home-page {
  width: 100%;
  max-width: var(--desktop-feed-width, 680px);
  margin: 0 auto;
  display: block;
}
</style>
