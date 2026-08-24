import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminPage from './admin/AdminPage';
import DisplayPage from './display/DisplayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/display/main" element={<DisplayPage screenId="screen-main" />} />
      <Route path="/display/bar" element={<DisplayPage screenId="screen-bar" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
