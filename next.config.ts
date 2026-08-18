import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The corpus is read from disk at runtime rather than imported, so it has to
  // be traced explicitly into the serverless bundle.
  outputFileTracingIncludes: {
    "/**": ["./data/corpus.json"],
  },
  // Keep the 23 MB corpus and the raw Anthology cache out of the bundle.
  outputFileTracingExcludes: {
    "/**": [".cache/**", "data/openalex-corpus.json", "scripts/**"],
  },
};

export default nextConfig;
