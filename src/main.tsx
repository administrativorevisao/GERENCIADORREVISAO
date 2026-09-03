import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/global.css";
import App from "./App.tsx";
import { CompanyProvider } from "./core/companies/CompanyContext";
import { AuthProvider } from "./shared/auth/AuthContext";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CompanyProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CompanyProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
