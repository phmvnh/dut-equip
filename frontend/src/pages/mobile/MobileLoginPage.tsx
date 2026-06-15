import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';

type Tab = 'login' | 'register';

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
  const [tab, setTab] = useState<Tab>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [faculty, setFaculty] = useState('');
  const [phone, setPhone] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegError('');
    if (regPassword.length < 8) {
      setRegError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Mật khẩu xác nhận không khớp');
      return;
    }
    setRegLoading(true);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        faculty: faculty.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setRegSuccess(true);
      setTimeout(() => {
        setRegSuccess(false);
        setFullName(''); setRegEmail(''); setRegPassword(''); setRegConfirm(''); setFaculty(''); setPhone('');
        setTab('login');
      }, 1800);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Đăng ký thất bại, vui lòng thử lại';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setLoginError(''); setRegError(''); setRegSuccess(false);
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
          {tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
        </h1>
        <p className="mt-2 text-[15px] text-gray-500 leading-relaxed max-w-[17rem]">
          {tab === 'login'
            ? 'Đăng nhập để mượn và theo dõi thiết bị của trường.'
            : 'Đăng ký bằng email @dut.udn.vn của bạn.'}
        </p>
      </header>

      <div className="mt-8 flex-1">
        {tab === 'login' ? (
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
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className={labelCls}>Họ và tên</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="ten@dut.udn.vn" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Khoa công tác <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
              <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="VD: Khoa Công nghệ Thông tin" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="VD: 0901234567" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mật khẩu</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Ít nhất 8 ký tự" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Xác nhận mật khẩu</label>
              <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" required className={inputCls} />
            </div>
            {regError && <ErrorBox msg={regError} />}
            {regSuccess && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Đăng ký thành công. Đang chuyển sang đăng nhập...
              </div>
            )}
            <button
              type="submit"
              disabled={regLoading || regSuccess}
              className="w-full h-12 rounded-full bg-action text-white text-[15px] font-semibold active:bg-action-press active:scale-[0.98] transition disabled:opacity-60 mt-1"
            >
              {regLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>
        )}
      </div>

      <div
        className="flex items-center justify-center gap-1.5 text-sm py-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
      >
        <span className="text-gray-400">{tab === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
        <button
          onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
          className="font-semibold text-action active:text-action-press"
        >
          {tab === 'login' ? 'Đăng ký' : 'Đăng nhập'}
        </button>
      </div>
    </main>
  );
}
