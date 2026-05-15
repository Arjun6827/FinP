import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthLayout from './pages/AuthLayout';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import Overview from './pages/Overview';
import ReviewQueue from './pages/ReviewQueue';
import Ledger from './pages/Ledger';
import Forecast from './pages/Forecast';
import Integrations from './pages/Integrations';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
        
        <Route path="/" element={<DashboardLayout />}>
          <Route path="dashboard" element={<Overview />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="integrations" element={<Integrations />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
