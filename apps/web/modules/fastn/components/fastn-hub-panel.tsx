"use client";

import { FastnHub } from "@fastn-ai/embed/react";
import { getFastnEmbedTokenAction } from "@/modules/fastn/actions";

/**
 * The fastn integration hub, served by fastn in an iframe. Formbricks only supplies a token;
 * everything inside (connecting Slack or Teams, picking a channel, turning integrations on and
 * off) is fastn's UI, scoped to this organization.
 */
export const FastnHubPanel = ({ environmentId }: { environmentId: string }) => {
  const getToken = async () => {
    const result = await getFastnEmbedTokenAction({ environmentId });
    const data = result?.data;
    if (!data) throw new Error(result?.serverError ?? "Could not start a fastn session.");
    if (!data.ok) throw new Error(data.error);
    return { token: data.token, baseUrl: data.baseUrl };
  };

  return (
    <FastnHub
      getToken={getToken}
      height={760}
      fallback={<p className="p-6 text-sm text-slate-500">Loading integrations…</p>}
      renderError={(message, retry) => (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-medium">The integrations hub could not load.</p>
          <p className="mt-1 break-words">{message}</p>
          <button type="button" onClick={retry} className="mt-3 rounded-md bg-white px-3 py-1.5 shadow-sm">
            Try again
          </button>
        </div>
      )}
    />
  );
};
