import { safeParse } from "valibot";
import { describe, expect, test } from "vitest";
import {
  AdminSurveyResponseSchema,
  CheckboxQuestionSchema,
  CreateDataEntrySchema,
  CreateSurveySchema,
  DataCreateSurveySchema,
  DataEntryListResponseSchema,
  DataEntryResponseSchema,
  DataEntryValuesSchema,
  DataSubmitResponsesSchema,
  OTHER_VALUE,
  RadioQuestionSchema,
  SURVEY_STATUS_LABELS,
  SURVEY_STATUSES,
  SubmitAnswersSchema,
  SurveyListResponseSchema,
  SurveyParamSchema,
  SurveyParamsSchema,
  SurveyResponseSchema,
  SurveyResponsesSchema,
  SurveyStatusSchema,
  TextQuestionSchema,
  UpdateDataEntrySchema,
  UpdateSurveySchema,
  UpdateSurveyStatusSchema,
} from "./survey";

describe("CreateSurveySchema", () => {
  const validQuestions = [{ type: "text" as const, id: "q1", label: "質問" }];

  test("description なしでバリデーション通過", () => {
    const result = safeParse(CreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
    });
    expect(result.success).toBe(true);
  });

  test("description ありでバリデーション通過", () => {
    const result = safeParse(CreateSurveySchema, {
      title: "テスト",
      description: "## 説明\nこれはテストです",
      questions: validQuestions,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.description).toBe("## 説明\nこれはテストです");
    }
  });

  test("description が 10000 文字を超えると失敗", () => {
    const result = safeParse(CreateSurveySchema, {
      title: "テスト",
      description: "a".repeat(10_001),
      questions: validQuestions,
    });
    expect(result.success).toBe(false);
  });
});

describe("SurveyStatusSchema", () => {
  test("有効なステータスでバリデーション通過", () => {
    for (const status of SURVEY_STATUSES) {
      const result = safeParse(SurveyStatusSchema, status);
      expect(result.success).toBe(true);
    }
  });

  test("無効なステータスでバリデーション失敗", () => {
    const result = safeParse(SurveyStatusSchema, "invalid");
    expect(result.success).toBe(false);
  });

  test("全ステータスに日本語ラベルがある", () => {
    for (const status of SURVEY_STATUSES) {
      expect(SURVEY_STATUS_LABELS[status]).toBeDefined();
    }
  });
});

