import {
  email,
  type InferOutput,
  minLength,
  object,
  pipe,
  string,
} from "valibot";

/** POST /api/admin/auth/login — ログインリクエスト */
export const LoginRequestSchema = object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(1)),
});
export type LoginRequest = InferOutput<typeof LoginRequestSchema>;

/** POST /api/admin/auth/login — ログインレスポンス */
export const LoginResponseSchema = object({
  message: string(),
});

/** POST /api/admin/auth/logout — ログアウトレスポンス */
export const LogoutResponseSchema = object({
  message: string(),
});

/** GET /api/admin/auth/me — セッション確認レスポンス */
export const MeResponseSchema = object({
  id: string(),
  email: pipe(string(), email()),
});
