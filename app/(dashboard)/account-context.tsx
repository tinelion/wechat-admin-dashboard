'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccountConfig {
  id: number;
  appid: string;
  name: string;
  accountType: string;
  enabled: boolean;
}

interface AccountContextType {
  accounts: AccountConfig[];
  currentAccount: AccountConfig | null;
  currentAccountId: number | null;
  switchAccount: (id: number) => void;
  refreshAccounts: () => Promise<void>;
  loading: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  currentAccount: null,
  currentAccountId: null,
  switchAccount: () => {},
  refreshAccounts: async () => {},
  loading: true,
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/wechat/config');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.accounts || []);
      setAccounts(list);
      if (list.length > 0 && !currentAccountId) {
        const first = list.find((a: any) => a.enabled) || list[0];
        setCurrentAccountId(first.id);
        localStorage.setItem('currentAccountId', String(first.id));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentAccountId');
    if (saved) setCurrentAccountId(Number(saved));
    fetchAccounts();
  }, []);

  const switchAccount = (id: number) => {
    setCurrentAccountId(id);
    localStorage.setItem('currentAccountId', String(id));
  };

  const currentAccount = accounts.find(a => a.id === currentAccountId) || null;

  return (
    <AccountContext.Provider value={{ accounts, currentAccount, currentAccountId, switchAccount, refreshAccounts: fetchAccounts, loading }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
