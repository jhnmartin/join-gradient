<template>
  <UDashboardGroup>
    <UDashboardSearch :groups="groups" />

    <UDashboardSidebar
      v-model:open="open"
      :mobile-breakpoint="960"
      collapsible
      resizable
      class="bg-(--ui-bg-elevated)/25"
      :ui="{
        base: 'relative h-[100dvh] lg:h-screen',
        wrapper: 'lg:!block',
        footer: 'lg:border-t lg:border-(--ui-border)',
      }"
    >
      <template #header="{ collapsed }">
        <div
          class="flex items-center justify-between p-2"
          :class="{ 'flex-col': collapsed }"
        >
          <h1 class="text-xl font-display">team.gradient</h1>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-menu"
            class="lg:hidden"
            @click="open = !open"
          />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-(--ui-border)"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <main class="flex-1 overflow-x-hidden min-h-[100dvh] lg:min-h-screen">
      <slot />
    </main>
  </UDashboardGroup>
</template>

<script setup lang="ts">
const route = useRoute();
const client = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const toast = useToast();

const open = ref(false);

const links = [
  [
    {
      label: "Home",
      icon: "i-heroicons-outline-home",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Events",
      icon: "i-heroicons-outline-calendar",
      to: "/events",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
  [
    {
      label: "Documentation",
      icon: "i-lucide-book-open",
      to: "/docs",
      target: "_blank",
    },
    {
      label: "Support",
      icon: "i-lucide-help-circle",
      to: "/support",
      target: "_blank",
    },
  ],
];

const groups = computed(() => [
  {
    id: "links",
    label: "Navigation",
    items: links.flat(),
  },
]);

// Close sidebar on route change for mobile
watch(route, () => {
  if (window.innerWidth < 960) {
    open.value = false;
  }
});

// Cookie consent toast
onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  toast.add({
    title: "We use cookies to enhance your experience.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accept",
        color: "primary",
        variant: "solid",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Decline",
        color: "gray",
        variant: "ghost",
      },
    ],
  });
});
</script>
