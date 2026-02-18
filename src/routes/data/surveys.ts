import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { safeParse } from "valibot";
import {
  ErrorResponseSchema,
  IdParamSchema,
} from "../../schema/common.js";
import {
  AdminSurveyResponseSchema,
  CreateDataEntrySchema,
  DataCreateSurveySchema,
  DataEntryListResponseSchema,
  DataEntryResponseSchema,
  DataSubmitResponsesSchema,
  QuestionsSchema,
  SurveyListResponseSchema,
  type SurveyParam,
  SurveyParamsSchema,
} from "../../schema/survey.js";
import { prisma } from "../../lib/db.js";

function parseSurveyParams(raw: unknown): SurveyParam[] {
  const result = safeParse(SurveyParamsSchema, raw);
  return result.success ? result.output : [];
}

const app = new Hono();

app.post(
  "/",
  describeRoute({
    tags: ["Data"],
    summary: "アンケート作成（データ投入用）",
    responses: {
      201: {
        description: "作成成功",
        content: {
          "application/json": {
            schema: resolver(AdminSurveyResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", DataCreateSurveySchema),
  async (c) => {
    const { title, description, questions, params, status } =
      c.req.valid("json");
    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        questions,
        ...(params && { params }),
        ...(status && { status }),
      },
    });
    const parsed = safeParse(QuestionsSchema, survey.questions);
    return c.json(
      {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        createdAt: survey.createdAt.toISOString(),
        questions: parsed.success ? parsed.output : [],
        params: parseSurveyParams(survey.params),
      },
      201
    );
  }
);

app.get(
  "/",
  describeRoute({
    tags: ["Data"],
    summary: "アンケート一覧取得（データ投入用）",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(SurveyListResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const surveys = await prisma.survey.findMany({
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return c.json({
      surveys: surveys.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  }
);

app.get(
  "/:id",
  describeRoute({
    tags: ["Data"],
    summary: "アンケート詳細取得（データ投入用）",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(AdminSurveyResponseSchema),
          },
        },
      },
      404: {
        description: "見つからない",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("param", IdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        dataEntries: {
          include: { _count: { select: { responses: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }
    const parsed = safeParse(QuestionsSchema, survey.questions);
    return c.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      createdAt: survey.createdAt.toISOString(),
      questions: parsed.success ? parsed.output : [],
      params: parseSurveyParams(survey.params),
      dataEntries: survey.dataEntries.map((e) => ({
        id: e.id,
        surveyId: e.surveyId,
        values: e.values as Record<string, string>,
        label: e.label,
        responseCount: e._count.responses,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }
);

app.post(
  "/:id/responses",
  describeRoute({
    tags: ["Data"],
    summary: "回答一括送信（データ投入用）",
    responses: {
      201: {
        description: "作成成功",
      },
      400: {
        description: "アンケートが受付中でない",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      404: {
        description: "見つからない",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("param", IdParamSchema),
  validator("json", DataSubmitResponsesSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { responses } = c.req.valid("json");

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }
    if (survey.status !== "active") {
      return c.json({ error: "Survey is not active" }, 400);
    }

    const result = await prisma.response.createMany({
      data: responses.map((r) => ({
        surveyId: id,
        answers: r.answers,
        ...(r.params && { params: r.params }),
        ...(r.dataEntryId && { dataEntryId: r.dataEntryId }),
      })),
    });

    return c.json({ count: result.count }, 201);
  }
);

// ── データエントリ ──

app.get(
  "/:id/data-entries",
  describeRoute({
    tags: ["Data"],
    summary: "データエントリ一覧取得（データ投入用）",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(DataEntryListResponseSchema),
          },
        },
      },
      404: {
        description: "見つからない",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("param", IdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }
    const entries = await prisma.surveyDataEntry.findMany({
      where: { surveyId: id },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "asc" },
    });
    return c.json({
      dataEntries: entries.map((e) => ({
        id: e.id,
        surveyId: e.surveyId,
        values: e.values as Record<string, string>,
        label: e.label,
        responseCount: e._count.responses,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }
);

app.post(
  "/:id/data-entries",
  describeRoute({
    tags: ["Data"],
    summary: "データエントリ作成（データ投入用）",
    responses: {
      201: {
        description: "作成成功",
        content: {
          "application/json": {
            schema: resolver(DataEntryResponseSchema),
          },
        },
      },
      400: {
        description: "バリデーションエラー",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      404: {
        description: "見つからない",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("param", IdParamSchema),
  validator("json", CreateDataEntrySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { values, label } = c.req.valid("json");

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }

    const params = parseSurveyParams(survey.params);
    const paramKeys = new Set(params.map((p) => p.key));
    const invalidKeys = Object.keys(values).filter((k) => !paramKeys.has(k));
    if (invalidKeys.length > 0) {
      return c.json(
        {
          error: `Invalid keys: ${invalidKeys.join(", ")}. Allowed keys: ${[...paramKeys].join(", ")}`,
        },
        400
      );
    }

    const entry = await prisma.surveyDataEntry.create({
      data: { surveyId: id, values, ...(label != null && { label }) },
    });

    return c.json(
      {
        id: entry.id,
        surveyId: entry.surveyId,
        values: entry.values as Record<string, string>,
        label: entry.label,
        responseCount: 0,
        createdAt: entry.createdAt.toISOString(),
      },
      201
    );
  }
);

export default app;
