import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const ManagerDashboard = () => {
  const [ticketsData, setTicketsData] = useState([]);
  const [profileData, setProfileData] = useState([]);
  const [hrDetails, setHrDetails] = useState([]);
  const [assignedTicketIds, setAssignedTicketIds] = useState([]);
  const [hrDataShow, setHrDataShow] = useState([]);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAnalyseLeaveModal, setShowAnalyseLeaveModal] = useState(false);
  const [leaveCount, setLeaveCount] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyLeaveData, setMonthlyLeaveData] = useState({ PlannedLeave: 0, SickLeave: 0, EmergencyLeave: 0 });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedHrEmail, setSelectedHrEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch tickets and HR details
  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found.');
        navigate('/login');
        return;
      }
      const response = await axios.post(
        'http://127.0.0.1:8000/api/manager/view',
        {},
        { headers: { Authorization: token } }
      );
      console.log('Fetch Tickets Response:', response.data);
      setTicketsData(response.data.tickets_data || []);
      setHrDetails(response.data.hr_details || []);
      setProfileData(response.data.profile || []);
      setAssignedTicketIds(response.data.assigned_ticket_id || []);
      setHrDataShow(response.data.hr_data_show || []);
      setError('');
    } catch (err) {
      console.error('Fetch Tickets Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorMsg = err.response?.data?.detail || 'Failed to fetch tickets';
      if (err.response?.status === 401) {
        setError(`AuthenticationFailed: ${errorMsg}`);
        navigate('/login');
      } else {
        setError(errorMsg);
      }
    }
  };

  // Fetch leave count for an employee
  const fetchLeaveCount = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://127.0.0.1:8000/api/manager/view',
        { employee_id: employeeId },
        { headers: { Authorization: token } }
      );
      setLeaveCount(response.data.employee_leave_count);
    } catch (err) {
      console.error('Fetch Leave Count Error:', err);
      setError(err.response?.data?.detail || 'Failed to fetch leave count');
    }
  };

  // Calculate monthly leave data
  const calculateMonthlyLeave = (month) => {
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) return;

    const monthlyLeaves = {
      PlannedLeave: 0,
      SickLeave: 0,
      EmergencyLeave: 0
    };

    const employeeTickets = ticketsData.filter(
      (ticket) => ticket.employee === selectedTicket.employee &&
      ['approved', 're-raised-approved'].includes(ticket.status.toLowerCase())
    );

    employeeTickets.forEach((ticket) => {
      const appliedDate = new Date(ticket.applied_at);
      if (appliedDate.getMonth() === monthIndex) {
        if (ticket.leave_type === 'PlannedLeave') monthlyLeaves.PlannedLeave += 1;
        else if (ticket.leave_type === 'SickLeave') monthlyLeaves.SickLeave += 1;
        else if (ticket.leave_type === 'EmergencyLeave') monthlyLeaves.EmergencyLeave += 1;
      }
    });

    setMonthlyLeaveData(monthlyLeaves);
  };

  // Open analyse leave modal
  const openAnalyseLeaveModal = (ticket) => {
    setSelectedTicket(ticket);
    fetchLeaveCount(ticket.employee_id);
    setShowAnalyseLeaveModal(true);
    setSelectedMonth('');
    setMonthlyLeaveData({ PlannedLeave: 0, SickLeave: 0, EmergencyLeave: 0 });
  };

  // Handle month selection
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    calculateMonthlyLeave(month);
  };

  // Fetch tickets on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Debug state
  useEffect(() => {
    console.log('ticketsData:', ticketsData);
    console.log('hrDetails:', hrDetails);
    console.log('assignedTicketIds:', assignedTicketIds);
    console.log('hrDataShow:', hrDataShow);
    console.log('leaveTypeFilter:', leaveTypeFilter);
    console.log('statusFilter:', statusFilter);
  }, [ticketsData, hrDetails, assignedTicketIds, hrDataShow, leaveTypeFilter, statusFilter]);

  // Open view ticket modal
  const openViewModal = (ticket) => {
    console.log('Selected Ticket:', ticket);
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  // Open assign modal
  const openAssignModal = () => {
    setSelectedHrEmail('');
    setShowViewModal(false);
    setShowAssignModal(true);
  };

  // Open reassign modal
  const openReassignModal = () => {
    setSelectedHrEmail('');
    setShowViewModal(false);
    setShowReassignModal(true);
  };

  // Handle assign ticket
  const handleAssignTicket = async () => {
    if (isSubmitting || !selectedHrEmail) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        hr_email: selectedHrEmail,
        leave_id: selectedTicket.id,
        status: 'in-progress',
      };
      const response = await axios.post('http://127.0.0.1:8000/api/manager/assign', payload, {
        headers: { Authorization: token },
      });
      console.log('Assign Ticket Response:', response.data);
      setShowAssignModal(false);
      setSuccessMessage('Ticket assigned successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      console.error('Assign Ticket Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorMsg = err.response?.data?.detail || 'Failed to assign ticket';
      if (err.response?.status === 401) {
        setError(`AuthenticationFailed: ${errorMsg}`);
        navigate('/login');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reassign ticket
  const handleReassignTicket = async () => {
    if (isSubmitting || !selectedHrEmail) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        id: selectedTicket.id,
        hr_email: selectedHrEmail,
        leave_id: selectedTicket.id,
      };
      const response = await axios.put('http://127.0.0.1:8000/api/manager/assign', payload, {
        headers: { Authorization: token },
      });
      console.log('Reassign Ticket Response:', response.data);
      setShowReassignModal(false);
      setSuccessMessage('Ticket reassigned successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      console.error('Reassign Ticket Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorMsg = err.response?.data?.detail || 'Failed to reassign ticket';
      if (err.response?.status === 401) {
        setError(`AuthenticationFailed: ${errorMsg}`);
        navigate('/login');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tickets by leave type and status
  const filteredTickets = ticketsData.filter((ticket) => {
    const matchesLeaveType =
      leaveTypeFilter === 'All' ||
      ticket.leave_type.toLowerCase() === leaveTypeFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'All' || ticket.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesLeaveType && matchesStatus;
  });

  // Get manager info
  const managerInfo = ticketsData.length > 0
    ? {
        name: profileData[0].name || 'Unknown',
        role: 'Manager',
      }
    : { name: 'Prabha', role: 'Manager' };

  // Get current HR for a ticket
  const getCurrentHr = (ticketId) => {
    const hrData = hrDataShow.find((data) => data.hr_ticket === ticketId);
    return hrData ? `${hrData.hrname} (${hrData.hremail})` : 'Not Assigned';
  };

  return (
    <div className="dashboard-container">
      <style>
        {`
          .dashboard-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #6b7280, #1e3a8a);
            padding: 2rem;
          }

          .dashboard-container .dashboard-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            max-width: 1200px;
            margin: 0 auto;
            animation: fadeIn 0.5s ease-in;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .dashboard-container .manager-header {
            background: #f1f5f9;
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 2rem;
          }

          .dashboard-container .manager-header h3 {
            font-size: 1.8rem;
            color: #1e3a8a;
            margin: 0;
          }

          .dashboard-container .manager-header p {
            font-size: 1rem;
            color: #374151;
            margin: 0;
          }

          .dashboard-container h2 {
            font-size: 2.2rem;
            font-weight: 700;
            color: #1e3a8a;
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .dashboard-container .alert-danger {
            font-size: 0.9rem;
            padding: 0.75rem;
            border-radius: 8px;
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #dc2626;
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .dashboard-container .table {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
          }

          .dashboard-container .table th,
          .dashboard-container .table td {
            padding: 1rem;
            vertical-align: middle;
          }

          .dashboard-container .table th {
            background: #f1f5f9;
            color: #1e3a8a;
            font-weight: 600;
          }

          .dashboard-container .table tbody tr.pending {
            background: #e0f7fa;
          }

          .dashboard-container .table tbody tr.in-progress {
            background: #ffcc80;
          }

          .dashboard-container .table tbody tr.approved {
            background: #c8e6c9;
          }

          .dashboard-container .table tbody tr.hr-rejected,
          .dashboard-container .table tbody tr.tl-rejected {
            background: #fee2e2;
          }

          .dashboard-container .table tbody tr.re-raised {
            background: #ddd6fe;
          }

          .dashboard-container .table tbody tr.re-raised-rejected {
            background: #fecaca;
          }

          .dashboard-container .table tbody tr.re-raised-approved {
            background: #c8e6c9;
          }

          .dashboard-container .table tbody tr.in-progress-tl-level {
            background: #fef9c3;
          }

          .dashboard-container .table tbody tr.rejection-accepted {
            background: #fef3c7;
          }

          .dashboard-container .table tbody tr:hover {
            filter: brightness(95%);
            transition: filter 0.2s ease;
          }

          .dashboard-container .btn-primary,
          .dashboard-container .btn-secondary,
          .dashboard-container .btn-success,
          .dashboard-container .btn-danger,
          .dashboard-container .btn-info,
          .dashboard-container .btn-assign,
          .dashboard-container .btn-assigned,
          .dashboard-container .btn-reassign,
          .dashboard-container .btn-re-raised-rejected,
          .dashboard-container .btn-re-raised-approved,
          .dashboard-container .btn-ticket-re-raised,
          .dashboard-container .btn-waiting-for-approval,
          .dashboard-container .btn-rejected-by-hr,
          .dashboard-container .btn-rejected-by-tl,
          .dashboard-container .btn-rejection-acknowledged,
          .dashboard-container .btn-static,
          .dashboard-container .btn-analyse {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            border-radius: 5px;
            transition: all 0.3s ease;
          }

          .dashboard-container .btn-primary {
            background: linear-gradient(90deg, #3b82f6, #1e40af) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-primary:hover {
            background: linear-gradient(90deg, #1e40af, #1e3a8a) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .btn-secondary {
            background: linear-gradient(90deg, #6b7280, #4b5563) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-secondary:hover {
            background: linear-gradient(90deg, #4b5563, #374151) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(107, 114, 128, 0.3);
          }

          .dashboard-container .btn-success {
            background: linear-gradient(90deg, #10b981, #047857) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-success:hover {
            background: linear-gradient(90deg, #047857, #065f46) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
          }

          .dashboard-container .btn-danger {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-danger:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .dashboard-container .btn-info {
            background: linear-gradient(90deg, #06b6d4, #0891b2) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-info:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
          }

          .dashboard-container .btn-assign {
            background: linear-gradient(90deg, #8b5cf6, #6d28d9) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-assign:hover {
            background: linear-gradient(90deg, #6d28d9, #5b21b6) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
          }

          .dashboard-container .btn-assigned {
            background: linear-gradient(90deg, #f59e0b, #d97706) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-assigned:hover {
            background: linear-gradient(90deg, #d97706, #b45309) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
          }

          .dashboard-container .btn-reassign {
            background: linear-gradient(90deg, #eab308, #ca8a04) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-reassign:hover {
            background: linear-gradient(90deg, #ca8a04, #a16207) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(234, 179, 8, 0.3);
          }

          .dashboard-container .btn-re-raised-rejected {
            background: linear-gradient(90deg, #dc2626, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-re-raised-rejected:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(220, 38, 38, 0.3);
          }

          .dashboard-container .btn-re-raised-approved {
            background: linear-gradient(90deg, #16a34a, #15803d) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-re-raised-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
          }

          .dashboard-container .btn-ticket-re-raised {
            background: linear-gradient(90deg, #a855f7, #7e22ce) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-ticket-re-raised:hover {
            background: linear-gradient(90deg, #7e22ce, #6b21a8) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3);
          }

          .dashboard-container .btn-waiting-for-approval {
            background: linear-gradient(90deg, #f97316, #c2410c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-waiting-for-approval:hover {
            background: linear-gradient(90deg, #c2410c, #9a3412) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(249, 115, 22, 0.3);
          }

          .dashboard-container .btn-rejected-by-hr,
          .dashboard-container .btn-rejected-by-tl {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-rejected-by-hr:hover,
          .dashboard-container .btn-rejected-by-tl:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .dashboard-container .btn-rejection-acknowledged {
            background: linear-gradient(90deg, #facc15, #d97706) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-rejection-acknowledged:hover {
            background: linear-gradient(90deg, #d97706, #b45309) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(250, 204, 21, 0.3);
          }

          .dashboard-container .btn-static {
            background: #e5e7eb !important;
            color: #374151 !important;
            border: 1px solid #d1d5db;
            cursor: default;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-analyse {
            background: linear-gradient(90deg, #3b82f6, #1e40af) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-analyse:hover {
            background: linear-gradient(90deg, #1e40af, #1e3a8a) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .filter-container {
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .dashboard-container .filter-container label {
            font-size: 1rem;
            color: #1e3a8a;
            font-weight: 600;
          }

          .dashboard-container .filter-container select,
          .dashboard-container .modal-body select {
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            background: #f1f5f9;
            color: #374151;
            width: 200px;
          }

          .dashboard-container .filter-container select:focus,
          .dashboard-container .modal-body select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .modal {
            z-index: 1050;
          }

          .dashboard-container .modal-content {
            border-radius: 10px;
            background: #ffffff;
          }

          .dashboard-container .modal-header {
            background: #f1f5f9;
            border-bottom: none;
          }

          .dashboard-container .modal-title {
            color: #1e3a8a;
            font-weight: 600;
          }

          .dashboard-container .modal-body p {
            font-size: 1rem;
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .dashboard-container .modal-body label {
            font-size: 1rem;
            color: #1e3a8a;
            font-weight: 600;
            margin-bottom: 0.5rem;
            display: block;
          }

          .dashboard-container .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
          }

          .dashboard-container .actions-container {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            justify-content: center;
          }

          .dashboard-container .table td.actions-column {
            min-width: 220px;
            text-align: center;
          }

          .dashboard-container .attachment-link {
            color: #1e40af;
            text-decoration: underline;
            font-size: 0.9rem;
          }

          .dashboard-container .attachment-link:hover {
            color: #1e3a8a;
          }

          .dashboard-container .no-attachment {
            font-size: 0.9rem;
            color: #374151;
          }

          .month-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .month-btn {
            background: #e5e7eb;
            color: #374151;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .month-btn:hover {
            background: #d1d5db;
            transform: translateY(-1px);
          }

          .month-btn.active {
            background: linear-gradient(90deg, #3b82f6, #1e40af);
            color: #ffffff;
          }

          .bar-graph {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
            height: 200px;
            margin-top: 1rem;
          }

          .bar {
            flex: 1;
            background: #e5e7eb;
            border-radius: 5px;
            position: relative;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            transition: height 0.3s ease;
          }

          .bar.planned {
            background: #60a5fa;
          }

          .bar.sick {
            background: #f87171;
          }

          .bar.emergency {
            background: #facc15;
          }

          .bar-label {
            position: absolute;
            top: -20px;
            font-size: 0.9rem;
            color: #374151;
          }

          .bar-value {
            position: absolute;
            bottom: -20px;
            font-size: 0.9rem;
            color: #374151;
          }

          .leave-count {
            margin-bottom: 1rem;
            padding: 1rem;
            background: #f1f5f9;
            border-radius: 8px;
          }

          @media (max-width: 768px) {
            .dashboard-container .dashboard-card {
              padding: 1.5rem;
            }

            .dashboard-container h2 {
              font-size: 1.8rem;
            }

            .dashboard-container .manager-header h3 {
              font-size: 1.5rem;
            }

            .dashboard-container .table th,
            .dashboard-container .table td {
              padding: 0.75rem;
              font-size: 0.85rem;
            }

            .dashboard-container .table td.actions-column {
              min-width: 160px;
            }

            .dashboard-container .btn-info,
            .dashboard-container .btn-assign,
            .dashboard-container .btn-assigned,
            .dashboard-container .btn-reassign,
            .dashboard-container .btn-re-raised-rejected,
            .dashboard-container .btn-re-raised-approved,
            .dashboard-container .btn-ticket-re-raised,
            .dashboard-container .btn-waiting-for-approval,
            .dashboard-container .btn-rejected-by-hr,
            .dashboard-container .btn-rejected-by-tl,
            .dashboard-container .btn-rejection-acknowledged,
            .dashboard-container .btn-static,
            .dashboard-container .btn-analyse {
              padding: 0.3rem 0.6rem;
              font-size: 0.8rem;
            }

            .dashboard-container .filter-container {
              flex-direction: column;
              align-items: flex-start;
            }

            .dashboard-container .filter-container select,
            .dashboard-container .modal-body select {
              width: 100%;
            }

            .month-buttons {
              gap: 0.3rem;
            }

            .month-btn {
              padding: 0.4rem 0.8rem;
              font-size: 0.8rem;
            }

            .bar-graph {
              height: 150px;
            }

            .bar-label,
            .bar-value {
              font-size: 0.8rem;
            }
          }
        `}
      </style>
      <div className="dashboard-card">
        <h2>Manager Dashboard - Leave Requests</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="manager-header">
          <h3>{managerInfo.name}</h3>
          <p>Role: {managerInfo.role}</p>
        </div>
        <div className="dashboard-content">
          {/* Filter Dropdowns */}
          <div className="filter-container">
            <label htmlFor="leaveTypeFilter">Filter by Leave Type:</label>
            <select
              id="leaveTypeFilter"
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="PlannedLeave">Planned Leave</option>
              <option value="SickLeave">Sick Leave</option>
              <option value="EmergencyLeave">Emergency Leave</option>
            </select>
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="in-progress-tl-level">In Progress TL Level</option>
              <option value="hr-rejected">HR Rejected</option>
              <option value="tl-rejected">TL Rejected</option>
              <option value="re-raised">Re-Raised</option>
              <option value="re-raised-rejected">Re-Raised Rejected</option>
              <option value="re-raised-approved">Re-Raised Approved</option>
              <option value="rejection-accepted">Rejection Acknowledged</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          {/* Tickets Table */}
          {filteredTickets.length > 0 ? (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Requester Name</th>
                  <th>Leave Type</th>
                  <th>Applied At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={ticket.status.toLowerCase().replace(/ /g, '-')}
                  >
                    <td>{ticket.employee || '-'}</td>
                    <td>{ticket.leave_type || '-'}</td>
                    <td>{ticket.applied_at || '-'}</td>
                    <td className="actions-container">
                      {ticket.status.toLowerCase() === 'pending' ? (
                        <button
                          className="btn btn-assign btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Assign
                        </button>
                      ) : ticket.status.toLowerCase() === 'in-progress' ? (
                        <>
                          <button
                            className="btn btn-reassign btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Reassign
                          </button>
                          <button className="btn btn-assigned btn-sm" disabled>
                            Assigned
                          </button>
                        </>
                      ) : ticket.status.toLowerCase() === 'in-progress-tl-level' ? (
                        <button
                          className="btn btn-waiting-for-approval btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Waiting for Approval
                        </button>
                      ) : ticket.status.toLowerCase() === 'hr-rejected' ? (
                        <button
                          className="btn btn-rejected-by-hr btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Rejected by HR
                        </button>
                      ) : ticket.status.toLowerCase() === 'tl-rejected' ? (
                        <button
                          className="btn btn-rejected-by-tl btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Rejected by TL
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raised' ? (
                        <button
                          className="btn btn-ticket-re-raised btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Ticket Re-Raised
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raised-rejected' ? (
                        <button
                          className="btn btn-re-raised-rejected btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Re-Raised Rejected
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raised-approved' ? (
                        <button
                          className="btn btn-re-raised-approved btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Re-Raised Approved
                        </button>
                      ) : ticket.status.toLowerCase() === 'rejection-accepted' ? (
                        <button
                          className="btn btn-rejection-acknowledged btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Rejection Acknowledged
                        </button>
                      ) : ticket.status.toLowerCase() === 'approved' ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Approved
                        </button>
                      ) : (
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          View Ticket
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No leave requests found for the selected filters.</p>
          )}
        </div>

        {/* View Ticket Modal */}
        <div className={`modal ${showViewModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ticket Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedTicket && (
                  <>
                    <p><strong>Ticket ID:</strong> {selectedTicket.id || '-'}</p>
                    <p><strong>Requester Name:</strong> {selectedTicket.employee || '-'}</p>
                    <p><strong>Leave Type:</strong> {selectedTicket.leave_type || '-'}</p>
                    <p><strong>Reason:</strong> {selectedTicket.reason || '-'}</p>
                    <p><strong>Start Date:</strong> {selectedTicket.start_date || '-'}</p>
                    <p><strong>End Date:</strong> {selectedTicket.end_date || '-'}</p>
                    <p><strong>Status:</strong> {selectedTicket.status || 'Pending'}</p>
                    <p><strong>Applied At:</strong> {selectedTicket.applied_at || '-'}</p>
                    <p><strong>Employee Message:</strong> {selectedTicket.employee_message || '-'}</p>
                    <p>
                      <strong>Attachment:</strong>{' '}
                      {selectedTicket.attachment && selectedTicket.attachment !== 'No attachment' ? (
                        <a
                          href={selectedTicket.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          View Attachment
                        </a>
                      ) : (
                        <span className="no-attachment">No attachment</span>
                      )}
                    </p>
                    <p><strong>Current HR:</strong> {getCurrentHr(selectedTicket.id)}</p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {selectedTicket && (
                  <>
                    {selectedTicket.status.toLowerCase() === 'pending' ? (
                      <button
                        className="btn btn-assign btn-sm"
                        onClick={openAssignModal}
                        disabled={isSubmitting}
                      >
                        Assign
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress' ? (
                      <button
                        className="btn btn-reassign btn-sm"
                        onClick={openReassignModal}
                        disabled={isSubmitting}
                      >
                        Reassign
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Progress in TL-Level
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'hr-rejected' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Rejected by HR
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'tl-rejected' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Rejected by TL
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raised' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Ticket Reraised
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raised-rejected' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raised Rejected
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raised-approved' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raised Approved
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'rejection-accepted' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Rejection Acknowledged by Employee
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'approved' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Approved
                      </button>
                    ) : (
                      <button className="btn btn-static btn-sm" disabled>
                        No Actions Available
                      </button>
                    )}
                    <button
                      className="btn btn-analyse btn-sm"
                      onClick={() => openAnalyseLeaveModal(selectedTicket)}
                    >
                      Analyse Leave
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowViewModal(false)}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analyse Leave Modal */}
        <div className={`modal ${showAnalyseLeaveModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Leave Analysis for {selectedTicket?.employee}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAnalyseLeaveModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {leaveCount ? (
                  <div className="leave-count">
                    <p><strong>Remaining Planned Leave:</strong> {leaveCount.Remaining_Planned_Leave}</p>
                    <p><strong>Remaining Sick Leave:</strong> {leaveCount.Remaining_Sick_Leave}</p>
                    <p><strong>Remaining Emergency Leave:</strong> {leaveCount.Remaining_Emergency_Leave}</p>
                  </div>
                ) : (
                  <p>Loading leave count...</p>
                )}
                <label>Select Month:</label>
                <div className="month-buttons">
                  {months.map((month) => (
                    <button
                      key={month}
                      className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
                      onClick={() => handleMonthSelect(month)}
                    >
                      {month}
                    </button>
                  ))}
                </div>
                {selectedMonth && (
                  <>
                    <h6>Leave Report for {selectedMonth}</h6>
                    <div className="bar-graph">
                      <div
                        className="bar planned"
                        style={{ height: `${monthlyLeaveData.PlannedLeave * 40}px` }}
                      >
                        <span className="bar-label">Planned</span>
                        <span className="bar-value">{monthlyLeaveData.PlannedLeave}</span>
                      </div>
                      <div
                        className="bar sick"
                        style={{ height: `${monthlyLeaveData.SickLeave * 40}px` }}
                      >
                        <span className="bar-label">Sick</span>
                        <span className="bar-value">{monthlyLeaveData.SickLeave}</span>
                      </div>
                      <div
                        className="bar emergency"
                        style={{ height: `${monthlyLeaveData.EmergencyLeave * 40}px` }}
                      >
                        <span className="bar-label">Emergency</span>
                        <span className="bar-value">{monthlyLeaveData.EmergencyLeave}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAnalyseLeaveModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assign Modal */}
        <div className={`modal ${showAssignModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Assign Ticket</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="hrSelect">Select HR:</label>
                <select
                  id="hrSelect"
                  value={selectedHrEmail}
                  onChange={(e) => setSelectedHrEmail(e.target.value)}
                  required
                >
                  <option value="">Select HR</option>
                  {hrDetails.map((hr, index) => (
                    <option key={index} value={hr.email}>
                      {hr.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleAssignTicket}
                  disabled={isSubmitting || !selectedHrEmail}
                >
                  Confirm Assign
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reassign Modal */}
        <div className={`modal ${showReassignModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reassign Ticket</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReassignModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="hrReassignSelect">Select HR:</label>
                <select
                  id="hrReassignSelect"
                  value={selectedHrEmail}
                  onChange={(e) => setSelectedHrEmail(e.target.value)}
                  required
                >
                  <option value="">Select HR</option>
                  {hrDetails.map((hr, index) => (
                    <option key={index} value={hr.email}>
                      {hr.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-reassign btn-sm"
                  onClick={handleReassignTicket}
                  disabled={isSubmitting || !selectedHrEmail}
                >
                  Confirm Reassign
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowReassignModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        <div className={`modal ${showSuccessModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Success</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>{successMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;