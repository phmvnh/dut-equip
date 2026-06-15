import NotificationListView from '../../components/notifications/NotificationListView';
import MobileBottomNav from '../../components/mobile/MobileBottomNav';
import MobileSubHeader from '../../components/mobile/MobileSubHeader';

export default function MobileNotificationsPage() {
  return (
    <div className="min-h-[100dvh] bg-parchment font-sf">
      <MobileSubHeader title="Thông báo" />
      <main className="px-3 py-3 pb-24">
        <NotificationListView hideHeader stacked />
      </main>
      <MobileBottomNav />
    </div>
  );
}
