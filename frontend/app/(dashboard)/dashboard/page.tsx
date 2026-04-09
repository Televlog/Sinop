// /dashboard redirects to root which is the actual dashboard page
import { redirect } from 'next/navigation';

export default function DashboardRedirect() {
  redirect('/');
}
