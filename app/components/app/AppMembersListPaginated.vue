<script setup lang="ts">
import { getPaginationRowModel } from "@tanstack/vue-table";
import type { TableColumn } from "@nuxt/ui";

const supabase = useSupabaseClient();
const table = useTemplateRef("table");

// Define the member type based on your database structure
type Member = {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  start_date: string | null;
  membership_plan: string | null;
  membership_status: string | null;
  membership_type: string | null;
  updated_at: string;
  created_at: string;
};

// Pagination state - using client-side pagination now
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
});

// Lazy loading state
const members = ref<Member[]>([]);
const totalMembers = ref(0);
const hasMoreData = ref(true);
const isLoadingMore = ref(false);
const error = ref<Error | null>(null);
const pending = ref(true);
const dataRevision = ref(0); // Force table re-render when data changes

// Fetch members in batches to handle Supabase 1000 row limit
const fetchMembersBatch = async (offset: number = 0, limit: number = 1000) => {
  const {
    data,
    error: fetchError,
    count,
  } = await supabase
    .from("members")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (fetchError) throw fetchError;

  return {
    data: data as Member[],
    total: count || 0,
    hasMore: (data?.length || 0) === limit,
  };
};

// Initial load
const loadInitialData = async () => {
  try {
    pending.value = true;
    error.value = null;

    const result = await fetchMembersBatch(0, 1000);
    members.value = result.data;
    totalMembers.value = result.total;
    hasMoreData.value = result.hasMore;
    dataRevision.value++;
  } catch (err) {
    error.value = err as Error;
  } finally {
    pending.value = false;
  }
};

// Load more data when needed
const loadMoreData = async () => {
  if (!hasMoreData.value || isLoadingMore.value) return;

  try {
    isLoadingMore.value = true;
    const result = await fetchMembersBatch(members.value.length, 1000);

    members.value = [...members.value, ...result.data];
    hasMoreData.value = result.hasMore;
    dataRevision.value++; // Trigger table re-render

    // Force table to refresh its internal state
    await nextTick();
    if (table.value?.tableApi) {
      table.value.tableApi.setPageIndex(pagination.value.pageIndex);
    }
  } catch (err) {
    console.error("Error loading more data:", err);
  } finally {
    isLoadingMore.value = false;
  }
};

// Refresh function
const refresh = async () => {
  members.value = [];
  hasMoreData.value = true;
  dataRevision.value = 0; // Reset revision counter
  await loadInitialData();
};

// Auto-load more data when user gets close to the end
const checkAndLoadMore = () => {
  const currentPage = pagination.value.pageIndex;
  const pageSize = pagination.value.pageSize;
  const currentlyViewing = (currentPage + 1) * pageSize;
  const buffer = pageSize * 2; // Load more when within 2 pages of end

  if (currentlyViewing >= members.value.length - buffer && hasMoreData.value) {
    loadMoreData();
  }
};

// Watch pagination changes to trigger auto-loading
watch(() => pagination.value.pageIndex, checkAndLoadMore);

// Initial load
await loadInitialData();

// Realtime subscription types
interface RealtimePayload {
  new?: Member;
  old?: Member;
}

// Realtime subscription for members table
let realtimeChannel: any = null;

onMounted(() => {
  // Subscribe to realtime changes
  realtimeChannel = supabase
    .channel("members-changes")
    // @ts-ignore - TypeScript definitions for postgres_changes are incomplete
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "members",
      },
      (payload: RealtimePayload) => {
        console.log("New member added:", payload.new);
        if (payload.new) {
          // Add new member to the beginning of the list
          const newMember = payload.new;
          members.value = [newMember, ...members.value];
          totalMembers.value++;
          dataRevision.value++;
        }
      }
    )
    // @ts-ignore - TypeScript definitions for postgres_changes are incomplete
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "members",
      },
      (payload: RealtimePayload) => {
        console.log("Member updated:", payload.new);
        if (payload.new) {
          // Update existing member in the list
          const updatedMember = payload.new;
          const index = members.value.findIndex(
            (m) => m.id === updatedMember.id
          );
          if (index !== -1) {
            members.value[index] = updatedMember;
            dataRevision.value++;
          }
        }
      }
    )
    // @ts-ignore - TypeScript definitions for postgres_changes are incomplete
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "members",
      },
      (payload: RealtimePayload) => {
        console.log("Member deleted:", payload.old);
        if (payload.old) {
          // Remove member from the list
          const deletedMember = payload.old;
          members.value = members.value.filter(
            (m) => m.id !== deletedMember.id
          );
          totalMembers.value--;
          dataRevision.value++;
        }
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

// Table columns definition for Nuxt UI (following working example)
const columns: TableColumn<Member>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.getValue("name") || "N/A",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email") || "N/A",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return h(
        "div",
        {
          class: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            status === "active"
              ? "bg-green-100 text-green-800"
              : status === "inactive"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`,
        },
        status || "Unknown"
      );
    },
  },
  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) => {
      const date = row.getValue("start_date") as string;
      return date ? new Date(date).toLocaleDateString() : "N/A";
    },
  },
  {
    accessorKey: "membership_plan",
    header: "Membership Plan",
    cell: ({ row }) => row.getValue("membership_plan") || "N/A",
  },
  {
    accessorKey: "updated_at",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = row.getValue("updated_at") as string;
      return new Date(date).toLocaleString();
    },
  },
];

// Search/filter state
const searchQuery = ref("");

// Reset pagination when searching
watch(searchQuery, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
});

// Filtered members based on search
const filteredMembers = computed(() => {
  if (!searchQuery.value || !members.value.length) return members.value;

  return members.value.filter(
    (member) =>
      member.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      member.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      member.status?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      member.membership_plan
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase())
  );
});
</script>

<template>
  <div class="flex-1 divide-y divide-accented w-full">
    <!-- Header with search and stats -->
    <div
      class="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3.5"
    >
      <div class="flex items-center gap-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm min-w-[12ch]"
          placeholder="Search name, email, status, plan..."
          icon="i-lucide-search"
        />
        <UButton
          color="neutral"
          variant="outline"
          label="Refresh"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <div class="text-sm text-gray-500">
        showing {{ members.length }} of {{ totalMembers }} members
        <span v-if="isLoadingMore" class="ml-2 flex items-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin w-3 h-3 mr-1" />
          Loading...
        </span>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin" />
      <span class="ml-2">Loading members...</span>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="flex items-center justify-center py-8 text-red-500"
    >
      <UIcon name="i-lucide-alert-triangle" />
      <span class="ml-2">Error loading members: {{ error.message }}</span>
    </div>

    <!-- Table with built-in pagination -->
    <div v-else class="space-y-4 p-4">
      <UTable
        ref="table"
        :key="`members-table-${dataRevision}`"
        v-model:pagination="pagination"
        :data="filteredMembers"
        :columns="columns"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="min-h-96"
      />

      <!-- Pagination Controls -->
      <div class="flex justify-center border-t border-default pt-4">
        <UPagination
          :default-page="
            (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
          "
          :items-per-page="
            table?.tableApi?.getState().pagination.pageSize || 50
          "
          :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>

      <!-- Data loading status -->
      <div
        v-if="!hasMoreData && members.length > 0"
        class="text-center text-sm text-gray-500 py-2"
      >
        All {{ totalMembers }} members loaded
      </div>
      <div
        v-else-if="members.length < totalMembers"
        class="text-center text-sm text-gray-500 py-2"
      >
        Showing {{ members.length }} of {{ totalMembers }} members (more will
        load automatically)
      </div>
    </div>
  </div>
</template>
