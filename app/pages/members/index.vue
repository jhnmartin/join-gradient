<script lang="ts" setup>
const supabase = useSupabaseClient();

// Reactive counts
const activeMembersCount = ref(0);
const leadMembersCount = ref(0);
const potentialLeadsCount = ref(0);

// Function to fetch and update all counts
const updateCounts = async () => {
  try {
    // Fetch active members count
    const { count: activeCount, error: activeMembersError } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (activeMembersError) {
      console.error(
        "Error fetching active members count:",
        activeMembersError.message
      );
    } else {
      activeMembersCount.value = activeCount || 0;
    }

    // Fetch lead members count
    const { count: leadCount, error: leadMembersError } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("status", "lead");

    if (leadMembersError) {
      console.error(
        "Error fetching lead members count:",
        leadMembersError.message
      );
    } else {
      leadMembersCount.value = leadCount || 0;
    }

    // Fetch potential leads count
    const { count: potentialCount, error: potentialLeadsError } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("status", "drop-in");

    if (potentialLeadsError) {
      console.error(
        "Error fetching potential leads count:",
        potentialLeadsError.message
      );
    } else {
      potentialLeadsCount.value = potentialCount || 0;
    }
  } catch (error) {
    console.error("Error updating counts:", error);
  }
};

// Initial load
await updateCounts();

// Realtime subscription for member changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null;

onMounted(() => {
  // Subscribe to realtime changes
  realtimeChannel = supabase
    .channel("members-stats-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "members",
      },
      (_payload: unknown) => {
        console.log("New member added, updating counts");
        updateCounts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "members",
      },
      (_payload: unknown) => {
        console.log("Member updated, updating counts");
        updateCounts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "members",
      },
      (_payload: unknown) => {
        console.log("Member deleted, updating counts");
        updateCounts();
      }
    )
    .subscribe();
});

onUnmounted(() => {
  // Clean up subscription
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <div class="space-y-8">
        <!-- Welcome Section -->
        <div>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
            Gradient Members
          </h2>
          <p class="mt-1 text-gray-600 dark:text-gray-400">
            Use the search functions or columns below to find members.
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
                  Active Members
                </h3>
                <UIcon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
              </div>
            </template>
            <p class="text-2xl font-semibold">{{ activeMembersCount }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Pending Leads
                </h3>
                <UIcon
                  name="i-lucide-user-plus"
                  class="w-5 h-5 text-primary-500"
                />
              </div>
            </template>
            <p class="text-2xl font-semibold">{{ leadMembersCount }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Potential Leads
                </h3>
                <UIcon
                  name="i-lucide-user-pen"
                  class="w-5 h-5 text-primary-500"
                />
              </div>
            </template>
            <p class="text-2xl font-semibold">{{ potentialLeadsCount }}</p>
          </UCard>
        </div>
        <AppMembersListPaginated />
      </div>
    </template>
  </UDashboardPanel>
</template>

<style></style>
