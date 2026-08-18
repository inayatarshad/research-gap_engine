import { Studio } from "@/components/Studio";
import { getCorpus } from "@/lib/engine";
import { getOverview } from "@/lib/overview";

export default function Page() {
  // Only derived figures cross to the client; the 23 MB corpus stays server-side.
  const { meta } = getCorpus();
  return <Studio meta={meta} overview={getOverview()} />;
}
