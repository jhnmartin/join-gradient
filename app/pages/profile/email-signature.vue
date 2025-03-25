<script lang="ts" setup>
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const toast = useToast();

const { data: userData } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.value?.id)
  .single();

const { data: orgData } = await supabase
  .from("organizations")
  .select("*")
  .eq("id", "52645d75-7bb4-47c8-b3b9-2ad1767d71b5")
  .single();

const signatureHtml = computed(() => {
  const template = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
  </head>
  <body style="width: 520px; margin: 0; padding: 0;">
    <table id="zs-output-sig" border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse; width:500px;">
      <tbody>
        <tr>
          <td style="padding: 16px !important; width: inherit; height: inherit;">
            <table id="inner-table" border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
              <tbody>
                <tr>
                  <td width="119" style="padding-right: 20px; width: inherit; height: inherit;">
                    <table border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
                      <tbody>
                        <tr>
                          <td style="border-collapse: collapse; line-height: 0px; padding-right: 1px; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              <img height="119" width="119" alt="organization logo" border="0" src="${
                                orgData?.logo_url || ""
                              }">
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style="padding: 0px !important; width: inherit; height: inherit;">
                    <table border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
                      <tbody>
                        <tr>
                          <td style="border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 16px; font-style: normal; line-height: 18px; font-weight: 600; padding: 0px !important; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:17px;font-style:normal;line-height:19px;font-weight:700;color:#21211d;display:inline;">${
                                userData?.full_name || ""
                              }</span>
                              ${
                                userData?.pronouns
                                  ? `<span style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-style:normal;line-height:19px;font-weight:400;color:rgba(33,33,29,0.75);display:inline;margin-left:4px;">${userData.pronouns}</span>`
                                  : ""
                              }
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 12px; font-style: normal; line-height: 14px; font-weight: 400; padding-bottom: 16px; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:14px;font-style:normal;line-height:16px;font-weight:500;color:#21211d;display:inline;">${
                                userData?.job_title || ""
                              }</span>
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
                      <tbody>
                        <tr>
                          <td style="border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 12px; font-style: normal; line-height: 14px; font-weight: 400; padding: 0px !important; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-style:normal;line-height:14px;font-weight:400;color:#21211d;display:inline;">${
                                orgData?.street_address || ""
                              },</span>
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-style:normal;line-height:14px;font-weight:400;color:#21211d;display:inline;">${
                                orgData?.city || ""
                              }&nbsp;</span>
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-style:normal;line-height:14px;font-weight:400;color:#21211d;display:inline;">${
                                orgData?.state || ""
                              }&nbsp;</span>
                              <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-style:normal;line-height:14px;font-weight:400;color:#21211d;display:inline;">${
                                orgData?.zip_code || ""
                              }&nbsp;</span>
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
                      <tbody>
                        <tr>
                          <td style="border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 12px; font-style: normal; line-height: 14px; font-weight: 400; padding: 0px !important; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              <a href="${
                                orgData?.website_url || ""
                              }" style="text-decoration: none;">
                                <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-style:normal;line-height:14px;font-weight:400;color:#21211d;display:inline;">${
                                  orgData?.website_name || ""
                                }</span>
                              </a>
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;line-height:0px;font-size:1px;padding:0px!important;border-spacing:0px;margin:0px;border-collapse:collapse;">
                      <tbody>
                        <tr>
                          <td style="padding-top: 16px; width: inherit; height: inherit;">
                            <p style="margin: 0.04px;">
                              ${
                                userData?.phone
                                  ? `<a href="tel:${userData.phone}" style="text-decoration: none; margin-right: 8px; display: inline-block;"><img height="20" width="20" alt="phone" border="0" src="https://bwaibjmfdhfjkqjrrzoh.supabase.co/storage/v1/object/public/icons//heroicons--phone-20-solid%202.png"></a>`
                                  : ""
                              }
                              ${
                                userData?.email
                                  ? `<a href="mailto:${userData.email}" style="text-decoration: none; margin-right: 8px; display: inline-block;"><img height="20" width="20" alt="email" border="0" src="https://bwaibjmfdhfjkqjrrzoh.supabase.co/storage/v1/object/public/icons//heroicons--envelope-16-solid%202.png"></a>`
                                  : ""
                              }
                              ${
                                userData?.linkedin
                                  ? `<a href="${userData.linkedin}" style="text-decoration: none; margin-right: 8px; display: inline-block;"><img height="20" width="20" alt="linkedin" border="0" src="https://bwaibjmfdhfjkqjrrzoh.supabase.co/storage/v1/object/public/icons//fa6-brands--linkedin%202.png"></a>`
                                  : ""
                              }
                              ${
                                userData?.calendly
                                  ? `<a href="${userData.calendly}" style="text-decoration: none; margin-right: 8px; display: inline-block;"><img height="20" width="20" alt="calendar" border="0" src="https://bwaibjmfdhfjkqjrrzoh.supabase.co/storage/v1/object/public/icons//simple-icons--calendly%202.png"></a>`
                                  : ""
                              }
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td style="border-collapse: collapse; padding-bottom: 16px; width: inherit; height: inherit;">
            <span></span>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
  return template;
});

const copySignature = async () => {
  try {
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = signatureHtml.value;

    // Create a temporary textarea to copy the content
    const textarea = document.createElement("textarea");
    textarea.value = tempDiv.innerHTML;
    document.body.appendChild(textarea);
    textarea.select();

    // Copy the selected text
    await navigator.clipboard.writeText(textarea.value);

    // Clean up
    document.body.removeChild(textarea);

    toast.add({
      title: "Success",
      description: "Email signature copied to clipboard",
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to copy signature:", error);
    toast.add({
      title: "Error",
      description: "Failed to copy signature",
      icon: "i-lucide-x",
      color: "red",
    });
  }
};
</script>

<template>
  <div>
    <UPageCard
      title="Email Signature"
      description="Your email signature template"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Copy Signature"
        color="neutral"
        class="w-fit lg:ms-auto cursor-pointer"
        @click="copySignature"
      />
    </UPageCard>

    <!-- Email Signature Template -->
    <UPageCard variant="subtle">
      <div class="p-4 bg-white rounded-lg">
        <div class="email-signature-template" v-html="signatureHtml" />
      </div>
    </UPageCard>
  </div>
</template>

<style>
.email-signature-template {
  max-width: 500px;
  margin: 0 auto;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
