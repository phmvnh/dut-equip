import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Toast from '../../components/Toast';
import NotificationListView from '../../components/notifications/NotificationListView';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        <NotificationListView title="Thông báo của tôi" />
      </main>
      <Footer />
      <Toast />
    </div>
  );
}
