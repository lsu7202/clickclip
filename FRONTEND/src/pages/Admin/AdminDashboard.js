import React, { useEffect, useState } from 'react';
import { UserCheck, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { getAllPayments, approvePayment } from '../../api/payments';

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await getAllPayments();
      setPayments(response.data?.items || []);
    } catch (err) {
      alert(err.message || "목록 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (paymentId) => {
    const adminKey = window.prompt("관리자 승인 비밀번호를 입력하세요.");
    if (!adminKey) return;

    try {
      await approvePayment(paymentId, adminKey);
      alert("승인 완료!");
      fetchPayments(); 
    } catch (err) {
      alert(err.message || "승인 실패");
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10 border-b pb-6">
        <div className="flex items-center gap-3 text-slate-900">
          <ShieldCheck size={32} />
          <h1 className="text-3xl font-bold">관리자 패널: 결제 승인</h1>
        </div>
        <button onClick={fetchPayments} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b font-bold text-slate-600">
            <tr>
              <th className="p-4">신청일시</th>
              <th className="p-4">식별번호</th>
              <th className="p-4">플랜 / 금액</th>
              <th className="p-4 text-center">상태</th>
              <th className="p-4 text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="5" className="p-20 text-center text-slate-400">내역이 없습니다.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.paymentid || p.paymentId} className="hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(p.createdat || p.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-medium">{p.userid || p.userId}</td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-blue-600 uppercase">{p.gradename || p.gradeName}</div>
                    <div className="font-semibold">₩{parseFloat(p.amount).toLocaleString()}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${(p.status?.toLowerCase() === 'pending') ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.status?.toLowerCase() === 'pending' && (
                      <button 
                        onClick={() => handleApprove(p.paymentid || p.paymentId)}
                        className="mx-auto bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      >
                        <UserCheck size={18} /> 입금 승인
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}