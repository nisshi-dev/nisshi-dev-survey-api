import { email, object, pipe, string } from "valibot";

/** GET /admin/auth/me — セッション確認レスポンス */
export const MeResponseSchema = object({
  id: string(),
  email: pipe(string(), email()),
});
