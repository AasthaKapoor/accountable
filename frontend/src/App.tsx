import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout, PageHeader } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { ContactPage } from "./features/contacts/ContactPage";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DealPage } from "./features/deals/DealPage";
import { DealsPage } from "./features/deals/DealsPage";
import { OrganizationPage } from "./features/organizations/OrganizationPage";
import { OrganizationsPage } from "./features/organizations/OrganizationsPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5_000 },
    },
  });
}

const queryClient = createQueryClient();

function NotFound() {
  return <PageHeader title="Page not found" sub="That page doesn't exist." />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
