<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const data = ref([]);
const loading = ref(true);

async function fetchMembers() {
  try {
    const { data: members, error } = await supabase
      .from("members")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching members:", error.message);
      return;
    }

    data.value = members
      ? members.map((member) => ({
          name: member.name || "",
          email: member.email || "",
          plan: member.membership_plan || "",
          startDate: member.start_date || "",
        }))
      : [];

    console.log("Processed data:", data.value);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    loading.value = false;
  }
}

await fetchMembers();

const columns = [
  {
    key: "name",
    label: "Name",
  },
  {
    key: "email",
    label: "Email",
  },
  {
    key: "startDate",
    label: "Start Date",
  },
];
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

        <!-- Recent Activity -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Newest Members
              </h3>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-lucide-arrow-right"
                to="/members"
              >
                View all
              </UButton>
            </div>
          </template>
          <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
          </div>
          <div
            v-else-if="!data || data.length === 0"
            class="text-center py-4 text-gray-500"
          >
            No members found
          </div>
          <UTable v-else :data="data" class="mt-2" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
