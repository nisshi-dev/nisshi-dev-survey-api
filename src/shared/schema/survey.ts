import {
  array,
  boolean,
  email,
  type InferOutput,
  literal,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  record,
  regex,
  string,
  union,
  variant,
} from "valibot";

// ── 定数 ──

/** 「その他」選択時の内部値。FormData 上でのみ使用し、サーバーには送信しない */
export const OTHER_VALUE = "__other__";

// ── 質問スキーマ ──

export const TextQuestionSchema = object({
  type: literal("text"),
  id: string(),
  label: string(),
  required: optional(boolean(), false),
});

export const RadioQuestionSchema = object({
  type: literal("radio"),
  id: string(),
  label: string(),
  options: array(string()),
  required: optional(boolean(), false),
  allowOther: optional(boolean(), false),
});

export const CheckboxQuestionSchema = object({
  type: literal("checkbox"),
  id: string(),
  label: string(),
  options: array(string()),
  required: optional(boolean(), false),
  allowOther: optional(boolean(), false),
});

export const QuestionSchema = variant("type", [
  TextQuestionSchema,
  RadioQuestionSchema,
  CheckboxQuestionSchema,
]);

export const QuestionsSchema = array(QuestionSchema);

// ── 型導出 ──

export type Question = InferOutput<typeof QuestionSchema>;
export type TextQuestion = InferOutput<typeof TextQuestionSchema>;
export type RadioQuestion = InferOutput<typeof RadioQuestionSchema>;
export type CheckboxQuestion = InferOutput<typeof CheckboxQuestionSchema>;

// ── パラメータスキーマ ──

export const SurveyParamSchema = object({
  key: pipe(string(), minLength(1), regex(/^[a-zA-Z0-9_-]+$/)),
  label: pipe(string(), minLength(1)),
  visible: boolean(),
});

export const SurveyParamsSchema = array(SurveyParamSchema);

export type SurveyParam = InferOutput<typeof SurveyParamSchema>;

// ── データエントリスキーマ ──

/** データエントリの values: Record<string, string> */
export const DataEntryValuesSchema = record(string(), string());
export type DataEntryValues = InferOutput<typeof DataEntryValuesSchema>;

/** POST /api/admin/surveys/:id/data-entries — データエントリ作成 */
export const CreateDataEntrySchema = object({
  values: DataEntryValuesSchema,
  label: optional(pipe(string(), maxLength(200))),
});
export type CreateDataEntryInput = InferOutput<typeof CreateDataEntrySchema>;

/** PUT /api/admin/surveys/:id/data-entries/:entryId — データエントリ更新 */
export const UpdateDataEntrySchema = object({
  values: DataEntryValuesSchema,
  label: optional(pipe(string(), maxLength(200))),
});
export type UpdateDataEntryInput = InferOutput<typeof UpdateDataEntrySchema>;

/** データエントリレスポンス（一覧の各要素） */
export const DataEntryResponseSchema = object({
  id: string(),
  surveyId: string(),
  values: DataEntryValuesSchema,
  label: optional(nullable(string())),
  responseCount: number(),
  createdAt: string(),
});
export type DataEntryResponse = InferOutput<typeof DataEntryResponseSchema>;

/** GET /api/admin/surveys/:id/data-entries — データエントリ一覧レスポンス */
export const DataEntryListResponseSchema = object({
  dataEntries: array(DataEntryResponseSchema),
});

// ── ステータス ──

export const SURVEY_STATUSES = ["draft", "active", "completed"] as const;
export const SurveyStatusSchema = picklist(SURVEY_STATUSES);
export type SurveyStatus = InferOutput<typeof SurveyStatusSchema>;

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "下書き",
  active: "受付中",
  completed: "完了",
} as const;

/** PATCH /api/admin/surveys/:id — ステータス更新リクエスト */
export const UpdateSurveyStatusSchema = object({
  status: SurveyStatusSchema,
});

