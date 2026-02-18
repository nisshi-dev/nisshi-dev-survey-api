import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { minLength, object, pipe, safeParse, string } from "valibot";
import type { HonoEnv } from "../../index.js";
import {
  ErrorResponseSchema,
  IdParamSchema,
} from "../../schema/common.js";
import {
  AdminSurveyResponseSchema,
  CreateDataEntrySchema,
  CreateSurveySchema,
  DataEntryListResponseSchema,
  DataEntryResponseSchema,
  QuestionsSchema,
  SurveyListResponseSchema,
  type SurveyParam,
  SurveyParamsSchema,
  SurveyResponsesSchema,
  UpdateDataEntrySchema,
  UpdateSurveySchema,
  UpdateSurveyStatusSchema,
} from "../../schema/survey.js";

const EntryIdParamSchema = object({
  id: pipe(string(), minLength(1)),
  entryId: pipe(string(), minLength(1)),
});

function parseSurveyParams(raw: unknown): SurveyParam[] {
  const result = safeParse(SurveyParamsSchema, raw);
  return result.success ? result.output : [];
}

const app = new Hono<HonoEnv>();

app.get(
  "/",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケート一覧取得",
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
    const prisma = c.get("prisma");
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

app.post(
  "/",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケート作成",
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
  validator("json", CreateSurveySchema),
  async (c) => {
    const prisma = c.get("prisma");
    const { title, description, questions, params } = c.req.valid("json");
    const survey = await prisma.survey.create({
      data: { title, description, questions, ...(params && { params }) },
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
  "/:id",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケート詳細取得",
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
    const prisma = c.get("prisma");
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

app.put(
  "/:id",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケート内容更新",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(AdminSurveyResponseSchema),
          },
        },
      },
      400: {
        description: "質問変更不可",
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
  validator("json", UpdateSurveySchema),
  async (c) => {
    const prisma = c.get("prisma");
    const { id } = c.req.valid("param");
    const { title, description, questions, params } = c.req.valid("json");
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Survey not found" }, 404);
    }
    if (existing.status !== "draft") {
      const parsedExisting = safeParse(QuestionsSchema, existing.questions);
      const existingJson = JSON.stringify(
        parsedExisting.success ? parsedExisting.output : existing.questions
      );
      const newJson = JSON.stringify(questions);
      if (existingJson !== newJson) {
        return c.json(
          { error: "Cannot modify questions for active or completed survey" },
          400
        );
      }
    }
    const survey = await prisma.survey.update({
      where: { id },
      data: { title, description, questions, ...(params && { params }) },
    });
    const parsed = safeParse(QuestionsSchema, survey.questions);
    return c.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      createdAt: survey.createdAt.toISOString(),
      questions: parsed.success ? parsed.output : [],
      params: parseSurveyParams(survey.params),
    });
  }
);

app.patch(
  "/:id",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケートステータス更新",
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
  validator("json", UpdateSurveyStatusSchema),
  async (c) => {
    const prisma = c.get("prisma");
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Survey not found" }, 404);
    }
    const survey = await prisma.survey.update({
      where: { id },
      data: { status },
    });
    const parsed = safeParse(QuestionsSchema, survey.questions);
    return c.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      createdAt: survey.createdAt.toISOString(),
      questions: parsed.success ? parsed.output : [],
      params: parseSurveyParams(survey.params),
    });
  }
);

app.delete(
  "/:id",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "アンケート削除",
    responses: {
      200: {
        description: "削除成功",
      },
      400: {
        description: "削除不可",
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
  async (c) => {
    const prisma = c.get("prisma");
    const { id } = c.req.valid("param");
    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }
    if (survey.status === "completed") {
      return c.json({ error: "Completed survey cannot be deleted" }, 400);
    }
    await prisma.survey.delete({ where: { id } });
    return c.json({ success: true });
  }
);

app.get(
  "/:id/responses",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "回答一覧取得",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(SurveyResponsesSchema),
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
    const prisma = c.get("prisma");
    const { id } = c.req.valid("param");
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        responses: {
          select: {
            id: true,
            answers: true,
            params: true,
            dataEntryId: true,
          },
        },
      },
    });
    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }
    return c.json({
      surveyId: survey.id,
      responses: survey.responses.map((r) => ({
        id: r.id,
        answers: r.answers as Record<string, string | string[]>,
        params: (r.params ?? {}) as Record<string, string>,
        dataEntryId: r.dataEntryId,
      })),
    });
  }
);

// ── データエントリ CRUD ──

app.get(
  "/:id/data-entries",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "データエントリ一覧取得",
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
    const prisma = c.get("prisma");
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
    tags: ["Admin Surveys"],
    summary: "データエントリ作成",
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
    const prisma = c.get("prisma");
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

app.put(
  "/:id/data-entries/:entryId",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "データエントリ更新",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(DataEntryResponseSchema),
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
  validator("param", EntryIdParamSchema),
  validator("json", UpdateDataEntrySchema),
  async (c) => {
    const prisma = c.get("prisma");
    const { entryId } = c.req.valid("param");
    const { values, label } = c.req.valid("json");

    const existing = await prisma.surveyDataEntry.findUnique({
      where: { id: entryId },
      include: { survey: { select: { params: true } } },
    });
    if (!existing) {
      return c.json({ error: "Data entry not found" }, 404);
    }

    const entry = await prisma.surveyDataEntry.update({
      where: { id: entryId },
      data: { values, label: label ?? null },
    });

    return c.json({
      id: entry.id,
      surveyId: entry.surveyId,
      values: entry.values as Record<string, string>,
      label: entry.label,
      responseCount: 0,
      createdAt: entry.createdAt.toISOString(),
    });
  }
);

app.delete(
  "/:id/data-entries/:entryId",
  describeRoute({
    tags: ["Admin Surveys"],
    summary: "データエントリ削除",
    responses: {
      200: {
        description: "削除成功",
      },
      400: {
        description: "削除不可",
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
  validator("param", EntryIdParamSchema),
  async (c) => {
    const prisma = c.get("prisma");
    const { entryId } = c.req.valid("param");

    const existing = await prisma.surveyDataEntry.findUnique({
      where: { id: entryId },
      include: { _count: { select: { responses: true } } },
    });
    if (!existing) {
      return c.json({ error: "Data entry not found" }, 404);
    }

    if (existing._count.responses > 0) {
      return c.json({ error: "回答が紐づいているため削除できません" }, 400);
    }

    await prisma.surveyDataEntry.delete({ where: { id: entryId } });
    return c.json({ success: true });
  }
);

export default app;
