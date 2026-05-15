import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './pages/AuthLayout';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import Overview from './pages/Overview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
        
        <Route path="/" element={<DashboardLayout />}>
          <Route path="dashboard" element={<Overview />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
