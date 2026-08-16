// lib/defaults.ts
// Built-in fallbacks so a fresh deployment works instantly, even before any
// Environment Variable / Admin Panel setup. Env values always win.

export const DEFAULT_ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "pwmarcofounder@gmail.com";

export const DEFAULT_ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "Apexmarco@22";

/** Default global PenPencil (pw.live) tokens — change them from Admin -> Settings. */
export const DEFAULT_PENPENCIL_TOKEN =
  process.env.PENPENCIL_TOKEN ||
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3ODYyNjcwMDQsImV4cCI6MTc4Njg3MTgwNC44MSwiZGF0YSI6eyJfaWQiOiI2NDhiMjhhMjQ3N2VlZDAwMTg2OGM3YWEiLCJ1c2VybmFtZSI6Ijc4NzczMDQ2NTgiLCJmaXJzdE5hbWUiOiJQYW5rYWogamFpbiIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sImVtYWlsIjoiIiwicm9sZXMiOlsiNWIyN2JkOTY1ODQyZjk1MGE3NzhjNmVmIl0sImNvdW50cnlHcm91cCI6IklOIiwib25lUm9sZXMiOltdLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiIyWDR3RDFpQ1JWQ1UzY2VheUE4eUZ3XzY0OGIyOGEyNDc3ZWVkMDAxODY4YzdhYSJ9.3T2a5ujH-9JZTEksf3f457kOmdq4o5rhzhy8LdrDECE";

export const DEFAULT_PENPENCIL_REFRESH_TOKEN =
  process.env.PENPENCIL_REFRESH_TOKEN ||
  "7ff64e3273259bf9f9474860e37e081719792ae8d0d94d4a518eef6d8ef19cf4";

export const DEFAULT_PENPENCIL_RANDOM_ID =
  process.env.PENPENCIL_RANDOM_ID || "e9a49f10-5b6e-4422-9c20-fbff9b4ff9a8";

/** Fallback JWT secret so cookies work even if JWT_SECRET env is missing. */
export const JWT_SECRET_VALUE =
  process.env.JWT_SECRET || "pw-marco-default-jwt-secret-change-me";
