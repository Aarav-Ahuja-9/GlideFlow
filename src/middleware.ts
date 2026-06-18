import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes need protection
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  
  '/api/calendar(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Protects the route
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
