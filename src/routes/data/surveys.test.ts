import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import surveysApp from "./surveys";

vi.mock("@/lib/db", () => ({
  prisma: {
    survey: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    response: {
      createMany: vi.fn(),
    },
    surveyDataEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const mockFindMany = vi.mocked(prisma.survey.findMany);
const mockCreate = vi.mocked(prisma.survey.create);
const mockFindUnique = vi.mocked(prisma.survey.findUnique);
const mockCreateMany = vi.mocked(prisma.response.createMany);
const mockEntryFindMany = vi.mocked(prisma.surveyDataEntry.findMany);
const mockEntryCreate = vi.mocked(prisma.surveyDataEntry.create);

function createApp() {
  const app = new Hono();
  app.route("/data/surveys", surveysApp);
  return app;
}

describe("POST /data/surveys", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("アンケートを作成して 201 を返す（status なし → draft）", async () => {
    const questions = [{ type: "text", id: "q1", label: "感想" }];
    const createdAt = new Date("2026-02-17T00:00:00.000Z");
    mockCreate.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "draft",
      questions,
      params: [],
      createdAt,
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "テスト", questions }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("survey-1");
    expect(body.status).toBe("draft");
    expect(body.createdAt).toBe(createdAt.toISOString());
  });

  test("status: active を指定して作成できる", async () => {
    const questions = [{ type: "text", id: "q1", label: "感想" }];
    mockCreate.mockResolvedValue({
      id: "survey-2",
      title: "アクティブ",
      description: null,
      status: "active",
      questions,
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "アクティブ",
        questions,
        status: "active",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("active");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "active" }),
      })
    );
  });

  test("params 付きで作成できる", async () => {
    const questions = [{ type: "text", id: "q1", label: "感想" }];
    const params = [{ key: "version", label: "バージョン", visible: true }];
    mockCreate.mockResolvedValue({
      id: "survey-3",
      title: "パラメータ付き",
      description: null,
      status: "draft",
      questions,
      params,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "パラメータ付き", questions, params }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.params).toEqual(params);
  });
});

describe("GET /data/surveys", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  test("アンケート一覧を返す", async () => {
    const createdAt = new Date("2026-02-17T00:00:00.000Z");
    mockFindMany.mockResolvedValue([
      {
        id: "survey-1",
        title: "テスト",
        description: null,
        status: "active",
        questions: [],
        createdAt,
        updatedAt: new Date(),
      },
    ]);

    const app = createApp();
    const res = await app.request("/data/surveys");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.surveys).toHaveLength(1);
    expect(body.surveys[0].id).toBe("survey-1");
    expect(body.surveys[0].createdAt).toBe(createdAt.toISOString());
  });
});

describe("GET /data/surveys/:id", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("dataEntries を含むアンケート詳細を返す", async () => {
    const questions = [{ type: "text", id: "q1", label: "感想" }];
    const createdAt = new Date("2026-02-17T00:00:00.000Z");
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: "説明",
      status: "active",
      questions,
      params: [{ key: "version", label: "バージョン", visible: true }],
      createdAt,
      updatedAt: new Date(),
      dataEntries: [
        {
          id: "entry-1",
          surveyId: "survey-1",
          values: { version: "v1.0" },
          label: "v1.0",
          _count: { responses: 3 },
          createdAt: new Date("2026-02-17T01:00:00.000Z"),
          updatedAt: new Date(),
        },
      ],
    } as never);

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("survey-1");
    expect(body.dataEntries).toHaveLength(1);
    expect(body.dataEntries[0].id).toBe("entry-1");
    expect(body.dataEntries[0].values).toEqual({ version: "v1.0" });
    expect(body.dataEntries[0].responseCount).toBe(3);
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/data/surveys/nonexistent");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });
});

describe("POST /data/surveys/:id/responses", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockCreateMany.mockReset();
  });

  test("回答を一括送信する", async () => {
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
    mockCreateMany.mockResolvedValue({ count: 2 });

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [
          { answers: { q1: "回答1" } },
          { answers: { q1: "回答2" }, params: { version: "v2" } },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { surveyId: "survey-1", answers: { q1: "回答1" } },
        {
          surveyId: "survey-1",
          answers: { q1: "回答2" },
          params: { version: "v2" },
        },
      ],
    });
  });

  test("dataEntryId 付きで回答を一括送信する", async () => {
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
    mockCreateMany.mockResolvedValue({ count: 1 });

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [
          {
            answers: { q1: "回答" },
            dataEntryId: "entry-1",
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          surveyId: "survey-1",
          answers: { q1: "回答" },
          dataEntryId: "entry-1",
        },
      ],
    });
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/data/surveys/nonexistent/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [{ answers: { q1: "回答" } }],
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("active でないアンケートで 400 を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "draft",
      questions: [],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [{ answers: { q1: "回答" } }],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Survey is not active");
  });
});

describe("GET /data/surveys/:id/data-entries", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockEntryFindMany.mockReset();
  });

  test("データエントリ一覧を返す", async () => {
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
    mockEntryFindMany.mockResolvedValue([
      {
        id: "entry-1",
        surveyId: "survey-1",
        values: { version: "v1.0" },
        label: "v1.0",
        _count: { responses: 3 },
        createdAt: new Date("2026-02-17T00:00:00.000Z"),
        updatedAt: new Date(),
      },
    ] as never);

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/data-entries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dataEntries).toHaveLength(1);
    expect(body.dataEntries[0].id).toBe("entry-1");
    expect(body.dataEntries[0].responseCount).toBe(3);
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/data/surveys/nonexistent/data-entries");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });
});

describe("POST /data/surveys/:id/data-entries", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockEntryCreate.mockReset();
  });

  test("データエントリを作成して 201 を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [{ key: "version", label: "バージョン", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEntryCreate.mockResolvedValue({
      id: "entry-new",
      surveyId: "survey-1",
      values: { version: "v2.0" },
      label: "v2.0 リリース",
      createdAt: new Date("2026-02-17T00:00:00.000Z"),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: { version: "v2.0" },
        label: "v2.0 リリース",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("entry-new");
    expect(body.values).toEqual({ version: "v2.0" });
    expect(body.label).toBe("v2.0 リリース");
    expect(body.responseCount).toBe(0);
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/data/surveys/nonexistent/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { version: "v1.0" } }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("無効なキーで 400 を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テスト",
      description: null,
      status: "active",
      questions: [],
      params: [{ key: "version", label: "バージョン", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/data/surveys/survey-1/data-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { invalid_key: "value" } }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid keys");
  });
});
