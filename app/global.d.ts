declare module '*.less' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'next-with-less' {
  import { NextConfig } from 'next';
  function withLess(nextConfig: NextConfig): NextConfig;
  export default withLess;
}