describe("UpdateSurveyStatusSchema", () => {
  test("有効なステータスでバリデーション通過", () => {
    const result = safeParse(UpdateSurveyStatusSchema, { status: "active" });
    expect(result.success).toBe(true);
  });

  test("無効なステータスでバリデーション失敗", () => {
    const result = safeParse(UpdateSurveyStatusSchema, { status: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("SurveyResponseSchema", () => {
  test("status を含むレスポンスでバリデーション通過", () => {
    const result = safeParse(SurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "質問" }],
    });
    expect(result.success).toBe(true);
  });

  test("description なし（undefined）でもバリデーション通過", () => {
    const result = safeParse(SurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "active",
      questions: [{ type: "text", id: "q1", label: "質問" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("SurveyListResponseSchema", () => {
  test("status と createdAt を含む一覧でバリデーション通過", () => {
    const result = safeParse(SurveyListResponseSchema, {
      surveys: [
        {
          id: "s1",
          title: "テスト",
          status: "draft",
          createdAt: "2026-02-15T00:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("AdminSurveyResponseSchema", () => {
  test("status と createdAt を含むレスポンスでバリデーション通過", () => {
    const result = safeParse(AdminSurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      description: "管理者向け説明",
      status: "draft",
      createdAt: "2026-02-15T00:00:00.000Z",
      questions: [{ type: "text", id: "q1", label: "質問" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.description).toBe("管理者向け説明");
      expect(result.output.status).toBe("draft");
    }
  });

  test("params 付きレスポンスでバリデーション通過", () => {
    const result = safeParse(AdminSurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "draft",
      createdAt: "2026-02-15T00:00:00.000Z",
      questions: [{ type: "text", id: "q1", label: "質問" }],
      params: [{ key: "version", label: "バージョン", visible: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.params).toEqual([
        { key: "version", label: "バージョン", visible: true },
      ]);
    }
  });
});

describe("SurveyParamSchema", () => {
  test("有効なパラメータでバリデーション通過", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "version",
      label: "バージョン",
      visible: true,
    });
    expect(result.success).toBe(true);
  });

  test("key にハイフンとアンダースコアを含む場合通過", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "event_date-v2",
      label: "イベント日",
      visible: false,
    });
    expect(result.success).toBe(true);
  });

  test("key に日本語を含む場合失敗", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "バージョン",
      label: "バージョン",
      visible: true,
    });
    expect(result.success).toBe(false);
  });

  test("key にスペースを含む場合失敗", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "my key",
      label: "ラベル",
      visible: true,
    });
    expect(result.success).toBe(false);
  });

  test("key が空文字の場合失敗", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "",
      label: "ラベル",
      visible: true,
    });
    expect(result.success).toBe(false);
  });

  test("label が空文字の場合失敗", () => {
    const result = safeParse(SurveyParamSchema, {
      key: "version",
      label: "",
      visible: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("SurveyParamsSchema", () => {
  test("空配列でバリデーション通過", () => {
    const result = safeParse(SurveyParamsSchema, []);
    expect(result.success).toBe(true);
  });

  test("複数パラメータでバリデーション通過", () => {
    const result = safeParse(SurveyParamsSchema, [
      { key: "version", label: "バージョン", visible: true },
      { key: "date", label: "日付", visible: false },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toHaveLength(2);
    }
  });
});

describe("CreateSurveySchema with params", () => {
  const validQuestions = [{ type: "text" as const, id: "q1", label: "質問" }];

  test("params 付きでバリデーション通過", () => {
    const result = safeParse(CreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      params: [{ key: "version", label: "バージョン", visible: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.params).toEqual([
        { key: "version", label: "バージョン", visible: true },
      ]);
    }
  });

  test("params なしでも後方互換でバリデーション通過", () => {
    const result = safeParse(CreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateSurveySchema with params", () => {
  const validQuestions = [{ type: "text" as const, id: "q1", label: "質問" }];

  test("params 付きでバリデーション通過", () => {
    const result = safeParse(UpdateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      params: [{ key: "version", label: "バージョン", visible: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.params).toEqual([
        { key: "version", label: "バージョン", visible: true },
      ]);
    }
  });
});

describe("SubmitAnswersSchema with params", () => {
  test("params 付きでバリデーション通過", () => {
    const result = safeParse(SubmitAnswersSchema, {
      answers: { q1: "回答" },
      params: { version: "v2", date: "2026-02-15" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.params).toEqual({
        version: "v2",
        date: "2026-02-15",
      });
    }
  });

  test("params なしでも後方互換でバリデーション通過", () => {
    const result = safeParse(SubmitAnswersSchema, {
      answers: { q1: "回答" },
    });
    expect(result.success).toBe(true);
  });
});

describe("SurveyResponseSchema with params", () => {
  test("params 付きレスポンスでバリデーション通過", () => {
    const result = safeParse(SurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "active",
      questions: [{ type: "text", id: "q1", label: "質問" }],
      params: [{ key: "version", label: "バージョン", visible: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.params).toEqual([
        { key: "version", label: "バージョン", visible: true },
      ]);
    }
  });
});

describe("SurveyResponsesSchema with params", () => {
  test("各 response に params を含むレスポンスでバリデーション通過", () => {
    const result = safeParse(SurveyResponsesSchema, {
      surveyId: "s1",
      responses: [
        {
          id: "r1",
          answers: { q1: "回答" },
          params: { version: "v2" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.responses[0].params).toEqual({ version: "v2" });
    }
  });

  test("params なしのレスポンスでもバリデーション通過", () => {
    const result = safeParse(SurveyResponsesSchema, {
      surveyId: "s1",
      responses: [
        {
          id: "r1",
          answers: { q1: "回答" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("DataCreateSurveySchema", () => {
  const validQuestions = [{ type: "text" as const, id: "q1", label: "質問" }];

  test("status なしでバリデーション通過（CreateSurveySchema と同等）", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
    });
    expect(result.success).toBe(true);
  });

  test("status: draft でバリデーション通過", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      status: "draft",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.status).toBe("draft");
    }
  });

  test("status: active でバリデーション通過", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      status: "active",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.status).toBe("active");
    }
  });

  test("status: completed は許可しない", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      status: "completed",
    });
    expect(result.success).toBe(false);
  });

  test("無効な status で失敗", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });

  test("params 付きでバリデーション通過", () => {
    const result = safeParse(DataCreateSurveySchema, {
      title: "テスト",
      questions: validQuestions,
      params: [{ key: "version", label: "バージョン", visible: true }],
      status: "active",
    });
    expect(result.success).toBe(true);
  });
});

describe("DataSubmitResponsesSchema", () => {
  test("単一回答でバリデーション通過", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: [{ answers: { q1: "回答" } }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.responses).toHaveLength(1);
    }
  });

  test("複数回答でバリデーション通過", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: [
        { answers: { q1: "回答1" } },
        { answers: { q1: "回答2" }, params: { version: "v2" } },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.responses).toHaveLength(2);
      expect(result.output.responses[1].params).toEqual({ version: "v2" });
    }
  });

  test("空の responses 配列で失敗", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: [],
    });
    expect(result.success).toBe(false);
  });

  test("responses が配列でない場合失敗", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: "invalid",
    });
    expect(result.success).toBe(false);
  });

  test("params 付き回答でバリデーション通過", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: [
        {
          answers: { q1: "回答", q2: ["A", "B"] },
          params: { version: "v2", date: "2026-02-15" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("dataEntryId 付き回答でバリデーション通過", () => {
    const result = safeParse(DataSubmitResponsesSchema, {
      responses: [
        {
          answers: { q1: "回答" },
          dataEntryId: "entry-1",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.responses[0].dataEntryId).toBe("entry-1");
    }
  });
});

describe("DataEntryValuesSchema", () => {
  test("空オブジェクトでバリデーション通過", () => {
    const result = safeParse(DataEntryValuesSchema, {});
    expect(result.success).toBe(true);
  });

  test("文字列値のレコードでバリデーション通過", () => {
    const result = safeParse(DataEntryValuesSchema, {
      event: "GENkaigi 2026",
      date: "2026-03-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toEqual({
        event: "GENkaigi 2026",
        date: "2026-03-01",
      });
    }
  });

  test("数値の値で失敗", () => {
    const result = safeParse(DataEntryValuesSchema, { count: 42 });
    expect(result.success).toBe(false);
  });
});

describe("CreateDataEntrySchema", () => {
  test("values のみでバリデーション通過", () => {
    const result = safeParse(CreateDataEntrySchema, {
      values: { event: "GENkaigi 2026" },
    });
    expect(result.success).toBe(true);
  });

  test("values + label でバリデーション通過", () => {
    const result = safeParse(CreateDataEntrySchema, {
      values: { event: "GENkaigi 2026" },
      label: "GENkaigi 2026 in Shibuya",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.label).toBe("GENkaigi 2026 in Shibuya");
    }
  });

  test("label が 200 文字を超えると失敗", () => {
    const result = safeParse(CreateDataEntrySchema, {
      values: {},
      label: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateDataEntrySchema", () => {
  test("values と label で更新バリデーション通過", () => {
    const result = safeParse(UpdateDataEntrySchema, {
      values: { event: "Updated Event" },
      label: "更新済み",
    });
    expect(result.success).toBe(true);
  });
});

describe("DataEntryResponseSchema", () => {
  test("完全なデータエントリレスポンスでバリデーション通過", () => {
    const result = safeParse(DataEntryResponseSchema, {
      id: "entry-1",
      surveyId: "survey-1",
      values: { event: "GENkaigi 2026" },
      label: "ラベル",
      responseCount: 5,
      createdAt: "2026-02-17T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  test("label が null でもバリデーション通過", () => {
    const result = safeParse(DataEntryResponseSchema, {
      id: "entry-1",
      surveyId: "survey-1",
      values: {},
      label: null,
      responseCount: 0,
      createdAt: "2026-02-17T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("DataEntryListResponseSchema", () => {
  test("空配列でバリデーション通過", () => {
    const result = safeParse(DataEntryListResponseSchema, {
      dataEntries: [],
    });
    expect(result.success).toBe(true);
  });

  test("複数エントリでバリデーション通過", () => {
    const result = safeParse(DataEntryListResponseSchema, {
      dataEntries: [
        {
          id: "entry-1",
          surveyId: "survey-1",
          values: { event: "Event A" },
          responseCount: 3,
          createdAt: "2026-02-17T00:00:00.000Z",
        },
        {
          id: "entry-2",
          surveyId: "survey-1",
          values: { event: "Event B" },
          label: "ラベルB",
          responseCount: 0,
          createdAt: "2026-02-17T01:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.dataEntries).toHaveLength(2);
    }
  });
});

describe("SubmitAnswersSchema with dataEntryId", () => {
  test("dataEntryId 付きでバリデーション通過", () => {
    const result = safeParse(SubmitAnswersSchema, {
      answers: { q1: "回答" },
      dataEntryId: "entry-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.dataEntryId).toBe("entry-1");
    }
  });

  test("dataEntryId なしでも後方互換でバリデーション通過", () => {
    const result = safeParse(SubmitAnswersSchema, {
      answers: { q1: "回答" },
    });
    expect(result.success).toBe(true);
  });
});

describe("SurveyResponseSchema with dataEntries", () => {
  test("dataEntries 付きレスポンスでバリデーション通過", () => {
    const result = safeParse(SurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "active",
      questions: [{ type: "text", id: "q1", label: "質問" }],
      dataEntries: [
        { id: "entry-1", values: { event: "Event A" }, label: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("dataEntries なしでも後方互換でバリデーション通過", () => {
    const result = safeParse(SurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "active",
      questions: [{ type: "text", id: "q1", label: "質問" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("AdminSurveyResponseSchema with dataEntries", () => {
  test("dataEntries 付きレスポンスでバリデーション通過", () => {
    const result = safeParse(AdminSurveyResponseSchema, {
      id: "s1",
      title: "テスト",
      status: "draft",
      createdAt: "2026-02-17T00:00:00.000Z",
      questions: [{ type: "text", id: "q1", label: "質問" }],
      dataEntries: [
        {
          id: "entry-1",
          surveyId: "s1",
          values: { event: "Event A" },
          responseCount: 2,
          createdAt: "2026-02-17T00:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("SurveyResponsesSchema with dataEntryId", () => {
  test("各 response に dataEntryId を含むレスポンスでバリデーション通過", () => {
    const result = safeParse(SurveyResponsesSchema, {
      surveyId: "s1",
      responses: [
        {
          id: "r1",
          answers: { q1: "回答" },
          dataEntryId: "entry-1",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.responses[0].dataEntryId).toBe("entry-1");
    }
  });

  test("dataEntryId が null でもバリデーション通過", () => {
    const result = safeParse(SurveyResponsesSchema, {
      surveyId: "s1",
      responses: [
        {
          id: "r1",
          answers: { q1: "回答" },
          dataEntryId: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("TextQuestionSchema required フィールド", () => {
  test("required: true でバリデーション通過", () => {
    const result = safeParse(TextQuestionSchema, {
      type: "text",
      id: "q1",
      label: "質問",
      required: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(true);
    }
  });

  test("required: false でバリデーション通過", () => {
    const result = safeParse(TextQuestionSchema, {
      type: "text",
      id: "q1",
      label: "質問",
      required: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(false);
    }
  });

  test("required 省略時はデフォルト false", () => {
    const result = safeParse(TextQuestionSchema, {
      type: "text",
      id: "q1",
      label: "質問",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(false);
    }
  });
});

describe("RadioQuestionSchema required フィールド", () => {
  test("required: true でバリデーション通過", () => {
    const result = safeParse(RadioQuestionSchema, {
      type: "radio",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      required: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(true);
    }
  });

  test("required 省略時はデフォルト false", () => {
    const result = safeParse(RadioQuestionSchema, {
      type: "radio",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(false);
    }
  });
});

describe("CheckboxQuestionSchema required フィールド", () => {
  test("required: true でバリデーション通過", () => {
    const result = safeParse(CheckboxQuestionSchema, {
      type: "checkbox",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      required: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(true);
    }
  });

  test("required 省略時はデフォルト false", () => {
    const result = safeParse(CheckboxQuestionSchema, {
      type: "checkbox",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.required).toBe(false);
    }
  });
});

describe("OTHER_VALUE 定数", () => {
  test("__other__ という文字列である", () => {
    expect(OTHER_VALUE).toBe("__other__");
  });
});

describe("RadioQuestionSchema allowOther フィールド", () => {
  test("allowOther: true でバリデーション通過", () => {
    const result = safeParse(RadioQuestionSchema, {
      type: "radio",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      allowOther: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(true);
    }
  });

  test("allowOther: false でバリデーション通過", () => {
    const result = safeParse(RadioQuestionSchema, {
      type: "radio",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      allowOther: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(false);
    }
  });

  test("allowOther 省略時はデフォルト false", () => {
    const result = safeParse(RadioQuestionSchema, {
      type: "radio",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(false);
    }
  });
});

describe("CheckboxQuestionSchema allowOther フィールド", () => {
  test("allowOther: true でバリデーション通過", () => {
    const result = safeParse(CheckboxQuestionSchema, {
      type: "checkbox",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      allowOther: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(true);
    }
  });

  test("allowOther: false でバリデーション通過", () => {
    const result = safeParse(CheckboxQuestionSchema, {
      type: "checkbox",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
      allowOther: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(false);
    }
  });

  test("allowOther 省略時はデフォルト false", () => {
    const result = safeParse(CheckboxQuestionSchema, {
      type: "checkbox",
      id: "q1",
      label: "質問",
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.allowOther).toBe(false);
    }
  });
});
