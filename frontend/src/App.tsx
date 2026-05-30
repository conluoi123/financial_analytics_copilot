import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { AIInsights } from './pages/AIInsights';
import { BankAccounts } from './pages/BankAccount';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="anomaly-monitor" element={<Analytics />} />
          <Route path="ai-copilot" element={<AIInsights />} />
          <Route path="banks-overview" element={<BankAccounts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
