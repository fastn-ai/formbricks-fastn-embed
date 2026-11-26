"use server";

import { FastnServerError, mintEmbedToken } from "@fastn-ai/embed/server";
import { z } from "zod";
import { ZId } from "@formbricks/types/common";
import { getOrganization } from "@/lib/organization/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";
import { FASTN_API_KEY, FASTN_BASE_URL } from "./lib/config";

/**
 * Mint a short-lived fastn embed token for the hub on the integrations page.
 *
 * The Formbricks organization is the fastn *customer*: everyone in Acme shares Acme's connections
 * (organization-level scope). Passing `customerName` registers the customer in fastn the first time
 * anyone from that organization opens the hub, so Formbricks keeps no fastn state of its own.
 *
 * Same access rule as Formbricks' own integrations: owners and managers, or a project team with
 * read-write access.
 */
export const getFastnEmbedTokenAction = authenticatedActionClient
  .inputSchema(z.object({ environmentId: ZId }))
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [
        { type: "organization", roles: ["owner", "manager"] },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    const organization = await getOrganization(organizationId);

    try {
      const minted = await mintEmbedToken({
        customerId: organizationId,
        customerName: organization?.name ?? organizationId,
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        userName: ctx.user.name ?? undefined,
        apiKey: FASTN_API_KEY,
        baseUrl: FASTN_BASE_URL,
      });
      return { ok: true as const, token: minted.token, baseUrl: minted.baseUrl };
    } catch (error) {
      // FastnServerError carries a human fix ("hint"); show it rather than a generic failure.
      if (error instanceof FastnServerError) {
        return { ok: false as const, error: error.hint ? `${error.message} ${error.hint}` : error.message };
      }
      throw error;
    }
  });
