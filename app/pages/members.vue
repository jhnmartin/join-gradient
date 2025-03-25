<script lang="ts" setup>
import { getPaginationRowModel } from "@tanstack/vue-table";
import type { TableColumn } from "@nuxt/ui";

const table = useTemplateRef("table");

type member = {
  name: string;
  email: string;
  plan: string;
  startDate: string;
};

const supabase = useSupabaseClient();
const { data: members, error } = await supabase.from("members").select("*");

if (error) {
  console.error("Error fetching members:", error);
}

const data = ref<member[]>([]);

data.value = members
  ? members.map((member) => ({
      name: member.name || "",
      email: member.email || "",
      plan: member.membership_plan || "",
      startDate: member.start_date || "",
    }))
  : [];

const columns: TableColumn[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => `${row.getValue("name")}`,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => `${row.getValue("email")}`,
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ row }) => `${row.getValue("plan")}`,
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      return new Date(row.getValue("startDate")).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    },
  },
];
const globalFilter = ref("");
</script>

<template>
  <div>
    <UDashboardNavbar title="Members">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>
    <UCard>
      <div class="flex px-4 py-3.5 border-b border-(--ui-border-accented)">
        <UInput
          v-model="globalFilter"
          class="max-w-sm"
          placeholder="Filter..."
        />
      </div>
      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        sticky
        :data="data"
        :columns="columns"
        class="flex-1 max-h-[80vh]"
      />
    </UCard>
  </div>
</template>

<style></style>
