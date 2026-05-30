import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { AIInsights } from './pages/AIInsights';
import { BankAccounts } from './pages/BankAccounts';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'anomaly-monitor',
        element: <Analytics />,
      },
      {
        path: 'ai-copilot',
        element: <AIInsights />,
      },
      {
        path: 'banks-overview',
        element: <BankAccounts />,
      },
    ],
  },
]);
