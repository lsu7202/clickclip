import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { getPlans } from '../api/payments';

export default function Pricing() {
    // 상태 관리: 요금제 목록, 로딩 상태, 에러 상태
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true);
                const response = await getPlans();

                console.log(response)
                
                // 서버 응답 구조: { success: true, data: { items: [...] } }
                if (response.status === 'success' && response.data?.items) {
            setPlans(response.data.items);
        } else {
            throw new Error("데이터 형식이 올바르지 않습니다.");
        }
            } catch (err) {
                console.error("요금제 로드 실패:", err);
                setError("요금제 정보를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col justify-center">
                <section className="relative overflow-hidden py-20 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl font-bold mb-4">멤버십 플랜 선택</h1>
                        <p className="text-slate-400 mb-12">무통장 입금 완료 후 관리자가 승인하면 크레딧이 충전됩니다.</p>

                        {/* 1. 로딩 중일 때 */}
                        {loading && (
                            <div className="flex flex-col justify-center items-center py-20 gap-4">
                                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                                <p className="text-slate-400 font-medium">요금제 데이터를 가져오는 중...</p>
                            </div>
                        )}

                        {/* 2. 에러 발생 시 */}
                        {!loading && error && (
                            <div className="flex flex-col justify-center items-center py-20 gap-4 bg-red-500/10 border border-red-500/20 rounded-3xl">
                                <AlertCircle className="w-12 h-12 text-red-500" />
                                <p className="text-red-400 font-medium">{error}</p>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    다시 시도
                                </button>
                            </div>
                        )}

                        {/* 3. 데이터 로드 완료 시 */}
                        {!loading && !error && (
                            <div className="flex flex-wrap justify-center gap-8">
                                {plans.map((plan) => (
                                    <div 
                                        key={plan.gradeName} 
                                        className="w-full max-w-sm border border-white/10 bg-white/5 rounded-[2.5rem] p-10 hover:border-blue-500/50 transition-all hover:scale-[1.02] duration-300 backdrop-blur-sm flex flex-col"
                                    >
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-bold mb-2 text-slate-100">{plan.displayName}</h2>
                                            <div className="flex justify-center items-baseline gap-1">
                                                <span className="text-4xl font-black text-white">
                                                    ₩{plan.price.toLocaleString()}
                                                </span>
                                                <span className="text-slate-400 text-sm">/ {plan.durationDays}일</span>
                                            </div>
                                        </div>

                                        <div className="space-y-5 mb-10 text-left flex-1">
                                            <div className="flex items-center gap-4 text-slate-300">
                                                <div className="bg-blue-500/20 p-1 rounded-full">
                                                    <Check className="text-blue-400 w-4 h-4" />
                                                </div>
                                                <span className="font-medium">{plan.credits.toLocaleString()} 크레딧 제공</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-slate-300">
                                                <div className="bg-blue-500/20 p-1 rounded-full">
                                                    <Check className="text-blue-400 w-4 h-4" />
                                                </div>
                                                <span className="font-medium">영상분석 1분당 1크레딧</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-slate-300">
                                                <div className="bg-blue-500/20 p-1 rounded-full">
                                                    <Check className="text-blue-400 w-4 h-4" />
                                                </div>
                                                <span className="font-medium">TTS/완료하기 1분당 5크레딧</span>
                                            </div>
                                        </div>

                                        <Link 
                                            to="/payment" 
                                            state={{ selectedPlan: plan }}
                                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <CreditCard className="w-5 h-5" /> 플랜 가입하기
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* 4. 데이터는 불러왔으나 비어있을 때 */}
                        {!loading && !error && plans.length === 0 && (
                            <p className="text-slate-500">현재 이용 가능한 요금제가 없습니다.</p>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}