import { requireSuperadmin } from "@/lib/dal";
import { listOwnerOptions } from "@/lib/data/captions";
import { PageHeader } from "@/components/card";
import { CaptionForm } from "../caption-form";
import { createCaption } from "../actions";

export default async function NewCaptionPage() {
  const admin = await requireSuperadmin();
  const owners = await listOwnerOptions();
  return (
    <div>
      <PageHeader title="New caption" />
      <CaptionForm
        action={createCaption}
        owners={owners}
        defaultOwnerId={admin.id}
        cancelHref="/captions"
        submitLabel="Create caption"
      />
    </div>
  );
}
