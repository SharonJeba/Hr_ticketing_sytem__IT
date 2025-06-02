import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const [ticketsData, setTicketsData] = useState([]);
  const [remainingLeave, setRemainingLeave] = useState({});
  const [employeeInfo, setEmployeeInfo] = useState({ name: 'Unknown', role: 'Employee', email: 'Unknown' });
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showQueryAnswerModal, setShowQueryAnswerModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWaitingForReRaiseApproval, setIsWaitingForReRaiseApproval] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: '',
    reason: '',
    start_date: '',
    end_date: '',
    attachment: null,
    employee_message: '',
  });
  const navigate = useNavigate();

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthError('AuthenticationFailed: No authentication token found.');
        setShowAuthErrorModal(true);
        return;
      }
      const response = await axios.get('http://127.0.0.1:8000/api/emp/view', {
        headers: { Authorization: token },
      });
      const sortedTickets = (response.data.tickets_data || []).sort((a, b) => 
        new Date(b.applied_at) - new Date(a.applied_at)
      );
      setTicketsData(sortedTickets);
      setRemainingLeave(response.data.remaining_leave || {});
      setEmployeeInfo({
        name: response.data.emp_info?.employee_name || 'Unknown',
        role: sortedTickets.length > 0 ? (sortedTickets[0].Employee_role || 'Employee') : 'Employee',
        email: response.data.emp_info?.employee_mail || 'Unknown',
        total : response.data.emp_info?.Total_leave_tickets || 'Unknown'
      });
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch tickets';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openViewModal = (ticket) => {
    setSelectedTicket(ticket);
    setIsWaitingForReRaiseApproval(false);
    setShowViewModal(true);
  };

  const openUpdateModal = () => {
    setFormData({
      leave_type: leaveTypeToNumber(selectedTicket.leave_type),
      reason: selectedTicket.reason || '',
      start_date: selectedTicket.start_date || '',
      end_date: selectedTicket.end_date || '',
      attachment: null,
      employee_message: selectedTicket.employee_message || '',
    });
    setShowViewModal(false);
    setShowUpdateModal(true);
  };

  const openQueryAnswerModal = () => {
    setFormData({
      leave_type: leaveTypeToNumber(selectedTicket.leave_type),
      reason: selectedTicket.reason || '',
      start_date: selectedTicket.start_date || '',
      end_date: selectedTicket.end_date || '',
      attachment: null,
      employee_message: selectedTicket.employee_message || '',
    });
    setShowViewModal(false);
    setShowQueryAnswerModal(true);
  };

  const openRaiseModal = () => {
    setFormData({
      leave_type: '',
      reason: '',
      start_date: '',
      end_date: '',
      attachment: null,
      employee_message: '',
    });
    setShowRaiseModal(true);
  };

  const leaveTypeToNumber = (leaveType) => {
    const mapping = {
      PlannedLeave: 3,
      SickLeave: 2,
      EmergencyLeave: 1,
    };
    return mapping[leaveType] || '';
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      setFormData({ ...formData, attachment: files[0] || null });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRaiseTicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('leave_type', parseInt(formData.leave_type));
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('end_date', formData.end_date);
      if (formData.attachment) {
        formDataToSend.append('attachment', formData.attachment);
      }
      formDataToSend.append('employee_message', formData.employee_message);

      const response = await axios.post('http://127.0.0.1:8000/api/emp/reg', formDataToSend, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowRaiseModal(false);
      setSuccessMessage('Ticket raised successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to raise ticket';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('id', selectedTicket.ticket_id);
      formDataToSend.append('leave_type', parseInt(formData.leave_type));
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('end_date', formData.end_date);
      if (formData.attachment) {
        formDataToSend.append('attachment', formData.attachment);
      }
      formDataToSend.append('employee_message', formData.employee_message);

      const response = await axios.put('http://127.0.0.1:8000/api/emp/reg', formDataToSend, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowUpdateModal(false);
      setSuccessMessage('Ticket updated successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update ticket';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQueryAnswer = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('id', selectedTicket.ticket_id);
      formDataToSend.append('query_answer_payload', true);
      formDataToSend.append('leave_type', parseInt(formData.leave_type));
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('end_date', formData.end_date);
      if (formData.attachment) {
        formDataToSend.append('attachment', formData.attachment);
      }
      formDataToSend.append('employee_message', formData.employee_message);

      const response = await axios.put('http://127.0.0.1:8000/api/emp/reg', formDataToSend, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowQueryAnswerModal(false);
      setSuccessMessage('Query answered successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to answer query';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { id: selectedTicket.ticket_id };
      const response = await axios.delete('http://127.0.0.1:8000/api/emp/reg', {
        headers: { Authorization: token },
        data: payload,
      });
      setShowDeleteConfirmModal(false);
      setShowViewModal(false);
      setSuccessMessage('Ticket deleted successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete ticket';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReRaiseTicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { re_araise_payload: true, id: selectedTicket.ticket_id };
      const response = await axios.put('http://127.0.0.1:8000/api/emp/reg', payload, {
        headers: { Authorization: token },
      });
      setShowViewModal(false);
      setSuccessMessage('Ticket re-raised successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to re-raise ticket';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { accepting_status_payload: true, id: selectedTicket.ticket_id };
      const response = await axios.put('http://127.0.0.1:8000/api/emp/reg', payload, {
        headers: { Authorization: token },
      });
      setShowViewModal(false);
      setSuccessMessage('Ticket rejection accepted successfully');
      setShowSuccessModal(true);
      await fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to accept ticket';
      if (err.response?.status === 401) {
        setAuthError(`AuthenticationFailed: ${errorMsg}`);
        setShowAuthErrorModal(true);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitingForReRaiseApproval = () => {
    setIsWaitingForReRaiseApproval(true);
  };

  const filteredTickets = ticketsData.filter((ticket) => {
    const matchesLeaveType =
      leaveTypeFilter === 'All' || ticket.leave_type === leaveTypeFilter;
    const matchesStatus =
      statusFilter === 'All' || ticket.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesLeaveType && matchesStatus;
  });

  return (
    <div className="dashboard-container">
      <style>
        {`
          .dashboard-container {
            min-height: 100vh;
            background: #f0f7fa;
            padding: 2rem;
            position: relative;
            display: flex;
          }

          .dashboard-container .dashboard-card {
            background: #ffffff;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            max-width: 1200px;
            margin: 0 auto;
            animation: fadeIn 0.5s ease-in;
            transition: margin-left 0.3s ease;
            flex: 1;
          }

          .dashboard-container .dashboard-card.sidebar-open {
            margin-left: 250px;
          }

          @media (max-width: 768px) {
            .dashboard-container .dashboard-card.sidebar-open {
              margin-left: 150px;
            }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 250px;
            height: 100vh;
            background: #e0f4f8;
            color: #1a202c;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 15px rgba(0, 0, 0, 0.1);
            border-right: 2px solid #b3e5fc;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          @media (max-width: 768px) {
            .sidebar {
              width: 150px;
            }
          }

          .sidebar-toggle {
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 1200;
            background: linear-gradient(90deg, #06b6d4, #0891b2);
            border: none;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }

          .sidebar-toggle:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490);
            transform: scale(1.05);
          }

          .sidebar-toggle span {
            width: 25px;
            height: 3px;
            background: #ffffff;
            margin: 2px 0;
            transition: all 0.3s ease;
            border-radius: 2px;
          }

          .sidebar-toggle.open span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
          }

          .sidebar-toggle.open span:nth-child(2) {
            opacity: 0;
          }

          .sidebar-toggle.open span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -7px);
          }

          .sidebar-content {
            padding: 4rem 1rem 2rem 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
          }

          .sidebar-content label {
            font-size: 1rem;
            font-weight: 600;
            color: #1a202c;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.25rem;
            text-align: center;
          }

          .sidebar-content select {
            padding: 0.75rem;
            font-size: 0.95rem;
            border-radius: 10px;
            border: 1px solid #b3e5fc;
            background: #ffffff;
            color: #1a202c;
            width: 100%;
            max-width: 200px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a202c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
            background-size: 1rem;
          }

          .sidebar-content select:hover {
            background: #f0f7fa;
            border-color: #06b6d4;
          }

          .sidebar-content select:focus {
            outline: none;
            box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
            border-color: #06b6d4;
          }

          .sidebar-content .btn-raise,
          .sidebar-content .btn-logout {
            width: 100%;
            max-width: 200px;
            text-align: center;
            font-weight: 600;
            padding: 0.75rem;
            border-radius: 8px;
            transition: all 0.3s ease;
          }

          .sidebar-footer {
            padding: 1rem;
            border-top: 1px solid #b3e5fc;
            background: #e0f4f8;
          }

          .btn-logout {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            border-radius: 5px;
            transition: all 0.3s ease;
          }

          .btn-logout:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .header-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .employee-header {
            background: #e0f4f8;
            padding: 1rem;
            border-radius: 10px;
            max-width: 300px;
            color: #1a202c;
            border: 1px solid #b3e5fc;
          }

          .employee-header h3 {
            font-size: 1.8rem;
            margin: 0;
            color: #0891b2;
            border-bottom: 2px solid #0891b2;
            padding-bottom: 0.2rem;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            display: inline-block;
          }

          .employee-header p {
            font-size: 1rem;
            margin: 0.5rem 0 0 0;
          }

          .employee-header .email-highlight {
           
            padding-bottom: 0.2rem;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            display: inline-block;
          }

          .leave-remaining {
            background: #e0f4f8;
            padding: 1rem;
            border-radius: 10px;
            max-width: 300px;
            color: #1a202c;
            border: 1px solid #b3e5fc;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .leave-remaining:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          }

          .leave-remaining div {
            font-size: 1rem;
            margin: 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.3rem 0;
            transition: background 0.3s ease;
          }

          .leave-remaining div:hover {
            background: #d1e9f0;
            border-radius: 5px;
          }

          h2 {
            font-size: 2.2rem;
            font-weight: 700;
            color: #0891b2;
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .alert-danger {
            font-size: 0.9rem;
            padding: 0.75rem;
            border-radius: 8px;
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #dc2626;
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .scrollable-tickets {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #b3e5fc;
            border-radius: 8px;
            padding: 1rem;
            background: #f7fafc;
            margin-bottom: 1.5rem;
          }

          .ticket-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .ticket-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            transition: all 0.2s ease;
            min-width: 0;
            max-width: 100%;
          }

          .ticket-card:hover {
            filter: brightness(95%);
          }

          .ticket-card.pending {
            background: #fef9c3 !important;
          }

          .ticket-card.in-progress {
            background: #ffedd5 !important;
          }

          .ticket-card.in-progress-tl-level {
            background: #fef9c3 !important;
          }

          .ticket-card.in-progress-tl-level-re-raised {
            background: #fef3c7 !important;
          }

          .ticket-card.query-raised-by-hr {
            background: #e9d5ff !important;
          }

          .ticket-card.query-answered {
            background: #bfdbfe !important;
          }

          .ticket-card.hr-rejected,
          .ticket-card.tl-rejected {
            background: #fee2e2 !important;
          }

          .ticket-card.rejection-accepted {
            background: #fef3c7 !important;
          }

          .ticket-card.re-raise {
            background: #ddd6fe !important;
          }

          .ticket-card.re-raise-rejected {
            background: #fecaca !important;
          }

          .ticket-card.re-raise-approved {
            background: #c8e6c9 !important;
          }

          .ticket-card.approved {
            background: #c8e6c9 !important;
          }

          .ticket-info {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            flex: 1;
            min-width: 250px;
          }

          .ticket-info p {
            margin: 0;
            font-size: 0.9rem;
            color: #4a5568;
            flex: 1 0 150px;
          }

          .ticket-info p strong {
            color: #0891b2;
          }

          .actions-container {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            justify-content: flex-end;
            min-width: 100px;
          }

          .btn-primary,
          .btn-secondary,
          .btn-success,
          .btn-danger,
          .btn-info,
          .btn-raise,
          .btn-approved,
          .btn-hr-rejected,
          .btn-tl-rejected,
          .btn-query-raised,
          .btn-query-answered,
          .btn-on-process,
          .btn-re-raise,
          .btn-rejection-acknowledged,
          .btn-ticket-reraised,
          .btn-re-raise-rejected,
          .btn-re-raise-approved,
          .btn-static,
          .btn-waiting-for-approval,
          .btn-waiting-for-re-raise-approval {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
            border-radius: 5px;
            transition: all 0.3s ease;
          }

          .btn-primary {
            background: linear-gradient(90deg, #06b6d4, #0891b2) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-primary:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
          }

          .btn-secondary {
            background: linear-gradient(90deg, #6b7280, #4b5563) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-secondary:hover {
            background: linear-gradient(90deg, #4b5563, #374151) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(107, 114, 128, 0.3);
          }

          .btn-success {
            background: linear-gradient(90deg, #10b981, #047857) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-success:hover {
            background: linear-gradient(90deg, #047857, #065f46) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
          }

          .btn-danger {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-danger:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .btn-info {
            background: linear-gradient(90deg, #06b6d4, #0891b2) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-info:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
          }

          .btn-raise {
            background: linear-gradient(90deg, #06b6d4, #0891b2) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            font-weight: 600;
          }

          .btn-raise:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
          }

          .btn-approved {
            background: linear-gradient(90deg, #16a34a, #15803d) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
          }

          .btn-hr-rejected,
          .btn-tl-rejected {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-hr-rejected:hover,
          .btn-tl-rejected:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .btn-query-raised {
            background: linear-gradient(90deg, #c084fc, #9333ea) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-query-raised:hover {
            background: linear-gradient(90deg, #9333ea, #7e22ce) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(192, 132, 252, 0.3);
          }

          .btn-query-answered {
            background: linear-gradient(90deg, #60a5fa, #2563eb) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-query-answered:hover {
            background: linear-gradient(90deg, #2563eb, #1e40af) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(96, 165, 250, 0.3);
          }

          .btn-on-process {
            background: linear-gradient(90deg, #f97316, #c2410c) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-on-process:hover {
            background: linear-gradient(90deg, #c2410c, #9a3412) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(249, 115, 22, 0.3);
          }

          .btn-re-raise {
            background: linear-gradient(90deg, #a855f7, #7e22ce) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-re-raise:hover {
            background: linear-gradient(90deg, #7e22ce, #6b21a8) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3);
          }

          .btn-rejection-acknowledged {
            background: linear-gradient(90deg, #facc15, #d97706) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-rejection-acknowledged:hover {
            background: linear-gradient(90deg, #d97706, #b45309) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(250, 204, 21, 0.3);
          }

          .btn-ticket-reraised {
            background: linear-gradient(90deg, #d8b4fe, #a855f7) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-ticket-reraised:hover {
            background: linear-gradient(90deg, #a855f7, #9333ea) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(216, 180, 254, 0.3);
          }

          .btn-re-raise-rejected {
            background: linear-gradient(90deg, #dc2626, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-re-raise-rejected:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(220, 38, 38, 0.3);
          }

          .btn-re-raise-approved {
            background: linear-gradient(90deg, #16a34a, #15803d) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-re-raise-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
          }

          .btn-static {
            background: #edf2f7 !important;
            color: #4a5568 !important;
            border: 1px solid #e2e8f0;
            cursor: default;
          }

          .btn-waiting-for-approval {
            background: #fefcbf !important;
            color: #713f12 !important;
            border: 1px solid #e2e8f0;
            cursor: default;
          }

          .btn-waiting-for-re-raise-approval {
            background: linear-gradient(90deg, #facc15, #d97706) !important;
            color: #ffffff !important;
            border: none;
          }

          .btn-waiting-for-re-raise-approval:hover {
            background: linear-gradient(90deg, #d97706, #b45309) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(250, 204, 21, 0.3);
          }

          .btn-static-waiting-for-re-raise {
            background: #fefcbf !important;
            color: #713f12 !important;
            border: 1px solid #e2e8f0;
            cursor: default;
          }

          .attachment-link {
            color: #0891b2;
            text-decoration: underline;
            font-size: 0.9rem;
          }

          .attachment-link:hover {
            color: #06b6d4;
          }

          .no-attachment {
            font-size: 0.9rem;
            color: #4a5568;
          }

          .modal {
            z-index: 1050;
          }

          .modal-content {
            border-radius: 10px;
            background: #ffffff;
            border: 1px solid #b3e5fc;
          }

          .modal-header {
            background: #e0f4f8;
            border-bottom: none;
          }

          .modal-title {
            color: #0891b2;
            font-weight: 600;
          }

          .modal-body p {
            font-size: 1rem;
            color: #4a5568;
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            border-radius: 4px;
          }

          .modal-body .highlight-status {
            font-weight: bold;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            display: inline-block;
          }

          .modal-body .highlight-status.approved,
          .modal-body .highlight-status.re-raise-approved {
            background: #c8e6c9;
            color: #15803d;
          }

          .modal-body .highlight-status.pending,
          .modal-body .highlight-status.in-progress,
          .modal-body .highlight-status.in-progress-tl-level,
          .modal-body .highlight-status.in-progress-tl-level-re-raised {
            background: #fef9c3;
            color: #713f12;
          }

          .modal-body .highlight-status.hr-rejected,
          .modal-body .highlight-status.tl-rejected,
          .modal-body .highlight-status.re-raise-rejected {
            background: #fee2e2;
            color: #b91c1c;
          }

          .modal-body .highlight-status.query-raised-by-hr {
            background: #e9d5ff;
            color: #6b21a8;
          }

          .modal-body .highlight-status.query-answered {
            background: #bfdbfe;
            color: #0891b2;
          }

          .modal-body .highlight-status.rejection-accepted {
            background: #fef3c7;
            color: #b45309;
          }

          .modal-body .highlight-status.re-raise {
            background: #ddd6fe;
            color: #6b21a8;
          }

          .modal-body .highlight-leave-type {
            font-style: italic;
            border-bottom: 2px solid #b3e5fc;
            padding-bottom: 0.2rem;
            display: inline-block;
          }

          .modal-body .highlight-hr-message {
            background: #f0f7fa;
            border: 1px solid #b3e5fc;
            padding: 0.75rem;
            border-radius: 6px;
            margin: 0.5rem 0;
          }

          .modal-body .highlight-employee-message {
            background: #e0f4f8;
            border: 1px solid #b3e5fc;
            padding: 0.75rem;
            border-radius: 6px;
            margin: 0.5rem 0;
          }

          .modal-body .highlight-attachment a,
          .modal-body .highlight-attachment span {
            font-size: 1.1rem;
            transition: color 0.3s ease;
          }

          .modal-body .highlight-attachment a:hover {
            color: #06b6d4;
            text-decoration: none;
          }

          .modal-body input,
          .modal-body select,
          .modal-body textarea {
            width: 100%;
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #b3e5fc;
            margin-bottom: 1rem;
            background: #ffffff;
            color: #1a202c;
          }

          .modal-body select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a202c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
            background-size: 1rem;
          }

          .modal-body textarea {
            height: 100px;
            resize: vertical;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .auth-error-modal .modal-body {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #dc2626;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
          }

          @media (max-width: 768px) {
            .dashboard-card {
              padding: 1.5rem;
            }

            h2 {
              font-size: 1.8rem;
            }

            .employee-header h3 {
              font-size: 1.5rem;
            }

            .header-container {
              flex-direction: column;
              align-items: flex-start;
            }

            .employee-header,
            .leave-remaining {
              max-width: 100%;
              text-align: left;
            }

            .leave-remaining div {
              justify-content: flex-start;
            }

            .scrollable-tickets {
              max-height: 300px;
            }

            .ticket-card {
              flex-direction: column;
              align-items: flex-start;
            }

            .ticket-info {
              flex-direction: column;
              gap: 0.5rem;
            }

            .ticket-info p {
              flex: 1 0 auto;
            }

            .actions-container {
              width: 100%;
              justify-content: flex-start;
            }

            .btn-primary,
            .btn-success,
            .btn-danger,
            .btn-info,
            .btn-approved,
            .btn-hr-rejected,
            .btn-tl-rejected,
            .btn-query-raised,
            .btn-query-answered,
            .btn-on-process,
            .btn-re-raise,
            .btn-rejection-acknowledged,
            .btn-ticket-reraised,
            .btn-re-raise-rejected,
            .btn-re-raise-approved,
            .btn-static,
            .btn-waiting-for-approval,
            .btn-waiting-for-re-raise-approval {
              padding: 0.3rem 0.6rem;
              font-size: 0.8rem;
            }

            .modal-body .highlight-status,
            .modal-body .highlight-leave-type,
            .modal-body .highlight-hr-message,
            .modal-body .highlight-employee-message,
            .modal-body .highlight-attachment a,
            .modal-body .highlight-attachment span {
              font-size: 0.9rem;
            }

            .sidebar-content select,
            .sidebar-content .btn-raise,
            .sidebar-content .btn-logout {
              max-width: 120px;
            }
          }
        `}
      </style>
      <button
        className={`sidebar-toggle ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <button className="btn btn-raise" onClick={openRaiseModal}>
            Raise Ticket
          </button>
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
            <option value="in-progress">In Progress Tickets</option>
            <option value="in-progress-tl-level">In Progress TL Level</option>
            <option value="approved">Approved Tickets</option>
            <option value="in-progress-tl-level-re-raised">In Progress TL Level Re-raised</option>
            <option value="query-raised-by-hr">Query Raised</option>
            <option value="rejection-accepted">Rejection Acknowledged Tickets</option>
            <option value="re-raise">Re-Raised Tickets</option>
            <option value="re-raise-rejected">Re-Raise Rejected Tickets</option>
            <option value="re-raise-approved">Re-Raise Approved Tickets</option>
          </select>
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <div className={`dashboard-card ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <h2>Ticket Raising Dashboard</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="header-container">
          <div className="employee-header">
            <h3>Name : {employeeInfo.name}</h3>
            <br />
            <br />
            <div className="email-highlight"><h5>Email : {employeeInfo.email}</h5></div>
            <h5>Total Tickets : {employeeInfo.total}</h5>
          </div>
          <div className="leave-remaining">
            <div><strong>Planned Leave:</strong> {remainingLeave.Remaining_Planned_Leave || '-'}</div>
            <div><strong>Sick Leave:</strong> {remainingLeave.Remaining_Sick_Leave || '-'}</div>
            <div><strong>Emergency Leave:</strong> {remainingLeave.Remaining_Emergency_Leave || '-'}</div>
          </div>
        </div>
        <div className="dashboard-content">
          {filteredTickets.length > 0 ? (
            <div className="scrollable-tickets">
              <div className="ticket-container">
                {filteredTickets.map((ticket, index) => (
                  <div
                    key={ticket.ticket_id || index}
                    className={`ticket-card ${ticket.status.toLowerCase()}`}
                  >
                    <div className="ticket-info">
                      <p><strong>Ticket ID:</strong> {ticket.ticket_id || '-'}</p>
                      <p><strong>Leave Type:</strong> {ticket.leave_type || '-'}</p>
                      <p><strong>Start Date:</strong> {ticket.start_date || '-'}</p>
                      <p><strong>End Date:</strong> {ticket.end_date || '-'}</p>
                      <p><strong>Status:</strong> {ticket.status || '-'}</p>
                    </div>
                    <div className="actions-container">
                      {ticket.status.toLowerCase() === 'pending' ? (
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          View
                        </button>
                      ) : ticket.status.toLowerCase() === 'in-progress' ? (
                        <button
                          className="btn btn-on-process btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          On-Process
                        </button>
                      ) : ticket.status.toLowerCase() === 'in-progress-tl-level' ? (
                        <button
                          className="btn btn-on-process btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Waiting for Approval
                        </button>
                      ) : ticket.status.toLowerCase() === 'in-progress-tl-level-re-raised' ? (
                        <button
                          className="btn btn-waiting-for-re-raise-approval btn-sm"
                          onClick={() => {
                            openViewModal(ticket);
                            handleWaitingForReRaiseApproval();
                          }}
                        >
                          Waiting for Approval (Re-raise)
                        </button>
                      ) : ticket.status.toLowerCase() === 'query-raised-by-hr' ? (
                        <>
                          <button
                            className="btn btn-query-raised btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Query Raised
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => openQueryAnswerModal()}
                            disabled={isSubmitting}
                          >
                            Answer Query
                          </button>
                        </>
                      ) : ticket.status.toLowerCase() === 'query-answered' ? (
                        <button
                          className="btn btn-query-answered btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Query-answered
                        </button>
                      ) : ticket.status.toLowerCase() === 'hr-rejected' ? (
                        <button
                          className="btn btn-hr-rejected btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Ticket Rejected
                        </button>
                      ) : ticket.status.toLowerCase() === 'tl-rejected' ? (
                        <button
                          className="btn btn-tl-rejected btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Ticket Rejected
                        </button>
                      ) : ticket.status.toLowerCase() === 'rejection-accepted' ? (
                        <button
                          className="btn btn-rejection-acknowledged btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Rejection Acknowledged
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raise' ? (
                        <button
                          className="btn btn-ticket-reraised btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Ticket Reraised
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raise-rejected' ? (
                        <button
                          className="btn btn-re-raise-rejected btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Re-Raise Rejected
                        </button>
                      ) : ticket.status.toLowerCase() === 're-raise-approved' ? (
                        <button
                          className="btn btn-re-raise-approved btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Re-Raise Approved
                        </button>
                      ) : ticket.status.toLowerCase() === 'approved' ? (
                        <button
                          className="btn btn-approved btn-sm"
                          onClick={() => openViewModal(ticket)}
                        >
                          Approved
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openViewModal(ticket)}
                          disabled
                        >
                          No Action
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: '#4a5568', textAlign: 'center' }}>No leave requests found for the selected filters.</p>
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
                    <p><strong>Name:</strong> {employeeInfo.name}</p>
           
                    <p><strong>Email:</strong> {employeeInfo.email}</p>
                    <p><strong>Ticket ID:</strong> {selectedTicket.ticket_id || '-'}</p>
                    <p className="highlight-leave-type"><strong>Leave Type:</strong> {selectedTicket.leave_type || '-'}</p>
                    <p><strong>Reason:</strong> {selectedTicket.reason || '-'}</p>
                    <p><strong>Start Date:</strong> {selectedTicket.start_date || '-'}</p>
                    <p><strong>End Date:</strong> {selectedTicket.end_date || '-'}</p>
                    <p><strong>Applied At:</strong> {selectedTicket.applied_at || '-'}</p>
                    <p className={`highlight-status ${selectedTicket.status.toLowerCase()}`}><strong>Status:</strong> {selectedTicket.status || '-'}</p>
                    <p className="highlight-attachment">
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
                    {selectedTicket.employee_message && (
                      <p className="highlight-employee-message"><strong>Employee Message:</strong> {selectedTicket.employee_message || '-'}</p>
                    )}
                    {selectedTicket.hr_message && (
                      <p className="highlight-hr-message"><strong>HR Message:</strong> {selectedTicket.hr_message || '-'}</p>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                {selectedTicket && (
                  <>
                    {selectedTicket.status.toLowerCase() === 'pending' ? (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={openUpdateModal}
                          disabled={isSubmitting}
                        >
                          Update
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setShowDeleteConfirmModal(true)}
                          disabled={isSubmitting}
                        >
                          Delete
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Waiting for Approval
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Waiting for Approval
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level-re-raised' ? (
                      isWaitingForReRaiseApproval ? (
                        <button className="btn btn-static-waiting-for-re-raise btn-sm" disabled>
                          Waiting for Approval (Re-raised)
                        </button>
                      ) : (
                        <button
                          className="btn btn-waiting-for-re-raise-approval btn-sm"
                          onClick={handleWaitingForReRaiseApproval}
                        >
                          Waiting for Approval (Re-raise)
                        </button>
                      )
                    ) : selectedTicket.status.toLowerCase() === 'query-raised-by-hr' ? (
                      <button
                        className="btn btn-query-raised btn-sm"
                        onClick={openQueryAnswerModal}
                        disabled={isSubmitting}
                      >
                        Answer Query
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'query-answered' ? (
                      <>
                        <button className="btn btn-static btn-sm" disabled>
                          Query-answered
                        </button>
                        <button className="btn btn-waiting-for-approval btn-sm" disabled>
                          Waiting for Approval
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'hr-rejected' ? (
                      <>
                        <button className="btn btn-static btn-sm" disabled>
                          Ticket Rejected
                        </button>
                        <button
                          className="btn btn-re-raise btn-sm"
                          onClick={handleReRaiseTicket}
                          disabled={isSubmitting}
                        >
                          Re-raise
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={handleAcceptTicket}
                          disabled={isSubmitting}
                        >
                          Accept
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'tl-rejected' ? (
                      <>
                        <button className="btn btn-static btn-sm" disabled>
                          TL-Rejected Ticket
                        </button>
                        <button
                          className="btn btn-re-raise btn-sm"
                          onClick={handleReRaiseTicket}
                          disabled={isSubmitting}
                        >
                          Re-raise
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={handleAcceptTicket}
                          disabled={isSubmitting}
                        >
                          Accept
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'rejection-accepted' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Rejection Acknowledged
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raise' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Reraised Ticket
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raise-rejected' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raise Rejected
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raise-approved' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raise Accepted
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'approved' ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Ticket Approved
                      </button>
                    ) : (
                      <button className="btn btn-static btn-sm" disabled>
                        No Actions Available
                      </button>
                    )}
                    <button
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

        {/* Update Ticket Modal */}
        <div className={`modal ${showUpdateModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Ticket</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowUpdateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="leave_type">Leave Type:</label>
                <select
                  id="leave_type"
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="3">Planned Leave</option>
                  <option value="2">Sick Leave</option>
                  <option value="1">Emergency Leave</option>
                </select>
                <label htmlFor="reason">Reason:</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="attachment">Attachment:</label>
                <input
                  type="file"
                  id="attachment"
                  name="attachment"
                  onChange={handleInputChange}
                />
                <label htmlFor="employee_message">Employee Message:</label>
                <textarea
                  id="employee_message"
                  name="employee_message"
                  value={formData.employee_message}
                  onChange={handleInputChange}
                />
                <label htmlFor="start_date">Start Date:</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="end_date">End Date:</label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleUpdateTicket}
                  disabled={isSubmitting}
                >
                  Save Changes
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Query Answer Modal */}
        <div className={`modal ${showQueryAnswerModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Answer HR Query</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowQueryAnswerModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedTicket && (
                  <p className="highlight-hr-message"><strong>HR Message:</strong> {selectedTicket.hr_message || 'No message from HR'}</p>
                )}
                <label htmlFor="leave_type">Leave Type:</label>
                <select
                  id="leave_type"
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="3">Planned Leave</option>
                  <option value="2">Sick Leave</option>
                  <option value="1">Emergency Leave</option>
                </select>
                <label htmlFor="reason">Reason:</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="attachment">Attachment:</label>
                <input
                  type="file"
                  id="attachment"
                  name="attachment"
                  onChange={handleInputChange}
                />
                <label htmlFor="employee_message">Employee Message:</label>
                <textarea
                  id="employee_message"
                  name="employee_message"
                  value={formData.employee_message}
                  onChange={handleInputChange}
                />
                <label htmlFor="start_date">Start Date:</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="end_date">End Date:</label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleQueryAnswer}
                  disabled={isSubmitting}
                >
                  Submit Query Answer
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowQueryAnswerModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <div className={`modal ${showDeleteConfirmModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowDeleteConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this ticket?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteTicket}
                  disabled={isSubmitting}
                >
                  Confirm Delete
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeleteConfirmModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Raise Ticket Modal */}
        <div className={`modal ${showRaiseModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Raise New Ticket</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowRaiseModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="leave_type">Leave Type:</label>
                <select
                  id="leave_type"
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="3">Planned Leave</option>
                  <option value="2">Sick Leave</option>
                  <option value="1">Emergency Leave</option>
                </select>
                <label htmlFor="reason">Reason:</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="attachment">Attachment:</label>
                <input
                  type="file"
                  id="attachment"
                  name="attachment"
                  onChange={handleInputChange}
                />
                <label htmlFor="employee_message">Employee Message:</label>
                <textarea
                  id="employee_message"
                  name="employee_message"
                  value={formData.employee_message}
                  onChange={handleInputChange}
                />
                <label htmlFor="start_date">Start Date:</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="end_date">End Date:</label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleRaiseTicket}
                  disabled={isSubmitting}
                >
                  Submit Ticket
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRaiseModal(false)}
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

        {/* Authentication Error Modal */}
        <div className={`modal auth-error-modal ${showAuthErrorModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Authentication Error</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowAuthErrorModal(false);
                    setAuthError('');
                    navigate('/login');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p className="alert-danger">{authError}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    setShowAuthErrorModal(false);
                    setAuthError('');
                    navigate('/login');
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

export default EmployeeDashboard;