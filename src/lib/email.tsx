import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Row,
  render,
  Section,
  Text,
} from "@react-email/components";
import { Resend } from "resend";
import type { Question } from "../schema/survey.js";

interface ResponseCopyEmailProps {
  answers: Record<string, string | string[]>;
  questions: Question[];
  surveyTitle: string;
}

export function ResponseCopyEmail({
  surveyTitle,
  questions,
  answers,
}: ResponseCopyEmailProps) {
  return (
    <Html lang="ja">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading as="h1" style={heading}>
              {`【回答コピー】${surveyTitle}`}
            </Heading>
            <Text style={subheading}>以下はあなたの回答内容です。</Text>
          </Section>

          <Section style={content}>
            <table style={table}>
              <tbody>
                {questions.map((q, i) => {
                  const raw = answers[q.id];
                  const value = Array.isArray(raw)
                    ? raw.join("、")
                    : (raw ?? "");
                  return (
                    <Row key={q.id}>
                      <Column style={cellNumber}>{`Q${i + 1}`}</Column>
                      <Column style={cellLabel}>{q.label}</Column>
                      <Column style={cellValue}>{value}</Column>
                    </Row>
                  );
                })}
              </tbody>
            </table>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>このメールは自動送信されました。</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function buildResponseEmailHtml(
  surveyTitle: string,
  questions: Question[],
  answers: Record<string, string | string[]>
): Promise<string> {
  return await render(
    <ResponseCopyEmail
      answers={answers}
      questions={questions}
      surveyTitle={surveyTitle}
    />
  );
}

interface SendResponseCopyEmailParams {
  answers: Record<string, string | string[]>;
  from: string;
  questions: Question[];
  resendApiKey: string;
  surveyTitle: string;
  to: string;
}

export async function sendResponseCopyEmail({
  to,
  from,
  surveyTitle,
  questions,
  answers,
  resendApiKey,
}: SendResponseCopyEmailParams): Promise<void> {
  const resend = new Resend(resendApiKey);

  await resend.emails.send({
    from,
    to,
    subject: `【回答コピー】${surveyTitle}`,
    react: (
      <ResponseCopyEmail
        answers={answers}
        questions={questions}
        surveyTitle={surveyTitle}
      />
    ),
  });
}

const body: React.CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily: "sans-serif",
  background: "#f9fafb",
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "24px auto",
  background: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
};

const header: React.CSSProperties = {
  padding: "24px",
  background: "#f3f4f6",
  borderBottom: "1px solid #e5e7eb",
};

const heading: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#111",
};

const subheading: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "14px",
  color: "#666",
};

const content: React.CSSProperties = {
  padding: "24px",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const cellNumber: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  color: "#666",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const cellLabel: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  fontWeight: 600,
};

const cellValue: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};

const footer: React.CSSProperties = {
  padding: "16px 24px",
  background: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#999",
  margin: 0,
};
