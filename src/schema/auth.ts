import {
  email,
  type InferOutput,
  minLength,
  object,
  pipe,
  string,
} from "valibot";

/** POST /admin/auth/login — ログインリクエスト */
export const LoginRequestSchema = object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(1)),
});
export type LoginRequest = InferOutput<typeof LoginRequestSchema>;

/** POST /admin/auth/login — ログインレスポンス */
export const LoginResponseSchema = object({
  message: string(),
});

/** POST /admin/auth/logout — ログアウトレスポンス */
export const LogoutResponseSchema = object({
  message: string(),
});

/** GET /admin/auth/me — セッション確認レスポンス */
export const MeResponseSchema = object({
  id: string(),
  email: pipe(string(), email()),
});
