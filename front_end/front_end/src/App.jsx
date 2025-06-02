import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import EmployeeDashboard from './components/EmployeeDashboard'
import ManagerDashboard from './components/ManagerDashboard'
import HRDashboard from './components/HRDashboard'
import TLDashboard from './components/TLDashboard'
import './components/Login.css';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/hr" element={<HRDashboard />} />    
        <Route path="/teamlead" element={<TLDashboard />} />    

        
      </Routes>
    </BrowserRouter>
  )
}
export default App