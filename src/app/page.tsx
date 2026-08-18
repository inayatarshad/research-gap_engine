import { LandingPage } from "@/components/landing/LandingPage";
import { getOverview } from "@/lib/overview";

export default function Page() {
  return <LandingPage overview={getOverview()} />;
}
