import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import surveysApp from "./surveys";

vi.mock("@/lib/db", () => ({
  prisma: {
    survey: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    surveyDataEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const mockFindMany = vi.mocked(prisma.survey.findMany);
const mockCreate = vi.mocked(prisma.survey.create);
const mockFindUnique = vi.mocked(prisma.survey.findUnique);
const mockUpdate = vi.mocked(prisma.survey.update);
const mockDelete = vi.mocked(prisma.survey.delete);

const mockEntryFindMany = vi.mocked(prisma.surveyDataEntry.findMany);
const mockEntryCreate = vi.mocked(prisma.surveyDataEntry.create);
const mockEntryFindUnique = vi.mocked(prisma.surveyDataEntry.findUnique);
const mockEntryUpdate = vi.mocked(prisma.surveyDataEntry.update);
const mockEntryDelete = vi.mocked(prisma.surveyDataEntry.delete);

function createApp() {
  const app = new Hono();
  app.route("/admin/surveys", surveysApp);
  return app;
}

describe("GET /admin/surveys", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  test("アンケート一覧を返す（status, createdAt を含む）", async () => {
    const createdAt = new Date("2026-02-15T00:00:00.000Z");
    mockFindMany.mockResolvedValue([
      {
        id: "survey-1",
        title: "テストアンケート",
        description: null,
        status: "active",
        questions: [],
        createdAt,
        updatedAt: new Date(),
      },
    ]);

    const app = createApp();
    const res = await app.request("/admin/surveys");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.surveys).toHaveLength(1);
    expect(body.surveys[0].id).toBe("survey-1");
    expect(body.surveys[0].title).toBe("テストアンケート");
    expect(body.surveys[0].status).toBe("active");
    expect(body.surveys[0].createdAt).toBe(createdAt.toISOString());
  });
});

describe("POST /admin/surveys", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("アンケートを作成して 201 を返す（status, createdAt を含む）", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    const createdAt = new Date("2026-02-15T00:00:00.000Z");
    mockCreate.mockResolvedValue({
      id: "survey-new",
      title: "新しいアンケート",
      description: null,
      status: "draft",
      questions,
      createdAt,
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新しいアンケート", questions }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("survey-new");
    expect(body.title).toBe("新しいアンケート");
    expect(body.status).toBe("draft");
    expect(body.createdAt).toBe(createdAt.toISOString());
    // Valibot パースにより required: false がデフォルト追加される
    expect(body.questions).toEqual([
      { type: "text", id: "q1", label: "ご意見", required: false },
    ]);
  });

  test("description 付きでアンケートを作成して 201 を返す", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    const description = "## 概要\nこのアンケートについて";
    mockCreate.mockResolvedValue({
      id: "survey-desc",
      title: "説明付きアンケート",
      description,
      status: "draft",
      questions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "説明付きアンケート",
        description,
        questions,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("survey-desc");
    expect(body.description).toBe(description);
  });
});

describe("GET /admin/surveys/:id", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("アンケート詳細を返す（status, createdAt を含む）", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    const createdAt = new Date("2026-02-15T00:00:00.000Z");
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: "テスト説明",
      status: "active",
      questions,
      createdAt,
      updatedAt: new Date(),
      dataEntries: [],
    } as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("survey-1");
    expect(body.title).toBe("テストアンケート");
    expect(body.description).toBe("テスト説明");
    expect(body.status).toBe("active");
    expect(body.createdAt).toBe(createdAt.toISOString());
    // Valibot パースにより required: false がデフォルト追加される
    expect(body.questions).toEqual([
      { type: "text", id: "q1", label: "ご意見", required: false },
    ]);
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });
});

