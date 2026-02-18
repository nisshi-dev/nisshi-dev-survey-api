import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { HonoEnv } from "../index";
import surveyApp from "./survey";

vi.mock("@/lib/email", () => ({
  sendResponseCopyEmail: vi.fn().mockResolvedValue(undefined),
}));

const { sendResponseCopyEmail } = await import("@/lib/email");
const mockSendEmail = vi.mocked(sendResponseCopyEmail);

const mockSurveyFindUnique = vi.fn();
const mockResponseCreate = vi.fn();
const mockEntryFindUnique = vi.fn();

const mockPrisma = {
  survey: { findUnique: mockSurveyFindUnique },
  response: { create: mockResponseCreate },
  surveyDataEntry: { findUnique: mockEntryFindUnique },
};

function createApp() {
  const app = new Hono<HonoEnv>({
    getPath: (req) => new URL(req.url).pathname,
  });
  app.use("/*", async (c, next) => {
    c.set("prisma", mockPrisma as never);
    c.env = {
      ...c.env,
      RESEND_API_KEY: "test-resend-key",
      RESEND_FROM_EMAIL: "test <test@example.com>",
    } as HonoEnv["Bindings"];
    await next();
  });
  app.route("/survey", surveyApp);
  return app;
}

describe("GET /survey/:id", () => {
  beforeEach(() => {
    mockSurveyFindUnique.mockReset();
  });

  test("active なアンケートを取得する", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: "テスト説明",
      status: "active",
      questions,
      createdAt: new Date(),
      updatedAt: new Date(),
      dataEntries: [],
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.id).toBe("survey-1");
    expect(body.title).toBe("テストアンケート");
    expect(body.description).toBe("テスト説明");
    // Valibot パースにより required: false がデフォルト追加される
    expect(body.questions).toEqual([
      { type: "text", id: "q1", label: "ご意見", required: false },
    ]);
  });

  test("存在しないアンケートで 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/survey/nonexistent");
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("draft のアンケートで 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("completed のアンケートで 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "completed",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("allowOther: true の質問を含むアンケートを返す", async () => {
    const questions = [
      {
        type: "radio",
        id: "q1",
        label: "好きな色",
        options: ["赤", "青"],
        allowOther: true,
      },
    ];
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions,
      createdAt: new Date(),
      updatedAt: new Date(),
      dataEntries: [],
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.questions[0].allowOther).toBe(true);
  });

  test("params 定義を含むアンケートを返す", async () => {
    const params = [{ key: "version", label: "バージョン", visible: true }];
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      params,
      createdAt: new Date(),
      updatedAt: new Date(),
      dataEntries: [],
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.params).toEqual(params);
  });
});

describe("POST /survey/:id/submit", () => {
  beforeEach(() => {
    mockSurveyFindUnique.mockReset();
    mockResponseCreate.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  test("active なアンケートに回答を送信する", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良いです" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "良いです" } }),
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.surveyId).toBe("survey-1");
  });

  test("存在しないアンケートへの送信で 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/survey/nonexistent/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "回答" } }),
    });

    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("draft のアンケートへの送信で 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "回答" } }),
    });

    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("completed のアンケートへの送信で 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "completed",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "回答" } }),
    });

    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Survey not found");
  });

  test("sendCopy なし（後方互換）で sendResponseCopyEmail を呼ばない", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良い" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "良い" } }),
    });

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test("sendCopy: false で sendResponseCopyEmail を呼ばない", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良い" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良い" },
        sendCopy: false,
      }),
    });

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test("sendCopy: true + メールなしで 400 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良い" },
        sendCopy: true,
      }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBeDefined();
  });

  test("sendCopy: true + メールありで 200 + sendResponseCopyEmail 呼び出し", async () => {
    const questions = [{ type: "text", id: "q1", label: "ご意見" }];
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良い" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良い" },
        sendCopy: true,
        respondentEmail: "test@example.com",
      }),
    });

    expect(res.status).toBe(200);
    // Valibot パースにより required: false がデフォルト追加される
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      from: "test <test@example.com>",
      surveyTitle: "テストアンケート",
      questions: [{ type: "text", id: "q1", label: "ご意見", required: false }],
      answers: { q1: "良い" },
      resendApiKey: "test-resend-key",
    });
  });

  test("sendCopy: true のとき executionCtx.waitUntil にメール送信 Promise を渡す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良い" },
      createdAt: new Date(),
    });

    const mockWaitUntil = vi.fn();
    const app = createApp();
    const res = await app.request(
      "/survey/survey-1/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { q1: "良い" },
          sendCopy: true,
          respondentEmail: "test@example.com",
        }),
      },
      {},
      { waitUntil: mockWaitUntil, passThroughOnException: vi.fn() } as never
    );

    expect(res.status).toBe(200);
    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
    expect(mockWaitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);
  });

  test("params 付きで回答を送信する", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      params: [{ key: "version", label: "バージョン", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良いです" },
      params: { version: "v2" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良いです" },
        params: { version: "v2" },
      }),
    });

    expect(res.status).toBe(200);
    expect(mockResponseCreate).toHaveBeenCalledWith({
      data: {
        surveyId: "survey-1",
        answers: { q1: "良いです" },
        params: { version: "v2" },
      },
    });
  });

  test("メール送信失敗でもレスポンスは 200", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良い" },
      createdAt: new Date(),
    });
    mockSendEmail.mockRejectedValue(new Error("Resend API error"));

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良い" },
        sendCopy: true,
        respondentEmail: "test@example.com",
      }),
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("GET /survey/:id with dataEntries", () => {
  beforeEach(() => {
    mockSurveyFindUnique.mockReset();
  });

  test("dataEntries を含むアンケートを返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      params: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      dataEntries: [
        {
          id: "entry-1",
          values: { event: "Event A" },
          label: "ラベルA",
        },
      ],
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.dataEntries).toHaveLength(1);
    expect(body.dataEntries[0].id).toBe("entry-1");
    expect(body.dataEntries[0].values).toEqual({ event: "Event A" });
    expect(body.dataEntries[0].label).toBe("ラベルA");
  });
});

