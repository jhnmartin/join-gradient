<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900"
  >
    <UCard class="w-full max-w-md">
      <UCardBody class="flex flex-col items-center space-y-4">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
        <p class="text-lg font-medium">Verifying your authentication...</p>
      </UCardBody>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const client = useSupabaseClient();
const router = useRouter();
const toast = useToast();

onMounted(async () => {
  try {
    const { error } = await client.auth.getSession();
    if (error) throw error;

    // Handle both OAuth and email confirmation
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) throw new Error("No user found");

    toast.add({
      title: "Success",
      description: "Authentication successful",
      color: "green",
    });

    // Redirect to home page
    await router.push("/");
  } catch (error: unknown) {
    toast.add({
      title: "Error",
      description:
        error instanceof Error ? error.message : "Authentication failed",
      color: "red",
    });
    await router.push("/login");
  }
});
</script>
