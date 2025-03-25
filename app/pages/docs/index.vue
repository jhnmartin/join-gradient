<script setup lang="ts">
const { data: home } = await useAsyncData(() =>
  queryCollection("docs").path("/").first()
);

useSeoMeta({
  title: home.value?.title,
  description: home.value?.description,
});
</script>

<template>
  <div>Docs</div>
</template>
