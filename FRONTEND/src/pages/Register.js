import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { register } from '../api/auth';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        birthDate: '',
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
            // 유효성 검사
            if (!formData.email || !formData.password || !formData.name || !formData.birthDate || !formData.phone) {
                setError('입력값이 없습니다.');
                setLoading(false);
                return;
            }

            const response = await register(formData);
            
            
            if (response.status) {
                // 회원가입 성공 - 대시보드로 이동
                navigate('/login');
            } else {
                setError(response.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Register error:', err);
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
                        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/20 backdrop-blur md:grid-cols-[1fr_1fr]">
                            <div className="bg-gradient-to-br from-blue-500/15 via-cyan-400/10 to-slate-950 p-8 md:p-10">
                                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Join YourFactory</p>
                                <h1 className="mt-4 text-4xl font-black tracking-tight text-white">회원가입</h1>
                                <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                                    쇼츠 제작을 시작하려면 계정이 필요합니다. 가입 후 바로 로그인하고 영상 업로드를 진행하세요.
                                </p>

                                <div className="mt-12 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                                    <p className="text-sm text-slate-400">이미 계정이 있으신가요?</p>
                                    <Link to="/login" className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">
                                        로그인 페이지로 이동
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-slate-950/70 p-8 md:p-10">
                                {error && (
                                    <div className="mb-4 rounded-lg border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-300">
                                        {error}
                                    </div>
                                )}
                                <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
                                    <div className="sm:col-span-2">
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

                                    <div className="sm:col-span-2">
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

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="name">
                                            이름
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="이름"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="phone">
                                            전화번호
                                        </label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="010-1234-5678"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="birthDate">
                                            생년월일
                                        </label>
                                        <input
                                            id="birthDate"
                                            name="birthDate" // formData의 키값도 birthDate로 맞추는 것을 추천합니다.
                                            type="text"
                                            value={formData.birthDate || ''}
                                            onChange={handleChange}
                                            placeholder="생년월일 8자리"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition [color-scheme:dark] placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? '회원가입 중...' : '회원가입'}
                                        </button>
                                    </div>
                                </form>

                                <p className="mt-6 text-center text-sm text-slate-400">
                                    계정이 있으신가요?{' '}
                                    <Link to="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
                                        로그인
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
