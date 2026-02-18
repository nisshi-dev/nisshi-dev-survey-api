import { safeParse } from "valibot";
import {
  type Question,
  QuestionsSchema,
  type SurveyParam,
  SurveyParamsSchema,
} from "../schema/survey.js";

/**
 * JSON カラムから SurveyParam[] をパースする。
 * 不正な値の場合は空配列を返す。
 */
export function parseSurveyParams(raw: unknown): SurveyParam[] {
  const result = safeParse(SurveyParamsSchema, raw);
  return result.success ? result.output : [];
}

/**
 * JSON カラムから Question[] をパースする。
 * 不正な値の場合は空配列を返す。
 */
export function parseQuestions(raw: unknown): Question[] {
  const result = safeParse(QuestionsSchema, raw);
  return result.success ? result.output : [];
}

/**
 * 管理画面向けアンケートレスポンスの共通フィールドを構築する。
 * dataEntries 等の追加フィールドは呼び出し元でスプレッドして追加する。
 */
export function buildAdminSurveyResponse(survey: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  questions: unknown;
  params: unknown;
}) {
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    status: survey.status,
    createdAt: survey.createdAt.toISOString(),
    questions: parseQuestions(survey.questions),
    params: parseSurveyParams(survey.params),
  };
}

/**
 * データエントリレスポンスオブジェクトを構築する。
 */
export function buildDataEntryResponse(
  entry: {
    id: string;
    surveyId: string;
    values: unknown;
    label: string | null;
    createdAt: Date;
  },
  responseCount: number
) {
  return {
    id: entry.id,
    surveyId: entry.surveyId,
    values: entry.values as Record<string, string>,
    label: entry.label,
    responseCount,
    createdAt: entry.createdAt.toISOString(),
  };
}

/**
 * データエントリの values キーがアンケートの params 定義と一致するか検証する。
 * 不正なキーがある場合はエラーメッセージを返し、問題なければ null を返す。
 */
export function validateDataEntryKeys(
  values: Record<string, string>,
  surveyParams: unknown
): string | null {
  const params = parseSurveyParams(surveyParams);
  const paramKeys = new Set(params.map((p) => p.key));
  const invalidKeys = Object.keys(values).filter((k) => !paramKeys.has(k));
  if (invalidKeys.length > 0) {
    return `Invalid keys: ${invalidKeys.join(", ")}. Allowed keys: ${[...paramKeys].join(", ")}`;
  }
  return null;
}
