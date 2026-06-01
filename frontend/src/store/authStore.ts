import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      login: (user, token) => set({ user, accessToken: token }),
      logout: () => set({ user: null, accessToken: null }),
      setUser: (user) => set({ user }),
    }),
    { name: 'dut-auth' }
  )
);
