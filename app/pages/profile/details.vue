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
  linkedin: z.string().url(2, "Too short"),
  calendly: z.string().url("Invalid email"),
  phone: z.string().min(10, "Too short"),
});

type ProfileSchema = z.output<typeof profileSchema>;

const details = reactive<Partial<DetailsSchema>>({
  linkedin: "linkedin.com/in/benjamincanac",
  calendly: "calendly.com/benjamincanac",
  phone: "+17328047188",
});
const toast = useToast();
async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  toast.add({
    title: "Success",
    description: "Your profile details have been updated.",
    icon: "i-lucide-check",
    color: "success",
  });
  console.log(event.data);
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
        <UFormField
          name="linkedin"
          label="Linkedin"
          description="enter your linkedin profile url"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput v-model="details.linkedin" autocomplete="off" />
        </UFormField>
        <USeparator />
        <UFormField
          name="calendly"
          label="Calendly"
          description="Enter your calendly booking link"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput v-model="details.calendly" type="text" autocomplete="off" />
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
      </UPageCard>
    </UForm>
  </div>
</template>

<style></style>
