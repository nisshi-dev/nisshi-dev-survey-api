import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../../index.js";
import {
  buildAdminSurveyResponse,
  buildDataEntryResponse,
  parseQuestions,
  validateDataEntryKeys,
} from "../../lib/survey.js";
import {
  EntryIdParamSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from "../../schema/common.js";
import {
  AdminSurveyResponseSchema,
  CreateDataEntrySchema,
  CreateSurveySchema,
  DataEntryListResponseSchema,
  DataEntryResponseSchema,
  SurveyListResponseSchema,
  SurveyResponsesSchema,
  UpdateDataEntrySchema,
  UpdateSurveySchema,
  UpdateSurveyStatusSchema,
} from "../../schema/survey.js";

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
    return c.json(buildAdminSurveyResponse(survey), 201);
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
    return c.json({
      ...buildAdminSurveyResponse(survey),
      dataEntries: survey.dataEntries.map((e) =>
        buildDataEntryResponse(e, e._count.responses)
      ),
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
      const existingJson = JSON.stringify(parseQuestions(existing.questions));
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
    return c.json(buildAdminSurveyResponse(survey));
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
    return c.json(buildAdminSurveyResponse(survey));
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
      dataEntries: entries.map((e) =>
        buildDataEntryResponse(e, e._count.responses)
      ),
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

    const error = validateDataEntryKeys(values, survey.params);
    if (error) {
      return c.json({ error }, 400);
    }

    const entry = await prisma.surveyDataEntry.create({
      data: { surveyId: id, values, ...(label != null && { label }) },
    });

    return c.json(buildDataEntryResponse(entry, 0), 201);
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
    const { id, entryId } = c.req.valid("param");
    const { values, label } = c.req.valid("json");

    const existing = await prisma.surveyDataEntry.findUnique({
      where: { id: entryId, surveyId: id },
      include: { survey: { select: { params: true } } },
    });
    if (!existing) {
      return c.json({ error: "Data entry not found" }, 404);
    }

    const error = validateDataEntryKeys(values, existing.survey.params);
    if (error) {
      return c.json({ error }, 400);
    }

    const entry = await prisma.surveyDataEntry.update({
      where: { id: entryId },
      data: { values, label: label ?? null },
      include: { _count: { select: { responses: true } } },
    });

    return c.json(buildDataEntryResponse(entry, entry._count.responses));
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
    const { id, entryId } = c.req.valid("param");

    const existing = await prisma.surveyDataEntry.findUnique({
      where: { id: entryId, surveyId: id },
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
