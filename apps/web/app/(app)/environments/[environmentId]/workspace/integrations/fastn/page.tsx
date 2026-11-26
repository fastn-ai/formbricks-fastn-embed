import { redirect } from "next/navigation";
import { WEBAPP_URL } from "@/lib/constants";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { FastnHubPanel } from "@/modules/fastn/components/fastn-hub-panel";
import { isFastnEmbedConfigured, isFastnEventConfigured } from "@/modules/fastn/lib/config";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="Integrations by fastn" />
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Connect the apps your team already uses, such as Slack, Microsoft Teams, Notion or Google Docs, and
        choose where each completed survey response goes. Formbricks sends each response once; fastn delivers
        it to the apps you picked.
      </p>
      {isFastnEmbedConfigured() ? (
        <>
          {!isFastnEventConfigured() && (
            <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              FASTN_WEBHOOK_URL is not set, so responses are not sent to fastn yet. You can still connect
              apps.
            </p>
          )}
          <FastnHubPanel environmentId={params.environmentId} />
        </>
      ) : (
        <p className="rounded-md bg-slate-100 p-4 text-sm text-slate-700">
          fastn is not configured on this Formbricks instance. Set <code>FASTN_API_KEY</code> (and{" "}
          <code>FASTN_WEBHOOK_URL</code>) in the server environment, then reload.
        </p>
      )}
    </PageContentWrapper>
  );
};

export default Page;
