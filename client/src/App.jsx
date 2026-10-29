import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import Layout from './components/Layout.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Contacts from './pages/Contacts.jsx';
import Accounts from './pages/Accounts.jsx';
import Deals from './pages/Deals.jsx';
import Activities from './pages/Activities.jsx';
import Tasks from './pages/Tasks.jsx';
import Calendar from './pages/Calendar.jsx';
import Reports from './pages/Reports.jsx';
import Automation from './pages/Automation.jsx';
import Settings from './pages/Settings.jsx';
import Chat from './pages/Chat.jsx';
import ChatWidget from './pages/ChatWidget.jsx';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-load">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/talk/:orgId" element={<ChatWidget />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
