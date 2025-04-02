<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900"
  >
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        title="Create an account"
        description="Sign up to get started with your new account."
        icon="i-lucide-user-plus"
        :fields="fields"
        :providers="providers"
        :loading="loading"
        @submit="onSubmit"
      >
        <template #footer>
          <div
            class="flex flex-col items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
          >
            <div>
              Already have an account?
              <NuxtLink
                to="/login"
                class="text-primary-500 hover:text-primary-600"
              >
                Sign in
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
  {
    name: "password",
    type: "password" as const,
    label: "Password",
    placeholder: "Create a password",
    required: true,
  },
  {
    name: "confirmPassword",
    type: "password" as const,
    label: "Confirm Password",
    placeholder: "Confirm your password",
    required: true,
  },
];

const providers = [
  {
    label: "Google",
    icon: "i-simple-icons-google",
    onClick: async () => {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/confirm`,
          },
        });
        if (error) throw error;
      } catch (error: unknown) {
        toast.add({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to sign up with Google",
          color: "red",
        });
      }
    },
  },
  {
    label: "GitHub",
    icon: "i-simple-icons-github",
    onClick: async () => {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo: `${window.location.origin}/confirm`,
          },
        });
        if (error) throw error;
      } catch (error: unknown) {
        toast.add({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to sign up with GitHub",
          color: "red",
        });
      }
    },
  },
];

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Schema = z.output<typeof schema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true;
    const { error } = await client.auth.signUp({
      email: event.data.email,
      password: event.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    });

    if (error) throw error;

    toast.add({
      title: "Success",
      description: "Please check your email to confirm your account",
      color: "green",
    });
    await router.push("/login");
  } catch (error: unknown) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to sign up",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
}
</script>
