<template>
  <UContainer>
    <div class="space-y-8">
      <!-- Welcome Section -->
      <div>
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
          Welcome back, {{ user?.email?.split("@")[0] }}!
        </h2>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          Here's what's happening with your projects today.
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Active Projects
              </h3>
              <UIcon name="i-lucide-folder" class="w-5 h-5 text-primary-500" />
            </div>
          </template>
          <p class="text-2xl font-semibold">12</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Pending Tasks
              </h3>
              <UIcon
                name="i-lucide-check-square"
                class="w-5 h-5 text-primary-500"
              />
            </div>
          </template>
          <p class="text-2xl font-semibold">24</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Team Members
              </h3>
              <UIcon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
            </div>
          </template>
          <p class="text-2xl font-semibold">8</p>
        </UCard>
      </div>

      <!-- Recent Activity -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-lucide-arrow-right"
              to="/activity"
            >
              View all
            </UButton>
          </div>
        </template>
        <UTable
          :rows="[
            {
              id: 1,
              action: 'Project Created',
              project: 'Website Redesign',
              date: '2 hours ago',
            },
            {
              id: 2,
              action: 'Task Completed',
              project: 'Mobile App',
              date: '4 hours ago',
            },
            {
              id: 3,
              action: 'Comment Added',
              project: 'API Integration',
              date: '1 day ago',
            },
          ]"
          :columns="[
            { id: 'action', key: 'action', label: 'Action' },
            { id: 'project', key: 'project', label: 'Project' },
            { id: 'date', key: 'date', label: 'Date' },
          ]"
        />
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const user = useSupabaseUser();
</script>
