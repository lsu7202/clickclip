import { useEffect, useState } from 'react';
import { getSession, isAuthenticated, clearToken } from '../api/auth';

const mockSessionUser = {
  userId: 'coms1768',
  name: '이승욱',
  email: 'coms1768@example.com',
  isAuthenticated: true,
  permission: {
    status: 'Active',
    gradeName: 'Pro',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    remainingDays: 20,
  },
  credits: {
    remainingCredits: 10,
    totalUsedCredits: 4,
  },
  videoHistory: [
    // { id: '123', title: '맛집 리뷰 쇼츠', length: '0:58', status: 'Done', date: '2026.05.10' },
    // { id: '456', title: '코딩 강의 요약', length: '1:20', status: 'Processing', date: '2026.05.09' },
  ],
};

function normalizeSessionUser(payload) {
//   if (!payload) {
//     return mockSessionUser;
//   }

  const permission = payload.permission ?? {};
  const credits = payload.credits ?? {};

  return {
    userId: payload.userId ?? payload.user?.userId ?? mockSessionUser.userId,
    name: payload.name ?? payload.user?.name ?? mockSessionUser.name,
    email: payload.email ?? payload.user?.email ?? mockSessionUser.email,
    isAuthenticated: payload.isAuthenticated ?? true,
    permission: {
      status: permission.status ?? payload.permissionStatus ?? mockSessionUser.permission.status,
      gradeName: permission.gradeName ?? payload.gradeName ?? mockSessionUser.permission.gradeName,
      startDate: permission.startDate ?? mockSessionUser.permission.startDate,
      endDate: permission.endDate ?? mockSessionUser.permission.endDate,
      remainingDays: permission.remainingDays ?? mockSessionUser.permission.remainingDays,
    },
    credits: {
      remainingCredits: credits.remainingCredits ?? payload.remainingCredits ?? mockSessionUser.credits.remainingCredits,
      totalUsedCredits: credits.totalUsedCredits ?? payload.totalUsedCredits ?? mockSessionUser.credits.totalUsedCredits,
    },
    videoHistory: payload.videoHistory ?? mockSessionUser.videoHistory,
  };
}

export default function useSessionUser() {
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionUser() {
      // 1. 토큰 자체가 없으면 시도조차 안 함
      if (!isAuthenticated()) {
        if (isMounted) {
          setSessionUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // 2. 아까 만든 axios 기반 client.get('/auth/me') 호출
        const response = await getSession();

        if (isMounted) {
          // 서버 응답 구조: { status: 'success', data: { userId, ... } }
          if (response.status === 'success') {
            setSessionUser({
              ...response.data,
              isAuthenticated: true,
              videoHistory: response.data.videoHistory || [] // 나중에 API 확장 대비
            });
          }
          setError(null);
        }
      } catch (fetchError) {
        if (isMounted) {
          console.error('Session Load Failed:', fetchError);
          setError(fetchError);
          setSessionUser(null);
          // 토큰은 있는데 서버에서 거부(401 등)하면 클린업
          if (fetchError.status === 401) clearToken();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSessionUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return { sessionUser, loading, error };
}