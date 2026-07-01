import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import HomePage from '../pages/user/HomePage';
import LoginPage from '../pages/user/LoginPage';
import EquipmentQrViewPage from '../pages/mobile/MobileEquipQRPage';
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
import ReportsPage from '../pages/admin/ReportsPage';
import InventoryPage from '../pages/admin/InventoryPage';
import ProcurementPage from '../pages/admin/ProcurementPage';
import DisposalsPage from '../pages/admin/DisposalsPage';
import NotificationsPage from '../pages/user/NotificationsPage';
import AdminGuard from './AdminGuard';
import AuthGuard from './AuthGuard';
import DeviceSwitch from '../components/DeviceSwitch';
// Giao diện mobile riêng cho luồng giảng viên (adaptive theo viewport)
import MobileHomePage from '../pages/mobile/MobileHomePage';
import MobileLoginPage from '../pages/mobile/MobileLoginPage';
import MobileNotificationsPage from '../pages/mobile/MobileNotificationsPage';
import MobileChatPage from '../pages/mobile/MobileChatPage';
import MobileAccountPage from '../pages/mobile/MobileAccountPage';
import MobileProfile from '../pages/mobile/account/MobileProfile';
import MobileMyEquip from '../pages/mobile/account/MobileMyEquip';
import MobileHistory from '../pages/mobile/account/MobileHistory';
import MobileCompensations from '../pages/mobile/account/MobileCompensations';
import MobileChangePassword from '../pages/mobile/account/MobileChangePassword';

function LoginRoute() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  return <DeviceSwitch mobile={<MobileLoginPage />} desktop={<LoginPage />} />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<DeviceSwitch mobile={<MobileHomePage />} desktop={<HomePage />} />}
        />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/q/:code" element={<EquipmentQrViewPage />} />
        <Route
          path="/account"
          element={
            <AuthGuard>
              <DeviceSwitch mobile={<MobileAccountPage />} desktop={<AccountPage />} />
            </AuthGuard>
          }
        >
          <Route path="profile" element={<DeviceSwitch mobile={<MobileProfile />} desktop={<ProfileTab />} />} />
          <Route path="my-devices" element={<DeviceSwitch mobile={<MobileMyEquip />} desktop={<MyDevicesTab />} />} />
          <Route path="history" element={<DeviceSwitch mobile={<MobileHistory />} desktop={<HistoryTab />} />} />
          <Route path="compensations" element={<DeviceSwitch mobile={<MobileCompensations />} desktop={<CompensationsTab />} />} />
          <Route path="change-password" element={<DeviceSwitch mobile={<MobileChangePassword />} desktop={<ChangePasswordTab />} />} />
        </Route>
        <Route
          path="/notifications"
          element={
            <AuthGuard>
              <DeviceSwitch mobile={<MobileNotificationsPage />} desktop={<NotificationsPage />} />
            </AuthGuard>
          }
        />
        {/* Chat: mobile có trang riêng; desktop dùng widget nổi nên về trang chủ */}
        <Route
          path="/chat"
          element={
            <AuthGuard>
              <DeviceSwitch mobile={<MobileChatPage />} desktop={<Navigate to="/" replace />} />
            </AuthGuard>
          }
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
          <Route path="procurements" element={<ProcurementPage />} />
          <Route path="disposals" element={<DisposalsPage />} />
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
          <Route path="reports" element={<ReportsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
