import { NextConfig } from "next";
import withLess from "next-with-less";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  i18n: {
    defaultLocale: "fr",
    locales: ["en", "fr", "de"],
    localeDetection: false,
  },
  lessLoaderOptions: {
    /* optional: enable JavaScript in LESS if your LESS uses it */
    javascriptEnabled: true,
  },
};

// Wrap nextConfig with withLess before exporting
export default withLess(nextConfig);
