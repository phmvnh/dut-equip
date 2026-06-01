import { useQuery } from '@tanstack/react-query';
import { settingApi } from '../api/settingApi';

export default function Footer() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.get,
  });

  return (
    <footer className="bg-blue-100 border-t border-blue-100 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-start gap-4">
          <img src="/logo_dut_equip_no_bg.png" alt="DUT Equip" className="w-20 h-20 object-contain flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">DUT Equip</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hệ thống quản lý thiết bị công trường Đại học Bách Khoa - Đại học Đà Nẵng.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Liên hệ phòng thiết bị</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <a href={`mailto:${data?.contactEmail ?? ''}`} className="hover:text-blue-600">
                {data?.contactEmail ?? '—'}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <a href={`tel:${data?.contactPhone ?? ''}`} className="hover:text-blue-600">
                {data?.contactPhone ?? '—'}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{data?.workingHours ?? '—'}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quy định mượn</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Số ngày mượn tối đa: <span className="font-medium text-gray-900">{data?.maxBorrowDays ?? '—'} ngày</span></li>
            <li>Số thiết bị đồng thời: <span className="font-medium text-gray-900">{data?.maxConcurrent ?? '—'} thiết bị</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-blue-100">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} DUT Equip - Trường Đại học Bách Khoa, Đại học Đà Nẵng
        </div>
      </div>
    </footer>
  );
}
