import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';

type Tab = 'login' | 'register';

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: 'Quản lý tập trung',
    desc: 'Toàn bộ thiết bị được quản lý trên một nền tảng duy nhất',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Đặt mượn trực tuyến',
    desc: 'Giảng viên đặt mượn thiết bị mọi lúc, mọi nơi',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    title: 'Lịch sử minh bạch',
    desc: 'Theo dõi đầy đủ lịch sử mượn/trả của từng thiết bị',
  },
];

const ErrorBox = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
    {msg}
  </div>
);

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
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

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors duration-150 bg-white placeholder:text-gray-400';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#dbeafe_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#e0e7ff_0%,_transparent_60%)]" />

      <div className="relative z-10 w-full max-w-4xl rounded-3xl shadow-2xl shadow-slate-400/30 overflow-hidden flex min-h-[600px]">

        {/* LEFT — Branding */}
        <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex-col justify-between p-10 relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-28 -left-12 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative">
            {/* Chuyển div thành Link và thêm thuộc tính to="/" */}
            <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white text-xs font-bold">DUT</span>
              </div>
              <span className="text-white/80 text-sm font-medium">Đại học Bách Khoa Đà Nẵng</span>
            </Link>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-2.5">
              Hệ thống Quản lý<br />Thiết bị Công nghệ
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
              Nền tảng số hoá việc quản lý, đặt mượn và theo dõi thiết bị phòng thí nghiệm của nhà trường.
            </p>
          </div>

          <div className="relative space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-blue-200 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="h-px bg-white/15 mb-4" />
            <p className="text-blue-300 text-xs">DUT — The University of Da Nang · {new Date().getFullYear()}</p>
            <p className="text-blue-400 text-xs mt-0.5">54 Nguyễn Lương Bằng, Đà Nẵng</p>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="relative flex-1 bg-white flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-sm">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <span className="text-base font-bold text-gray-900">QLTBC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
              {tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {tab === 'login'
                ? 'Đăng nhập để tiếp tục sử dụng hệ thống'
                : 'Chỉ chấp nhận email @dut.udn.vn'}
            </p>


            {/* LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@dut.udn.vn"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClass}
                  />
                </div>
                {loginError && <ErrorBox msg={loginError} />}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-11 rounded-xl bg-blue-100 text-blue-700 border border-blue-300 text-sm font-semibold hover:bg-blue-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-sm shadow-blue-200/50 mt-2"
                >
                  {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Họ và tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ten@dut.udn.vn"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Khoa công tác <span className="text-gray-400 normal-case font-normal">(tuỳ chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="VD: Khoa Công nghệ Thông tin"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Số điện thoại <span className="text-gray-400 normal-case font-normal">(tuỳ chọn)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Mật khẩu</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Ít nhất 8 ký tự"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                    className={inputClass}
                  />
                </div>
                {regError && <ErrorBox msg={regError} />}
                {regSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Đăng ký thành công! Đang chuyển sang đăng nhập...
                  </div>
                )}
                <button
                  type="submit"
                  disabled={regLoading || regSuccess}
                  className="w-full h-11 rounded-xl bg-blue-100 text-blue-700 border border-blue-300 text-sm font-semibold hover:bg-blue-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-sm shadow-blue-200/50 mt-1"
                >
                  {regLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </button>
              </form>
            )}
          </div>

          {/* Tab switcher — góc dưới phải
          <div className="absolute bottom-4 right-5 flex items-center gap-1 text-xs">
            <button
              onClick={() => switchTab('login')}
              className={`font-medium transition-colors duration-150 ${
                tab === 'login' ? 'text-blue-600 underline underline-offset-2' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Đăng nhập
            </button>
            <span className="text-gray-300 select-none px-0.5">·</span>
            <button
              onClick={() => switchTab('register')}
              className={`font-medium transition-colors duration-150 ${
                tab === 'register' ? 'text-blue-600 underline underline-offset-2' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Đăng ký
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
