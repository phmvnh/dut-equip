import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] bg-white outline-none focus:border-action focus:ring-2 focus:ring-action/15 placeholder:text-gray-400';
const labelCls = 'block text-[13px] font-medium text-gray-600 mb-1.5';

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  );
}

export default function MobileLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      login(data.user, data.token);
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Đăng nhập thất bại, vui lòng thử lại';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col font-sf px-7">
      {/* Thương hiệu — logo thật, căn giữa, nhiều khoảng thở */}
      <header
        className="flex flex-col items-center text-center"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}
      >
        <img src="/logo_dut_equip_no_bg.png" alt="Logo DUT Equip" className="w-16 h-16 object-contain" />
        <p className="mt-3 text-[13px] font-medium text-gray-400">Đại học Bách Khoa Đà Nẵng</p>
        <h1 className="mt-5 text-[26px] font-bold text-ink tracking-[-0.02em] leading-tight text-balance">
          Chào mừng trở lại
        </h1>
        <p className="mt-2 text-[15px] text-gray-500 leading-relaxed max-w-[17rem]">
          Đăng nhập để mượn và theo dõi thiết bị của trường.
        </p>
      </header>

      <div className="mt-8 flex-1">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@dut.udn.vn" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
          </div>
          {loginError && <ErrorBox msg={loginError} />}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full h-12 rounded-full bg-action text-white text-[15px] font-semibold active:bg-action-press active:scale-[0.98] transition disabled:opacity-60 mt-2"
          >
            {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      <div
        className="flex items-center justify-center text-sm py-6 text-gray-400"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
      >
        Tài khoản do quản trị viên cấp. Liên hệ admin nếu chưa có tài khoản.
      </div>
    </main>
  );
}
