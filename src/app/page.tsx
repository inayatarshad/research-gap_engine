import { Studio } from "@/components/Studio";
import { getCorpus } from "@/lib/engine";

export default function Page() {
  // Only the metadata crosses to the client; the 23 MB corpus stays server-side.
  const { meta } = getCorpus();
  return <Studio meta={meta} />;
}
