import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { safeParse } from "valibot";
import {
  ErrorResponseSchema,
  IdParamSchema,
} from "../schema/common.js";
import {
  type Question,
  QuestionsSchema,
  SubmitAnswersSchema,
  SubmitSuccessResponseSchema,
  type SurveyParam,
  SurveyParamsSchema,
  SurveyResponseSchema,
} from "../schema/survey.js";
import { prisma } from "../lib/db.js";
import { sendResponseCopyEmail } from "../lib/email.js";

function parseSurveyParams(raw: unknown): SurveyParam[] {
  const result = safeParse(SurveyParamsSchema, raw);
  return result.success ? result.output : [];
}

function findMissingRequiredAnswers(
  questions: Question[],
  answers: Record<string, string | string[]>
): string[] {
  const missingIds: string[] = [];
  for (const q of questions) {
    if (!q.required) {
      continue;
    }
    const answer = answers[q.id];
    if (q.type === "checkbox") {
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        missingIds.push(q.id);
      }
    } else if (!answer || answer === "") {
      missingIds.push(q.id);
    }
  }
  return missingIds;
}

const app = new Hono();

app.get(
  "/:id",
  describeRoute({
    tags: ["Survey"],
    summary: "アンケート取得",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(SurveyResponseSchema),
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
          select: { id: true, values: true, label: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!survey || survey.status !== "active") {
      return c.json({ error: "Survey not found" }, 404);
    }
    const parsed = safeParse(QuestionsSchema, survey.questions);
    return c.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: parsed.success ? parsed.output : [],
      params: parseSurveyParams(survey.params),
      dataEntries: survey.dataEntries.map((e) => ({
        id: e.id,
        values: e.values as Record<string, string>,
        label: e.label,
      })),
    });
  }
);

app.post(
  "/:id/submit",
  describeRoute({
    tags: ["Survey"],
    summary: "回答送信",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(SubmitSuccessResponseSchema),
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
  validator("json", SubmitAnswersSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { answers, params, dataEntryId, sendCopy, respondentEmail } =
      c.req.valid("json");

    if (sendCopy && !respondentEmail) {
      return c.json(
        { error: "respondentEmail is required when sendCopy is true" },
        400
      );
    }

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey || survey.status !== "active") {
      return c.json({ error: "Survey not found" }, 404);
    }

    const parsedQuestions = safeParse(QuestionsSchema, survey.questions);
    if (parsedQuestions.success) {
      const missingIds = findMissingRequiredAnswers(
        parsedQuestions.output,
        answers
      );
      if (missingIds.length > 0) {
        return c.json(
          {
            error: `Required questions must be answered: ${missingIds.join(", ")}`,
          },
          400
        );
      }
    }

    let mergedParams = params;
    if (dataEntryId) {
      const entry = await prisma.surveyDataEntry.findUnique({
        where: { id: dataEntryId },
      });
      if (!entry || entry.surveyId !== id) {
        return c.json({ error: "Data entry not found" }, 404);
      }
      const entryValues = entry.values as Record<string, string>;
      mergedParams = { ...entryValues, ...params };
    }

    await prisma.response.create({
      data: {
        surveyId: id,
        answers,
        ...(mergedParams && { params: mergedParams }),
        ...(dataEntryId && { dataEntryId }),
      },
    });

    if (sendCopy && respondentEmail) {
      const parsed = safeParse(QuestionsSchema, survey.questions);
      const questions: Question[] = parsed.success ? parsed.output : [];
      sendResponseCopyEmail({
        to: respondentEmail,
        surveyTitle: survey.title,
        questions,
        answers,
      }).catch((err) => {
        console.error("Failed to send response copy email:", err);
      });
    }

    return c.json({ success: true, surveyId: id });
  }
);

export default app;
