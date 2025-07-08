<script lang="ts" setup>
const supabase = useSupabaseClient();

// Define proper types for the processed member data
interface ProcessedMember {
  name: string;
  email: string;
  status: string;
}

// Define the member type from database
interface Member {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  updated_at: string;
  created_at: string;
}

// Reactive data
const data = ref<ProcessedMember[]>([]);
const potentialData = ref<ProcessedMember[]>([]);
const loading = ref(true);

// Function to fetch member leads
const fetchMemberLeads = async () => {
  try {
    const { data: memberLeads, error } = await supabase
      .from("members")
      .select("*")
      .eq("status", "lead");

    if (error) {
      console.error("Error fetching member leads:", error.message);
      return;
    }

    data.value = (memberLeads as Member[])
      ? (memberLeads as Member[]).map((member) => ({
          name: member.name || "",
          email: member.email || "",
          status: member.status || "",
        }))
      : [];
  } catch (error) {
    console.error("Error fetching member leads:", error);
  }
};

// Function to fetch potential leads
const fetchPotentialLeads = async () => {
  try {
    const { data: potentialLeads, error: potentialError } = await supabase
      .from("members")
      .select("*")
      .eq("status", "drop-in")
      .order("updated_at", { ascending: false })
      .limit(15);

    if (potentialError) {
      console.error("Error fetching potential leads:", potentialError.message);
      return;
    }

    potentialData.value = (potentialLeads as Member[])
      ? (potentialLeads as Member[]).map((member) => ({
          name: member.name || "",
          email: member.email || "",
          status: member.status || "",
        }))
      : [];
  } catch (error) {
    console.error("Error fetching potential leads:", error);
  }
};

// Function to refresh all data
const refreshData = async () => {
  await Promise.all([fetchMemberLeads(), fetchPotentialLeads()]);
};

// Initial load
await refreshData();
loading.value = false;

// Realtime subscription for member changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null;

onMounted(() => {
  // Subscribe to realtime changes
  realtimeChannel = supabase
    .channel("home-member-leads-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "members",
      },
      (_payload: unknown) => {
        console.log("New member added, refreshing dashboard data");
        refreshData();
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
        console.log("Member updated, refreshing dashboard data");
        refreshData();
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
        console.log("Member deleted, refreshing dashboard data");
        refreshData();
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
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Member Leads
          </h3>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-right"
            to="/members"
          >
            View All Members
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
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Potential Leads
          </h3>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-right"
            to="/members"
          >
            View All
          </UButton>
        </div>
      </template>
      <div v-if="loading" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <div
        v-else-if="!potentialData || potentialData.length === 0"
        class="text-center py-4 text-gray-500"
      >
        No members found
      </div>
      <UTable v-else :data="potentialData" class="mt-2" />
    </UCard>
  </div>
</template>

<style></style>
