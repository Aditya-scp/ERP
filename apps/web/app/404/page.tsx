import React from 'react';
import Link from 'next/link';
import { Button } from '@erp/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-800">Page Not Found</h2>
        <p className="mt-2 text-sm text-slate-600">
          The screen you requested does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button variant="primary">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
