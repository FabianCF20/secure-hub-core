import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormFill from "./pages/FormFill";
import Records from "./pages/Records";
import RecordDetail from "./pages/RecordDetail";
import Reports from "./pages/Reports";
import Minuta from "./pages/Minuta";
import Intelligence from "./pages/Intelligence";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="/forms" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"]}>
                    <Forms />
                  </ProtectedRoute>
                } />
                <Route path="/forms/builder" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL"]}>
                    <FormBuilder />
                  </ProtectedRoute>
                } />
                <Route path="/forms/builder/:formId" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL"]}>
                    <FormBuilder />
                  </ProtectedRoute>
                } />
                <Route path="/forms/fill/:formId" element={
                  <ProtectedRoute allowedRoles={["SUPERVISOR", "GUARDA"]}>
                    <FormFill />
                  </ProtectedRoute>
                } />
                <Route path="/records" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"]}>
                    <Records />
                  </ProtectedRoute>
                } />
                <Route path="/records/:recordId" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"]}>
                    <RecordDetail />
                  </ProtectedRoute>
                } />
                <Route path="/minuta" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "GUARDA"]}>
                    <Minuta />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "COORDINADOR"]}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/intelligence" element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CENTRAL", "COORDINADOR", "SUPERVISOR", "GUARDA"]}>
                    <Intelligence />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Settings />
                  </ProtectedRoute>
                } />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
