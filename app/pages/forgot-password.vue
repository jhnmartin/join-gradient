<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900"
  >
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        title="Reset Password"
        description="Enter your email and we'll send you instructions to reset your password."
        icon="i-lucide-key"
        :fields="fields"
        :loading="loading"
        submit-label="Send Reset Link"
        @submit="onSubmit"
      >
        <template #footer>
          <div
            class="flex flex-col items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
          >
            <div>
              Remember your password?
              <NuxtLink
                to="/login"
                class="text-primary-500 hover:text-primary-600"
              >
                Back to login
              </NuxtLink>
            </div>
          </div>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: false,
});

const client = useSupabaseClient();
const router = useRouter();
const toast = useToast();
const loading = ref(false);

const fields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
];

const schema = z.object({
  email: z.string().email("Invalid email"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true;
    const { error } = await client.auth.resetPasswordForEmail(
      event.data.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) throw error;

    toast.add({
      title: "Success",
      description: "Please check your email for password reset instructions",
      color: "green",
    });
    await router.push("/login");
  } catch (error: unknown) {
    toast.add({
      title: "Error",
      description:
        error instanceof Error ? error.message : "Failed to send reset link",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
}
</script>
