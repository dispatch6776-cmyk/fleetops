import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { FullPageSpinner } from '@/components/ui/spinner';
import { RedirectIfAuthenticated, RequireAuth, RequirePermission } from './guards';
import type { Permission } from '@/lib/permissions';

/** Route-level code splitting keeps the initial bundle small. */
const LoginPage = lazy(() => import('@/pages/login'));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password'));
const ResetPasswordPage = lazy(() => import('@/pages/reset-password'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const TruckPage = lazy(() => import('@/pages/truck'));
const MaintenancePage = lazy(() => import('@/pages/maintenance'));
const RepairsPage = lazy(() => import('@/pages/repairs'));
const MileagePage = lazy(() => import('@/pages/mileage'));
const DocumentsPage = lazy(() => import('@/pages/documents'));
const CalendarPage = lazy(() => import('@/pages/calendar'));
const MapPage = lazy(() => import('@/pages/map'));
const FinancialsPage = lazy(() => import('@/pages/financials'));
const InvoicesPage = lazy(() => import('@/pages/invoices'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const AssistantPage = lazy(() => import('@/pages/assistant'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const SearchPage = lazy(() => import('@/pages/search'));
const AdminPage = lazy(() => import('@/pages/admin'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
}

/** Wraps a page in its lazy boundary and its permission guard. */
function guarded(permission: Permission, element: ReactNode) {
  return (
    <Lazy>
      <RequirePermission permission={permission}>{element}</RequirePermission>
    </Lazy>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Lazy>
        <RedirectIfAuthenticated>
          <LoginPage />
        </RedirectIfAuthenticated>
      </Lazy>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <Lazy>
        <RedirectIfAuthenticated>
          <ForgotPasswordPage />
        </RedirectIfAuthenticated>
      </Lazy>
    ),
  },
  {
    // Not guarded: arriving from the email link *creates* a recovery session,
    // so the visitor is technically authenticated already.
    path: '/reset-password',
    element: (
      <Lazy>
        <ResetPasswordPage />
      </Lazy>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: guarded('dashboard.view', <DashboardPage />) },
      { path: 'truck/*', element: guarded('truck.view', <TruckPage />) },
      { path: 'maintenance/*', element: guarded('maintenance.view', <MaintenancePage />) },
      { path: 'repairs/*', element: guarded('maintenance.view', <RepairsPage />) },
      { path: 'mileage', element: guarded('mileage.view', <MileagePage />) },
      { path: 'documents/*', element: guarded('documents.view', <DocumentsPage />) },
      { path: 'calendar', element: guarded('calendar.view', <CalendarPage />) },
      { path: 'map/*', element: guarded('map.view', <MapPage />) },
      { path: 'financials/*', element: guarded('financials.view', <FinancialsPage />) },
      { path: 'invoices/*', element: guarded('invoices.view', <InvoicesPage />) },
      { path: 'reports', element: guarded('reports.view', <ReportsPage />) },
      { path: 'assistant', element: guarded('ai.view', <AssistantPage />) },
      { path: 'notifications', element: guarded('notifications.view', <NotificationsPage />) },
      // No permission gate: results are already scoped per-row by RLS, so
      // every authenticated role sees the same search UI and just gets
      // fewer/different matches back.
      { path: 'search', element: <Lazy><SearchPage /></Lazy> },
      { path: 'admin/*', element: guarded('admin.access', <AdminPage />) },
      { path: 'settings/*', element: <Lazy><SettingsPage /></Lazy> },
      { path: '*', element: <Lazy><NotFoundPage /></Lazy> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
