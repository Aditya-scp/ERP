import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@erp/ui', '@erp/core', '@erp/types', '@erp/config'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
