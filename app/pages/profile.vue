<script setup lang="ts">
const links = [
  [
    {
      label: "General",
      icon: "i-heroicons-outline-user",
      to: "/profile",
      exact: true,
    },
    {
      label: "Details",
      icon: "i-heroicons-outline-pencil",
      to: "/profile/details",
    },
    {
      label: "Email Signature",
      icon: "i-heroicons-outline-envelope",
      to: "/profile/email-signature",
    },
    {
      label: "Personal Settings",
      icon: "i-heroicons-bell",
      to: "/profile/personal-settings",
    },
  ],
  [],
];
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div
        class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto"
      >
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
