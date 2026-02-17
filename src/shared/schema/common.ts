import { minLength, object, pipe, string } from "valibot";

/**
 * 共通パスパラメータ: :id（cuid 形式）
 */
export const IdParamSchema = object({
  id: pipe(string(), minLength(1)),
});

/**
 * エラーレスポンス
 */
export const ErrorResponseSchema = object({
  error: string(),
});

/**
 * 成功レスポンス（メッセージのみ）
 */
export const MessageResponseSchema = object({
  message: string(),
});
