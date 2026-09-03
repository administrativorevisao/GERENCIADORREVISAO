import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPANIES, companyById, type Company, type CompanyId } from "./companies";

const STORAGE_KEY = "revisionOS_activeCompany";

interface CompanyContextValue {
  company: Company;
  companies: Company[];
  setCompanyId: (id: CompanyId) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState<CompanyId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CompanyId | null;
    return saved ?? "revisao";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, companyId);
    document.documentElement.setAttribute("data-company", companyId === "revisao" ? "" : companyId);
  }, [companyId]);

  const value = useMemo<CompanyContextValue>(
    () => ({ company: companyById(companyId), companies: COMPANIES, setCompanyId }),
    [companyId],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany precisa estar dentro de <CompanyProvider>");
  return ctx;
}