describe("PATCH /admin/surveys/:id", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  test("ステータスを更新する", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUpdate.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("active");
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("無効なステータスで 400 を返す", async () => {
    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "invalid" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PUT /admin/surveys/:id", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  test("draft のアンケートの title, description, questions を更新できる", async () => {
    const existingQuestions = [{ type: "text", id: "q1", label: "旧質問" }];
    const newQuestions = [
      { type: "radio", id: "q1", label: "新質問", options: ["A", "B"] },
    ];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "旧タイトル",
      description: null,
      status: "draft",
      questions: existingQuestions,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date(),
    });
    mockUpdate.mockResolvedValue({
      id: "survey-1",
      title: "新タイトル",
      description: "新しい説明",
      status: "draft",
      questions: newQuestions,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "新タイトル",
        description: "新しい説明",
        questions: newQuestions,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("新タイトル");
    expect(body.description).toBe("新しい説明");
    // Valibot パースにより required: false, allowOther: false がデフォルト追加される
    expect(body.questions).toEqual([
      {
        type: "radio",
        id: "q1",
        label: "新質問",
        options: ["A", "B"],
        required: false,
        allowOther: false,
      },
    ]);
  });

  test("active のアンケートの title と description を更新できる（questions 同一）", async () => {
    const questions = [{ type: "text", id: "q1", label: "質問" }];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "旧タイトル",
      description: null,
      status: "active",
      questions,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date(),
    });
    mockUpdate.mockResolvedValue({
      id: "survey-1",
      title: "新タイトル",
      description: "説明追加",
      status: "active",
      questions,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "新タイトル",
        description: "説明追加",
        questions,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("新タイトル");
    expect(body.description).toBe("説明追加");
  });

  test("active のアンケートで questions を変更すると 400 を返す", async () => {
    const existingQuestions = [{ type: "text", id: "q1", label: "質問" }];
    const newQuestions = [{ type: "text", id: "q1", label: "変更した質問" }];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "タイトル",
      description: null,
      status: "active",
      questions: existingQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "タイトル",
        questions: newQuestions,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Cannot modify questions for active or completed survey"
    );
  });

  test("completed のアンケートで questions を変更すると 400 を返す", async () => {
    const existingQuestions = [{ type: "text", id: "q1", label: "質問" }];
    const newQuestions = [{ type: "text", id: "q2", label: "別の質問" }];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "タイトル",
      description: null,
      status: "completed",
      questions: existingQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "タイトル",
        questions: newQuestions,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Cannot modify questions for active or completed survey"
    );
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "タイトル",
        questions: [{ type: "text", id: "q1", label: "質問" }],
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });
});

describe("DELETE /admin/surveys/:id", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockDelete.mockReset();
  });

  test("draft のアンケートを削除する", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDelete.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("active のアンケートを削除する", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDelete.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("completed のアンケートは削除できない", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "completed",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Completed survey cannot be deleted");
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });
});

describe("GET /admin/surveys/:id/responses", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("回答一覧を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: [
        {
          id: "resp-1",
          surveyId: "survey-1",
          answers: { q1: "回答です" },
          params: {},
          createdAt: new Date(),
        },
      ],
    } as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/responses");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.surveyId).toBe("survey-1");
    expect(body.responses).toHaveLength(1);
    expect(body.responses[0].answers).toEqual({ q1: "回答です" });
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent/responses");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("回答の params を含めて返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      questions: [],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: [
        {
          id: "resp-1",
          surveyId: "survey-1",
          answers: { q1: "回答です" },
          params: { version: "v2", date: "2026-02-15" },
          dataEntryId: null,
          createdAt: new Date(),
        },
      ],
    } as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/responses");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.responses[0].params).toEqual({
      version: "v2",
      date: "2026-02-15",
    });
  });

  test("各 response に dataEntryId を含めて返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      questions: [],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: [
        {
          id: "resp-1",
          surveyId: "survey-1",
          answers: { q1: "回答です" },
          params: {},
          dataEntryId: "entry-1",
          createdAt: new Date(),
        },
        {
          id: "resp-2",
          surveyId: "survey-1",
          answers: { q1: "回答2" },
          params: {},
          dataEntryId: null,
          createdAt: new Date(),
        },
      ],
    } as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/responses");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.responses[0].dataEntryId).toBe("entry-1");
    expect(body.responses[1].dataEntryId).toBeNull();
  });
});

describe("POST /admin/surveys with params", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("params 付きでアンケートを作成し、レスポンスに params を含める", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    const params = [{ key: "version", label: "バージョン", visible: true }];
    mockCreate.mockResolvedValue({
      id: "survey-new",
      title: "パラメータ付き",
      description: null,
      status: "draft",
      questions,
      params,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "パラメータ付き", questions, params }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.params).toEqual(params);
  });
});

describe("GET /admin/surveys/:id with params", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("params を含むアンケート詳細を返す", async () => {
    const params = [{ key: "version", label: "バージョン", visible: true }];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "draft",
      questions: [{ type: "text", id: "q1", label: "質問" }],
      params,
      createdAt: new Date(),
      updatedAt: new Date(),
      dataEntries: [],
    } as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.params).toEqual(params);
  });
});

describe("PUT /admin/surveys/:id with params", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  test("active のアンケートでも params を更新できる（ステータス制限なし）", async () => {
    const questions = [{ type: "text", id: "q1", label: "質問" }];
    const newParams = [
      { key: "version", label: "バージョン", visible: true },
      { key: "date", label: "日付", visible: false },
    ];
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions,
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUpdate.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions,
      params: newParams,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "テスト", questions, params: newParams }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.params).toEqual(newParams);
  });
});

