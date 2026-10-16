import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(1, "Enter your password.").max(1024),
  captchaToken: z.string().min(1, "Complete the security check.").max(2048),
});