export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  // Skip auth check for auth-related pages
  if (
    to.path === "/login" ||
    to.path === "/register" ||
    to.path === "/forgot-password" ||
    to.path === "/confirm"
  ) {
    // If user is already logged in and tries to access auth pages, redirect to home
    if (user.value) {
      return navigateTo("/");
    }
    return;
  }

  // For all other pages, check if user is authenticated
  if (!user.value) {
    return navigateTo("/login");
  }
});