describe("POST /survey/:id/submit with dataEntryId", () => {
  beforeEach(() => {
    mockSurveyFindUnique.mockReset();
    mockResponseCreate.mockReset();
    mockEntryFindUnique.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  test("dataEntryId 付きで回答を送信し、values を params にマージ", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      params: [{ key: "event", label: "イベント", visible: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEntryFindUnique.mockResolvedValue({
      id: "entry-1",
      surveyId: "survey-1",
      values: { event: "GENkaigi 2026" },
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "良いです" },
      params: { event: "GENkaigi 2026" },
      dataEntryId: "entry-1",
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "良いです" },
        dataEntryId: "entry-1",
      }),
    });

    expect(res.status).toBe(200);
    expect(mockResponseCreate).toHaveBeenCalledWith({
      data: {
        surveyId: "survey-1",
        answers: { q1: "良いです" },
        params: { event: "GENkaigi 2026" },
        dataEntryId: "entry-1",
      },
    });
  });

  test("無効な dataEntryId で 404 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockEntryFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { q1: "回答" },
        dataEntryId: "invalid-entry",
      }),
    });

    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toBe("Data entry not found");
  });
});

describe("POST /survey/:id/submit required validation", () => {
  beforeEach(() => {
    mockSurveyFindUnique.mockReset();
    mockResponseCreate.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  test("required: true の text 質問に空回答で 400 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "お名前", required: true }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "" } }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("q1");
  });

  test("required: true の radio 質問に空回答で 400 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [
        {
          type: "radio",
          id: "q1",
          label: "好きな色",
          options: ["赤", "青"],
          required: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "" } }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("q1");
  });

  test("required: true の checkbox 質問に空配列で 400 を返す", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [
        {
          type: "checkbox",
          id: "q1",
          label: "好きな果物",
          options: ["りんご", "みかん"],
          required: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: [] } }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain("q1");
  });

  test("required: false の質問に空回答でも正常に保存する", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [{ type: "text", id: "q1", label: "ご意見", required: false }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "" } }),
    });

    expect(res.status).toBe(200);
    expect(mockResponseCreate).toHaveBeenCalled();
  });

  test("すべての必須質問に回答済みなら正常に保存する", async () => {
    mockSurveyFindUnique.mockResolvedValue({
      id: "survey-1",
      title: "テストアンケート",
      description: null,
      status: "active",
      questions: [
        { type: "text", id: "q1", label: "お名前", required: true },
        { type: "text", id: "q2", label: "ご意見", required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockResponseCreate.mockResolvedValue({
      id: "resp-1",
      surveyId: "survey-1",
      answers: { q1: "太郎", q2: "" },
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/survey/survey-1/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: "太郎", q2: "" } }),
    });

    expect(res.status).toBe(200);
    expect(mockResponseCreate).toHaveBeenCalled();
  });
});