// ── データエントリ CRUD ──

describe("GET /admin/surveys/:id/data-entries", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockEntryFindMany.mockReset();
  });

  test("エントリがない場合、空配列を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEntryFindMany.mockResolvedValue([]);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/data-entries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dataEntries).toEqual([]);
  });

  test("エントリがある場合、回答件数付きで返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const createdAt = new Date("2026-02-17T00:00:00.000Z");
    mockEntryFindMany.mockResolvedValue([
      {
        id: "entry-1",
        surveyId: "survey-1",
        values: { event: "Event A" },
        label: "ラベルA",
        createdAt,
        updatedAt: new Date(),
        _count: { responses: 3 },
      },
    ] as never);

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/data-entries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dataEntries).toHaveLength(1);
    expect(body.dataEntries[0].id).toBe("entry-1");
    expect(body.dataEntries[0].values).toEqual({ event: "Event A" });
    expect(body.dataEntries[0].label).toBe("ラベルA");
    expect(body.dataEntries[0].responseCount).toBe(3);
    expect(body.dataEntries[0].createdAt).toBe(createdAt.toISOString());
  });

  test("アンケートが存在しない場合 404", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent/data-entries");
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/surveys/:id/data-entries", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockEntryCreate.mockReset();
  });

  test("作成成功で 201 を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [{ key: "event", label: "イベント", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const createdAt = new Date("2026-02-17T00:00:00.000Z");
    mockEntryCreate.mockResolvedValue({
      id: "entry-new",
      surveyId: "survey-1",
      values: { event: "GENkaigi 2026" },
      label: null,
      createdAt,
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { event: "GENkaigi 2026" } }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("entry-new");
    expect(body.values).toEqual({ event: "GENkaigi 2026" });
  });

  test("label 付きで作成成功", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [{ key: "event", label: "イベント", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEntryCreate.mockResolvedValue({
      id: "entry-new",
      surveyId: "survey-1",
      values: { event: "GENkaigi 2026" },
      label: "GENkaigi 2026 in Shibuya",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: { event: "GENkaigi 2026" },
        label: "GENkaigi 2026 in Shibuya",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.label).toBe("GENkaigi 2026 in Shibuya");
  });

  test("values の key が params 定義にない場合 400", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [{ key: "event", label: "イベント", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/surveys/survey-1/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { unknown_key: "value" } }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("unknown_key");
  });

  test("アンケートが存在しない場合 404", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/surveys/nonexistent/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: {} }),
    });

    expect(res.status).toBe(404);
  });
});

describe("PUT /admin/surveys/:id/data-entries/:entryId", () => {
  beforeEach(() => {
    mockEntryFindUnique.mockReset();
    mockEntryUpdate.mockReset();
  });

  test("values と label を更新できる", async () => {
    mockEntryFindUnique.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: { event: "旧イベント" },
      label: "旧ラベル",
      createdAt: new Date(),
      updatedAt: new Date(),
      survey: {
        params: [{ key: "event", label: "イベント", visible: true }],
      },
    } as never);
    mockEntryUpdate.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: { event: "新イベント" },
      label: "新ラベル",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request(
      "/admin/surveys/survey-1/data-entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: { event: "新イベント" },
          label: "新ラベル",
        }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.values).toEqual({ event: "新イベント" });
    expect(body.label).toBe("新ラベル");
  });

  test("エントリが存在しない場合 404", async () => {
    mockEntryFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      "/admin/surveys/survey-1/data-entries/nonexistent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: {} }),
      }
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/surveys/:id/data-entries/:entryId", () => {
  beforeEach(() => {
    mockEntryFindUnique.mockReset();
    mockEntryDelete.mockReset();
  });

  test("回答なしなら削除成功", async () => {
    mockEntryFindUnique.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: {},
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { responses: 0 },
    } as never);
    mockEntryDelete.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: {},
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request(
      "/admin/surveys/survey-1/data-entries/entry-1",
      { method: "DELETE" }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("回答ありなら 400", async () => {
    mockEntryFindUnique.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: {},
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { responses: 5 },
    } as never);

    const app = createApp();
    const res = await app.request(
      "/admin/surveys/survey-1/data-entries/entry-1",
      { method: "DELETE" }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("回答が紐づいているため削除できません");
  });

  test("エントリが存在しない場合 404", async () => {
    mockEntryFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      "/admin/surveys/survey-1/data-entries/nonexistent",
      { method: "DELETE" }
    );

    expect(res.status).toBe(404);
  });
});
