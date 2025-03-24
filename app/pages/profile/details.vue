<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const fileRef = ref<HTMLInputElement>();
const user = useSupabaseUser();
const supabase = useSupabaseClient();

const { data: userData } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.value?.id)
  .single();

console.log(user);

const detailsSchema = z.object({
  job_title: z.string().min(2, "Too short"),
  pronouns: z.string().optional().or(z.literal("")),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  calendly: z.string().url("Invalid URL").optional().or(z.literal("")),
  phone: z.string().min(10, "Too short"),
});

type DetailsSchema = z.output<typeof detailsSchema>;

const details = reactive<Partial<DetailsSchema>>({
  job_title: userData?.job_title || "",
  pronouns: userData?.pronouns || "",
  linkedin: userData?.linkedin || "",
  calendly: userData?.calendly || "",
  phone: userData?.phone || "",
});
const toast = useToast();
async function onSubmit(event: FormSubmitEvent<DetailsSchema>) {
  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        job_title: event.data.job_title,
        pronouns: event.data.pronouns,
        linkedin: event.data.linkedin,
        calendly: event.data.calendly,
        phone: event.data.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.value?.id);

    if (updateError) {
      throw updateError;
    }

    toast.add({
      title: "Success",
      description: "Your profile details have been updated.",
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    console.error("Error updating profile details:", error);
    toast.add({
      title: "Error",
      description: "Failed to update details. Please try again.",
      icon: "i-lucide-x",
      color: "red",
    });
  }
}

const links = [
  [
    {
      label: "General",
      icon: "i-heroicons-outline-user",
      to: "/profile",
      exact: true,
    },
    {
      label: "Details",
      icon: "i-heroicons-outline-pencil",
      to: "/profile/details",
    },
    {
      label: "Email Signature",
      icon: "i-heroicons-outline-envelope",
      to: "/profile/email-signature",
    },
    {
      label: "Personal Settings",
      icon: "i-heroicons-bell",
      to: "/profile/personal-settings",
    },
  ],
  [],
];
</script>

<template>
  <div>
    <UForm
      id="settings"
      :schema="detailsSchema"
      :state="details"
      @submit="onSubmit"
    >
      <UPageCard
        title="Details"
        description="These informations will be displayed publicly."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      >
        <UButton
          form="settings"
          label="Save changes"
          color="neutral"
          type="submit"
          class="w-fit lg:ms-auto"
        />
      </UPageCard>

      <UPageCard variant="subtle">
        <!-- Required Fields -->
        <UCard>
          <template #header>
            <div class="font-medium text-lg">Required Information</div>
          </template>
          <UFormField
            name="job_title"
            label="Job Title"
            description="Your role or position in the organization"
            required
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="details.job_title" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            name="phone"
            label="Phone Number"
            description="Enter your phone number"
            required
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="details.phone" type="tel" autocomplete="off" />
          </UFormField>
        </UCard>

        <div class="my-4" />

        <!-- Optional Fields -->
        <UCard>
          <template #header>
            <div class="font-medium text-lg">Optional Information</div>
          </template>
          <UFormField
            name="pronouns"
            label="Pronouns"
            description="Your preferred pronouns"
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="details.pronouns" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            name="linkedin"
            label="LinkedIn"
            description="Enter your LinkedIn profile URL"
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="details.linkedin" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            name="calendly"
            label="Calendly"
            description="Enter your Calendly booking link"
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="details.calendly" type="text" autocomplete="off" />
          </UFormField>
        </UCard>
      </UPageCard>
    </UForm>
  </div>
</template>

<style></style>