/** PUT /api/admin/surveys/:id — アンケート内容更新リクエスト */
export const UpdateSurveySchema = object({
  title: pipe(string(), minLength(1)),
  description: optional(pipe(string(), maxLength(10_000))),
  questions: QuestionsSchema,
  params: optional(SurveyParamsSchema),
});
export type UpdateSurveyInput = InferOutput<typeof UpdateSurveySchema>;

// ── データ投入 API スキーマ ──

/** POST /api/data/surveys — アンケート作成（status 指定可） */
export const DataCreateSurveySchema = object({
  title: pipe(string(), minLength(1)),
  description: optional(pipe(string(), maxLength(10_000))),
  questions: QuestionsSchema,
  params: optional(SurveyParamsSchema),
  status: optional(picklist(["draft", "active"])),
});
export type DataCreateSurveyInput = InferOutput<typeof DataCreateSurveySchema>;

/** POST /api/data/surveys/:id/responses — 回答一括送信 */
export const DataSubmitResponsesSchema = object({
  responses: pipe(
    array(
      object({
        answers: record(string(), union([string(), array(string())])),
        params: optional(record(string(), string())),
        dataEntryId: optional(string()),
      })
    ),
    minLength(1)
  ),
});
export type DataSubmitResponsesInput = InferOutput<
  typeof DataSubmitResponsesSchema
>;

// ── API リクエスト / レスポンス ──

/** POST /api/admin/surveys — アンケート作成リクエスト */
export const CreateSurveySchema = object({
  title: pipe(string(), minLength(1)),
  description: optional(pipe(string(), maxLength(10_000))),
  questions: QuestionsSchema,
  params: optional(SurveyParamsSchema),
});
export type CreateSurveyInput = InferOutput<typeof CreateSurveySchema>;

/** POST /api/survey/:id/submit — 回答送信リクエスト */
export const SubmitAnswersSchema = object({
  answers: record(string(), union([string(), array(string())])),
  params: optional(record(string(), string())),
  dataEntryId: optional(string()),
  sendCopy: optional(boolean()),
  respondentEmail: optional(pipe(string(), email())),
});
export type SubmitAnswersInput = InferOutput<typeof SubmitAnswersSchema>;

/** GET /api/survey/:id — アンケート取得レスポンス */
export const SurveyResponseSchema = object({
  id: string(),
  title: string(),
  description: optional(nullable(string())),
  status: SurveyStatusSchema,
  questions: QuestionsSchema,
  params: optional(SurveyParamsSchema),
  dataEntries: optional(
    array(
      object({
        id: string(),
        values: DataEntryValuesSchema,
        label: optional(nullable(string())),
      })
    )
  ),
});
export type SurveyResponse = InferOutput<typeof SurveyResponseSchema>;

/** POST /api/survey/:id/submit — 回答送信成功レスポンス */
export const SubmitSuccessResponseSchema = object({
  success: boolean(),
  surveyId: string(),
});

/** GET /api/admin/surveys — アンケート一覧レスポンス */
export const SurveyListResponseSchema = object({
  surveys: array(
    object({
      id: string(),
      title: string(),
      status: SurveyStatusSchema,
      createdAt: string(),
    })
  ),
});

/** GET /api/admin/surveys/:id — アンケート詳細レスポンス */
export const AdminSurveyResponseSchema = object({
  id: string(),
  title: string(),
  description: optional(nullable(string())),
  status: SurveyStatusSchema,
  createdAt: string(),
  questions: QuestionsSchema,
  params: optional(SurveyParamsSchema),
  dataEntries: optional(array(DataEntryResponseSchema)),
});

/** GET /api/admin/surveys/:id/responses — 回答一覧レスポンス */
export const SurveyResponsesSchema = object({
  surveyId: string(),
  responses: array(
    object({
      id: string(),
      answers: record(string(), union([string(), array(string())])),
      params: optional(record(string(), string())),
      dataEntryId: optional(nullable(string())),
    })
  ),
});
