import { useState } from "react";
import { register, login, logout, getMe } from "../services/auth.service";
import { createRoom } from "../services/alignment.service";

export default function AuthTest() {
  // Form states
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Response displays
  const [apiResponse, setApiResponse] = useState(null);
  const [roomInfo, setRoomInfo] = useState({ roomId: "", token: "" });
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiResponse(null);
    try {
      const data = await register(registerData);
      setApiResponse(data);
    } catch (err) {
      setApiResponse(err.response?.data || { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiResponse(null);
    try {
      const data = await login(loginData);
      setApiResponse(data);
    } catch (err) {
      setApiResponse(err.response?.data || { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setApiResponse(null);
    try {
      const data = await logout();
      setApiResponse(data);
    } catch (err) {
      setApiResponse(err.response?.data || { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestProtected = async () => {
    setLoading(true);
    setApiResponse(null);
    try {
      const data = await getMe();
      setApiResponse(data);
    } catch (err) {
      setApiResponse(err.response?.data || { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setApiResponse(null);
    try {
      const res = await createRoom();
      setApiResponse(res);
      if (res && res.data) {
        setRoomInfo({
          roomId: res.data.roomId || "",
          token: res.data.token || "",
        });
      } else {
        setRoomInfo({ roomId: "", token: "" });
      }
    } catch (err) {
      setApiResponse(err.response?.data || { error: err.message });
      setRoomInfo({ roomId: "", token: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background decorative glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Dev console — deliberately OUTSIDE the product design system (see
          DESIGN_SYSTEM.md); only de-glassed so the app-wide "no backdrop-blur"
          rule holds. */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8">
        
        {/* Title Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Auth & Socket Developer Console
          </h1>
          <p className="text-sm text-slate-400">
            Developer playground for cookies, session, and pairing room socket tests
          </p>
        </div>

        {/* Forms Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Register Card */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
              Register
            </h2>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={registerData.username}
                onChange={handleRegisterChange}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 disabled:text-slate-400 font-semibold rounded-lg text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Register
              </button>
            </form>
          </div>

          {/* Login Card */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
              Login
            </h2>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 disabled:text-slate-400 font-semibold rounded-lg text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Login
              </button>
            </form>
          </div>

        </div>

        {/* Global Developer Actions */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
            Dev Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestProtected}
              disabled={loading}
              className="flex-1 min-w-[140px] py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Test Protected Route
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="flex-1 min-w-[140px] py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850/40 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer shadow-lg shadow-violet-600/20"
            >
              Create Room
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full md:w-auto py-2.5 px-6 bg-rose-600/90 hover:bg-rose-500 disabled:bg-rose-900/40 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Room Info Display */}
        {(roomInfo.roomId || roomInfo.token) && (
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Room Connection Details
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block mb-1 font-semibold">roomId</span>
                <code className="block bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-emerald-300 select-all overflow-x-auto">
                  {roomInfo.roomId}
                </code>
              </div>
              <div>
                <span className="text-slate-400 block mb-1 font-semibold">token</span>
                <code className="block bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-emerald-300 select-all max-h-24 overflow-y-auto break-all">
                  {roomInfo.token}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* API Response Display */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-300">API Response Console</h3>
          <pre className="bg-slate-950 border border-slate-800 text-sky-400 p-4 rounded-xl text-xs font-mono max-h-60 overflow-y-auto shadow-inner">
            {apiResponse ? JSON.stringify(apiResponse, null, 2) : "No request sent yet."}
          </pre>
        </div>

      </div>
    </div>
  );
}
