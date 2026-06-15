import { Outlet, Navigate, useLocation } from 'react-router-dom';
import MobileBottomNav from '../../components/mobile/MobileBottomNav';

/** Layout tài khoản cho mobile — mỗi tab con tự render header riêng. */
export default function MobileAccountPage() {
  const location = useLocation();
  if (location.pathname === '/account' || location.pathname === '/account/') {
    return <Navigate to="/account/profile" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-parchment font-sf">
      <div className="pb-24">
        <Outlet />
      </div>
      <MobileBottomNav />
    </div>
  );
}
