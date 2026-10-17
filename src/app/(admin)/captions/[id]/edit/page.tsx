import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/dal";
import { getCaptionRow, listOwnerOptions } from "@/lib/data/captions";
import { isUuid } from "@/lib/data/query";
import { PageHeader } from "@/components/card";
import { CaptionForm } from "../../caption-form";
import { updateCaption } from "../../actions";

export default async function EditCaptionPage({ params }: PageProps<"/captions/[id]/edit">) {
  const admin = await requireSuperadmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [caption, owners] = await Promise.all([getCaptionRow(id), listOwnerOptions()]);
  if (!caption) notFound();

  return (
    <div>
      <PageHeader title="Edit caption" />
      <CaptionForm
        action={updateCaption.bind(null, id)}
        owners={owners}
        initial={caption}
        defaultOwnerId={admin.id}
        cancelHref={`/captions/${id}`}
        submitLabel="Save changes"
      />
    </div>
  );
}
