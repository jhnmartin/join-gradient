<script setup lang="ts">
const user = useSupabaseUser();
const supabase = useSupabaseClient();

const { data: profile, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.value.id)
  .single();

if (error) throw error;
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-8">
        <!-- Welcome Section -->
        <div>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome back, {{ profile.full_name }}!
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
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Active Projects
                </h3>
                <UIcon
                  name="i-lucide-folder"
                  class="w-5 h-5 text-primary-500"
                />
              </div>
            </template>
            <p class="text-2xl font-semibold">12</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
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
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Team Members
                </h3>
                <UIcon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
              </div>
            </template>
            <p class="text-2xl font-semibold">8</p>
          </UCard>
        </div>
        <HomeMemberLeads />
      </div>
    </template>
  </UDashboardPanel>
</template>
