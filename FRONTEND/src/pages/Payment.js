import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // useLocation 추가
import { Landmark, Calendar, Copy, CheckCircle2 } from 'lucide-react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { createPayment } from '../api/payments';

export default function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. 전달받은 플랜 데이터 가져오기
    const selectedPlan = location.state?.selectedPlan;

    // 데이터가 없을 경우 (직접 접속 등)를 위한 리다이렉트 처리 또는 기본값
    if (!selectedPlan) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="mb-4">선택된 플랜 정보가 없습니다.</p>
                    <button onClick={() => navigate('/pricing')} className="text-blue-500 underline">요금제 페이지로 돌아가기</button>
                </div>
            </div>
        );
    }

    // 날짜 계산 (오늘부터 durationDays 이후)
    const getTargetDate = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = getTargetDate(selectedPlan.durationDays || 30);

    const handleComplete = async () => {
        try {
            await createPayment({
                gradeName: selectedPlan.gradeName,
                amount: selectedPlan.price
            });

            alert("입금 확인 신청이 완료되었습니다. 관리자 승인 후 반영됩니다.");
            navigate('/dashboard');
        } catch (error) {
            console.error("Payment Error:", error);
            alert(error.message || "결제 신청 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Header />

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold mb-2">결제 신청 안내</h1>
                        <p className="text-slate-400">아래 계좌로 입금해 주시면 확인 후 즉시 승인됩니다.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
                        <div className="bg-blue-600/20 p-8 border-b border-white/10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-blue-300 text-sm font-semibold uppercase tracking-wider">Selected Plan</p>
                                    <h2 className="text-3xl font-black mt-1">{selectedPlan.displayName}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">₩{selectedPlan.price.toLocaleString()}</p>
                                    <p className="text-slate-400 text-sm">부가세 포함</p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-6 text-sm text-slate-300">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    시작일: {startDate}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    종료일: {endDate}
                                </div>
                            </div>
                        </div>

                        {/* 계좌 정보 섹션 (기존과 동일) */}
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                    <Landmark className="w-4 h-4" /> 입금 계좌 정보
                                </label>
                                {/* ... 계좌 상세 UI ... */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-slate-500 mb-1">은행명</p>
                                        <p className="font-semibold text-slate-200"></p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-slate-500 mb-1">계좌번호</p>
                                        <p className="font-semibold text-slate-200"></p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleComplete}
                                className="w-full py-5 bg-white text-slate-950 hover:bg-blue-50 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
                            >
                                <CheckCircle2 className="w-6 h-6" /> 결제 완료 (입금 확인 요청)
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}