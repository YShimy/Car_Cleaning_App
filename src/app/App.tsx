import { lazy, Suspense, type ComponentType } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoToolbar } from '@/components/app/DemoToolbar';
import { Toaster } from '@/components/ui/Toaster';
import { AccountPage } from '@/features/customer/account/AccountPage';
import { AddOnsPage } from '@/features/customer/addons/AddOnsPage';
import { CarsPage } from '@/features/customer/cars/CarsPage';
import { HomePage } from '@/features/customer/home/HomePage';
import { NotificationsPage } from '@/features/customer/notifications/NotificationsPage';
import { OnboardingPage } from '@/features/customer/onboarding/OnboardingPage';
import { WelcomePage } from '@/features/customer/onboarding/WelcomePage';
import { SchedulePage } from '@/features/customer/schedule/SchedulePage';
import { ReportPage } from '@/features/customer/support/ReportPage';
import { SupportPage } from '@/features/customer/support/SupportPage';
import { WashDetailPage } from '@/features/customer/washes/WashDetailPage';
import { WashesPage } from '@/features/customer/washes/WashesPage';
import { LauncherPage } from '@/features/launcher/LauncherPage';
import { ProfilePage } from '@/features/washer/ProfilePage';
import { SummaryPage } from '@/features/washer/SummaryPage';
import { TodayPage } from '@/features/washer/TodayPage';
import { WashFlowPage } from '@/features/washer/WashFlowPage';
import { CustomerLayout, CustomerShell } from './layouts/CustomerLayout';
import { WasherLayout } from './layouts/WasherLayout';

/*
 * The customer and washer views ship in the main bundle so phones load
 * fast. Admin (with the charts library), the manager portal and the
 * utility pages are separate chunks, fetched only when opened.
 */
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const ManagerLayout = lazy(() => import('./layouts/ManagerLayout'));
const StyleguidePage = lazy(() => import('@/features/styleguide/StyleguidePage'));
const SharePage = lazy(() => import('@/features/share/SharePage'));

type AdminModule = typeof import('@/features/admin');
type ManagerModule = typeof import('@/features/manager');
const admin = <K extends keyof AdminModule>(name: K) =>
  lazy(() => import('@/features/admin').then((m) => ({ default: m[name] as ComponentType })));
const manager = <K extends keyof ManagerModule>(name: K) =>
  lazy(() => import('@/features/manager').then((m) => ({ default: m[name] as ComponentType })));

const AdminOverview = admin('OverviewPage');
const AdminSchedule = admin('SchedulePage');
const AdminCompounds = admin('CompoundsPage');
const AdminCompoundDetail = admin('CompoundDetailPage');
const AdminCustomers = admin('CustomersPage');
const AdminCustomerDetail = admin('CustomerDetailPage');
const AdminWashers = admin('WashersPage');
const AdminIssues = admin('IssuesPage');
const AdminPayments = admin('PaymentsPage');
const AdminInterviews = admin('InterviewsPage');
const ManagerPicker = manager('ManagerPickerPage');
const ManagerPortal = manager('ManagerPortalPage');

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LauncherPage />} />

          <Route path="/customer" element={<CustomerShell />}>
            <Route path="welcome" element={<WelcomePage />} />
            <Route path="onboarding/:step" element={<OnboardingPage />} />
          </Route>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="washes" element={<WashesPage />} />
            <Route path="washes/:washId" element={<WashDetailPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="cars" element={<CarsPage />} />
            <Route path="addons" element={<AddOnsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="support/report" element={<ReportPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          <Route path="/washer" element={<WasherLayout />}>
            <Route index element={<Navigate to="today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="wash/:washId" element={<WashFlowPage />} />
            <Route path="summary" element={<SummaryPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="compounds" element={<AdminCompounds />} />
            <Route path="compounds/:id" element={<AdminCompoundDetail />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="washers" element={<AdminWashers />} />
            <Route path="issues" element={<AdminIssues />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="interviews" element={<AdminInterviews />} />
          </Route>

          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerPicker />} />
            <Route path=":compoundId" element={<ManagerPortal />} />
          </Route>

          <Route path="/styleguide" element={<StyleguidePage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
      <DemoToolbar />
    </HashRouter>
  );
}
