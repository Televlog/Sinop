'use client';

import { redirect } from 'next/navigation';

// Goals are part of the budgets page (tabbed)
export default function GoalsPage() {
  redirect('/budgets');
}
