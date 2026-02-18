/**
 * リクエストの Origin が許可リストに含まれるか判定する。
 * allowedOrigins はカンマ区切りの文字列で、`*` によるワイルドカードに対応する。
 * 例: "https://survey.nisshi.dev,https://nisshi-dev-survey-*.vercel.app"
 */
export function isAllowedOrigin(
  origin: string,
  allowedOrigins: string
): boolean {
  if (!allowedOrigins) {
    return false;
  }

  return allowedOrigins.split(",").some((pattern) => {
    const trimmed = pattern.trim();
    if (!trimmed) {
      return false;
    }

    if (!trimmed.includes("*")) {
      return origin === trimmed;
    }

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escaped.replace(/\\\*/g, "[^.]*")}$`);
    return regex.test(origin);
  });
}
