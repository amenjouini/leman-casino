import type { NextConfig } from "next";
const { i18n } = require('./next-i18next.config');

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Add the i18n config here
  i18n,
};


export default nextConfig;
