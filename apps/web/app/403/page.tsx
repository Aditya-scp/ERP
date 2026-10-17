import React from 'react';
import Link from 'next/link';
import { Button } from '@erp/ui';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-slate-900">403</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-800">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600">
          You do not possess the required permissions to view this resource. Contact your school administrator if you require access.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button variant="primary">Return to Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
