import "server-only";
import { logger } from "@formbricks/logger";
import { TResponse } from "@formbricks/types/responses";
import { TSurvey } from "@formbricks/types/surveys/types";
import { getTextContent } from "@formbricks/types/surveys/validation";
import { getLocalizedValue } from "@/lib/i18n/utils";
import { processResponseData } from "@/lib/responses";
import { getElementsFromBlocks } from "@/lib/survey/utils";
import { FASTN_API_KEY, FASTN_WEBHOOK_URL } from "./config";

/**
 * The one event Formbricks sends to fastn. fastn, not Formbricks, decides what happens next:
 * each customer picks their apps (Slack, Microsoft Teams, a CRM…) in the embedded hub, and the
 * workflows behind the trigger act on this event for that customer. Adding an app on the fastn
 * side needs no change here.
 *
 * Contract: see fastn/PLAN.md in the sample repo.
 */
export type TFastnResponseFinishedEvent = {
  event: "response.finished";
  occurredAt: string;
  customer: { id: string; name: string };
  survey: { id: string; name: string; type: string };
  response: {
    id: string;
    createdAt: string;
    url: string;
    answers: { question: string; answer: string }[];
    contact: { email: string; name: string | null } | null;
  };
};

type TOrganizationRef = { id: string; name: string };

const toIso = (value: Date | string): string =>
  (value instanceof Date ? value : new Date(value)).toISOString();

/** Question → answer pairs in survey order, as plain text, skipping unanswered questions. */
const getAnswers = (survey: TSurvey, response: TResponse): { question: string; answer: string }[] => {
  const elements = getElementsFromBlocks(survey.blocks ?? []);
  return elements
    .filter((element) => {
      const value = response.data[element.id];
      return value !== undefined && value !== null && value !== "";
    })
    .map((element) => ({
      question: getTextContent(getLocalizedValue(element.headline, "default")),
      answer: processResponseData(response.data[element.id]),
    }));
};

/** The respondent, when Formbricks knows who they are (app surveys with an identified contact). */
const getContact = (response: TResponse): TFastnResponseFinishedEvent["response"]["contact"] => {
  const attributes = (response.contactAttributes ?? {}) as Record<string, string | undefined>;
  const email = attributes.email;
  if (!email) return null;
  const name = [attributes.firstName, attributes.lastName].filter(Boolean).join(" ") || null;
  return { email, name };
};

export const buildResponseFinishedEvent = ({
  organization,
  survey,
  response,
  webAppUrl,
}: {
  organization: TOrganizationRef;
  survey: TSurvey;
  response: TResponse;
  webAppUrl: string;
}): TFastnResponseFinishedEvent => ({
  event: "response.finished",
  occurredAt: new Date().toISOString(),
  customer: { id: organization.id, name: organization.name },
  survey: { id: survey.id, name: survey.name, type: survey.type },
  response: {
    id: response.id,
    createdAt: toIso(response.createdAt),
    url: `${webAppUrl}/environments/${survey.environmentId}/surveys/${survey.id}/responses`,
    answers: getAnswers(survey, response),
    contact: getContact(response),
  },
});

/**
 * Send one event to the fastn webhook trigger. Never throws: a fastn problem must not break
 * Formbricks' own response pipeline.
 *
 * The customer is named with `x-end-org-id`, which accepts our own reference for them (the
 * Formbricks organization id). fastn registers that customer the first time someone in the
 * organization opens the hub (see actions.ts). A customer who never opened the hub has nothing
 * set up, so fastn answering "not a customer" is expected and only logged at info level.
 */
export const sendFastnEvent = async (event: TFastnResponseFinishedEvent): Promise<void> => {
  if (!FASTN_API_KEY || !FASTN_WEBHOOK_URL) return;

  try {
    const res = await fetch(FASTN_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": FASTN_API_KEY,
        "x-end-org-id": event.customer.id,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      logger.info({ responseId: event.response.id, status: res.status }, "fastn event accepted");
      return;
    }

    const body = (await res.text()).slice(0, 500);
    if (res.status === 400 && body.includes("is not a customer")) {
      logger.info(
        { organizationId: event.customer.id },
        "fastn event skipped: this organization has not set up fastn yet"
      );
      return;
    }
    logger.error({ status: res.status, body, responseId: event.response.id }, "fastn event was not accepted");
  } catch (error) {
    logger.error({ error, responseId: event.response.id }, "Could not send the event to fastn");
  }
};
