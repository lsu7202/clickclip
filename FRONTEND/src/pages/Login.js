import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { login } from '../api/auth';

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await login(formData);

            console.log(response)
            
            if (response.status === "success") {
                // 로그인 성공 - 대시보드로 이동
                navigate('/dashboard');
            } else {
                setError(response.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.error || err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-white">
            <Header />

            <main className="flex flex-1 items-center justify-center px-6 py-12">
                <section className="relative w-full overflow-hidden">
                    <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
                        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/20 backdrop-blur md:grid-cols-[0.95fr_1.05fr]">
                            <div className="flex flex-col justify-between bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-slate-950 p-8 md:p-10">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">YourFactory</p>
                                    <h1 className="mt-4 text-4xl font-black tracking-tight text-white">로그인</h1>
                                    <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                                        설명
                                    </p>
                                </div>

                                <div className="mt-12 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                                    <p className="text-sm text-slate-400">계정이 없으신가요?</p>
                                    <Link to="/register" className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">
                                        회원가입 페이지로 이동
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-slate-950/70 p-8 md:p-10">
                                {error && (
                                    <div className="mb-4 rounded-lg border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-300">
                                        {error}
                                    </div>
                                )}
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
                                            아이디(이메일)
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
                                            비밀번호
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="비밀번호를 입력하세요"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? '로그인 중...' : '로그인'}
                                    </button>
                                </form>

                                <p className="mt-6 text-center text-sm text-slate-400">
                                    처음이신가요?{' '}
                                    <Link to="/register" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
                                        회원가입
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />

        </div>
    );
}
