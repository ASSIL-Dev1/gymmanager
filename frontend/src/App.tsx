import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Adherents from './pages/Adherents';
import AdherentDetail from './pages/AdherentDetail';
import Abonnements from './pages/Abonnements';
import Paiements from './pages/Paiements';
import TypesAbonnement from './pages/TypesAbonnement';
import CoursPage from './pages/Cours';
import Presences from './pages/Presences';
import Machines from './pages/Machines';
import Pannes from './pages/Pannes';
import Maintenances from './pages/Maintenances';
import Personnel from './pages/Personnel';

/** F03 : sans session, toute page administrative redirige vers la connexion. */
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-20"><Spinner /></div>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="adherents" element={<Adherents />} />
          <Route path="adherents/:id" element={<AdherentDetail />} />
          <Route path="abonnements" element={<Abonnements />} />
          <Route path="paiements" element={<Paiements />} />
          <Route path="offres" element={<TypesAbonnement />} />
          <Route path="cours" element={<CoursPage />} />
          <Route path="presences" element={<Presences />} />
          <Route path="machines" element={<Machines />} />
          <Route path="pannes" element={<Pannes />} />
          <Route path="maintenances" element={<Maintenances />} />
          <Route path="personnel" element={<Personnel />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
