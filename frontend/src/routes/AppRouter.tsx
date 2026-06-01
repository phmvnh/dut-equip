import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import EquipmentQrViewPage from '../pages/MobileEquipQRPage';
import AccountPage from '../pages/account/AccountPage';
import ProfileTab from '../pages/account/ProfileTab';
import ChangePasswordTab from '../pages/account/ChangePasswordTab';
import MyDevicesTab from '../pages/account/MyEquipTab';
import HistoryTab from '../pages/account/HistoryTab';
import CompensationsTab from '../pages/account/CompensationsTab';
import AdminPage from '../pages/admin/AdminPage';
import DashboardPage from '../pages/admin/DashboardPage';
import EquipmentsPage from '../pages/admin/EquipmentsPage';
import BorrowPage from '../pages/admin/BorrowPage';
import MaintenancePage from '../pages/admin/MaintenancePage';
import CompensationsPage from '../pages/admin/CompensationsPage';
import UsersPage from '../pages/admin/UsersPage';
import EquipTypesPage from '../pages/admin/EquipTypesPage';
import BuildingsPage from '../pages/admin/BuildingsPage';
import SettingsPage from '../pages/admin/SettingsPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
import AdminNotificationsPage from '../pages/admin/NotificationsPage';
import ChatPage from '../pages/admin/ChatPage';
import ActivityLogsPage from '../pages/admin/ActivityLogsPage';
import NotificationsPage from '../pages/NotificationsPage';
import AdminGuard from './AdminGuard';
import AuthGuard from './AuthGuard';

function LoginRoute() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  return <LoginPage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/q/:code" element={<EquipmentQrViewPage />} />
        <Route path="/account" element={<AuthGuard><AccountPage /></AuthGuard>}>
          <Route path="profile" element={<ProfileTab />} />
          <Route path="my-devices" element={<MyDevicesTab />} />
          <Route path="history" element={<HistoryTab />} />
          <Route path="compensations" element={<CompensationsTab />} />
          <Route path="change-password" element={<ChangePasswordTab />} />
        </Route>
        <Route
          path="/notifications"
          element={<AuthGuard><NotificationsPage /></AuthGuard>}
        />
        
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="equipments" element={<EquipmentsPage />} />
          <Route path="borrow" element={<BorrowPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="compensations" element={<CompensationsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="equip-types" element={<EquipTypesPage />} />
          <Route path="buildings" element={<BuildingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
