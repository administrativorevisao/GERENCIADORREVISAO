import { useCompanySettings } from "../../core/companies/companySettings";
import type { Company } from "../../core/companies/companies";

export function BrandLogo({ company, size = 38 }: { company: Company; size?: number }) {
  const { data } = useCompanySettings();
  return (
    <div className="brand-logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {data?.customLogo ? (
        <img className="logo-upload" src={data.customLogo} alt={company.name} />
      ) : (
        company.initials
      )}
    </div>
  );
}
