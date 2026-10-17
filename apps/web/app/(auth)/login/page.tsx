import React from 'react';
import { BRAND } from '@erp/config/brand';
import { Button } from '@erp/ui';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{BRAND.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Sign In to Your Account</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700" htmlFor="email">
              Email or Username
            </label>
            <input
              id="email"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="user@school.example.in"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <Button type="button" className="w-full">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
