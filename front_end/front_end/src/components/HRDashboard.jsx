import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Chart from 'chart.js/auto'; // Import Chart.js

const HRDashboard = () => {
  const [hrDetails, setHrDetails] = useState([]);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showForwardTLModal, setShowForwardTLModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAskQueryModal, setShowAskQueryModal] = useState(false);
  const [showForwardEmpModal, setShowForwardEmpModal] = useState(false);
  const [showReRaiseModal, setShowReRaiseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAnalyseLeaveModal, setShowAnalyseLeaveModal] = useState(false); // New modal state
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [hrMessage, setHrMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [leaveCount, setLeaveCount] = useState(null); // State for leave count data
  const [selectedMonth, setSelectedMonth] = useState(''); // State for selected month
  const [monthlyLeaveData, setMonthlyLeaveData] = useState({ PlannedLeave: 0, SickLeave: 0, EmergencyLeave: 0 }); // State for monthly leave data
  const chartRef = useRef(null); // Ref for Chart.js instance
  const canvasRef = useRef(null); // Ref for canvas element
  const navigate = useNavigate();

  // Fetch HR tickets
  const fetchHrDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found.');
        navigate('/login');
        return;
      }
      const response = await axios.get('http://127.0.0.1:8000/api/hr/view', {
        headers: { Authorization: token },
      });
      console.log('Fetch HR Details Response:', response.data);
      setHrDetails(response.data.hr_details || []);
      setError('');
    } catch (err) {
      console.error('Fetch HR Details Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorMsg =
        err.response?.status === 404
          ? 'HR List endpoint not found. Please check backend URL configuration.'
          : err.response?.data?.detail || 'Failed to fetch HR details';
      setError(errorMsg);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  // Fetch leave count for a specific employee
  const fetchLeaveCount = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://127.0.0.1:8000/api/hr/status',
        { employee_id: employeeId },
        { headers: { Authorization: token } }
      );
      console.log('Fetch Leave Count Response:', response.data);
      setLeaveCount(response.data.employee_leave_count);
    } catch (err) {
      console.error('Fetch Leave Count Error:', err);
      setError(err.response?.data?.detail || 'Failed to fetch leave count');
      setShowAnalyseLeaveModal(false); // Close modal on error
    }
  };

  // Fetch monthly leave data for the bar graph
  const fetchMonthlyLeaveData = async (employeeId, month) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://127.0.0.1:8000/api/hr/status',
        { employee_id: employeeId, month },
        { headers: { Authorization: token } }
      );
      console.log('Fetch Monthly Leave Data Response:', response.data);
      setMonthlyLeaveData(response.data.monthly_leave_data);
    } catch (err) {
      console.error('Fetch Monthly Leave Data Error:', err);
      setError(err.response?.data?.error || 'Failed to fetch monthly leave data');
      setMonthlyLeaveData({ PlannedLeave: 0, SickLeave: 0, EmergencyLeave: 0 });
    }
  };

  // Create or update the bar graph
  const updateChart = () => {
    if (chartRef.current) {
      chartRef.current.destroy(); // Destroy existing chart instance
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Planned Leave', 'Sick Leave', 'Emergency Leave'],
        datasets: [
          {
            label: `${selectedMonth} Leave Report`,
            data: [
              monthlyLeaveData.PlannedLeave,
              monthlyLeaveData.SickLeave,
              monthlyLeaveData.EmergencyLeave,
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',  // Blue for Planned Leave
              'rgba(255, 99, 132, 0.6)',  // Red for Sick Leave
              'rgba(255, 206, 86, 0.6)',  // Yellow for Emergency Leave
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Leaves',
              color: '#1e3a8a',
              font: { size: 14 },
            },
            ticks: { stepSize: 1, color: '#374151' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
          },
          x: {
            title: {
              display: true,
              text: 'Leave Type',
              color: '#1e3a8a',
              font: { size: 14 },
            },
            ticks: { color: '#374151' },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { labels: { color: '#1e3a8a', font: { size: 12 } } },
          title: {
            display: true,
            text: `Leave Report for ${selectedMonth}`,
            color: '#1e3a8a',
            font: { size: 16 },
          },
          // Add a background gradient to the chart
          beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(200, 220, 255, 0.8)');
            ctx.save();
            ctx.fillStyle = gradient;
            ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
            ctx.restore();
          },
        },
      },
    });
  };

  // Update chart whenever monthly leave data or selected month changes
  useEffect(() => {
    if (selectedMonth && monthlyLeaveData && canvasRef.current) {
      updateChart();
    }
  }, [monthlyLeaveData, selectedMonth]);

  // Fetch tickets on mount
  useEffect(() => {
    fetchHrDetails();
  }, []);

  // Debug state
  useEffect(() => {
    console.log('hrDetails:', hrDetails);
    console.log('showSuccessModal:', showSuccessModal, 'successMessage:', successMessage);
    console.log('leaveTypeFilter:', leaveTypeFilter);
    console.log('statusFilter:', statusFilter);
    console.log('leaveCount:', leaveCount);
    console.log('selectedMonth:', selectedMonth);
    console.log('monthlyLeaveData:', monthlyLeaveData);
  }, [hrDetails, showSuccessModal, successMessage, leaveTypeFilter, statusFilter, leaveCount, selectedMonth, monthlyLeaveData]);

  // Open view ticket modal
  const openViewModal = (ticket) => {
    console.log('Selected Ticket:', ticket);
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  // Open modal for Forward to TL
  const openForwardTLModal = () => {
    setHrMessage('');
    setShowViewModal(false);
    setShowForwardTLModal(true);
  };

  // Open modal for Reject
  const openRejectModal = () => {
    setHrMessage('');
    setShowViewModal(false);
    setShowRejectModal(true);
  };

  // Open modal for Ask Query
  const openAskQueryModal = () => {
    setHrMessage('');
    setShowViewModal(false);
    setShowAskQueryModal(true);
  };

  // Open modal for Forward to Employee
  const openForwardEmpModal = () => {
    setHrMessage('');
    setShowViewModal(false);
    setShowForwardEmpModal(true);
  };

  // Open modal for Re-Raise Ticket
  const openReRaiseModal = () => {
    setHrMessage('');
    setShowViewModal(false);
    setShowReRaiseModal(true);
  };

  // Open modal for Analyse Leave
  const openAnalyseLeaveModal = (ticket) => {
    setSelectedTicket(ticket);
    fetchLeaveCount(ticket.employee_id); // Fetch leave count data
    setShowAnalyseLeaveModal(true);
    setSelectedMonth(''); // Reset month selection
    setMonthlyLeaveData({ PlannedLeave: 0, SickLeave: 0, EmergencyLeave: 0 }); // Reset graph data
  };

  // Handle month selection and fetch monthly leave data
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    fetchMonthlyLeaveData(selectedTicket.employee_id, month);
  };

  // Handle status change
  const handleStatusChange = async (payload, successMsg) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const fullPayload = {
        id: selectedTicket.ticket_id,
        ...payload,
      };
      console.log('Status Change Payload:', fullPayload);
      const response = await axios.post('http://127.0.0.1:8000/api/hr/status', fullPayload, {
        headers: { Authorization: token },
      });
      console.log('Status Change Response:', response.data);
      setShowForwardTLModal(false);
      setShowRejectModal(false);
      setShowAskQueryModal(false);
      setShowForwardEmpModal(false);
      setShowReRaiseModal(false);
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setHrMessage('');
      await fetchHrDetails();
    } catch (err) {
      console.error('Status Change Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      setError(err.response?.data?.detail || 'Failed to update ticket status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tickets
  const filteredTickets = hrDetails.filter((ticket) => {
    const matchesLeaveType =
      leaveTypeFilter === 'All' ||
      ticket.Leave_type.toLowerCase() === leaveTypeFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'All' || ticket.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesLeaveType && matchesStatus;
  });

  // Add employee_id to each ticket by fetching it from the backend
  useEffect(() => {
    const addEmployeeIdToTickets = async () => {
      const updatedTickets = await Promise.all(
        hrDetails.map(async (ticket) => {
          try {
            const response = await axios.get(`http://127.0.0.1:8000/api/employee/${ticket.Requester_email}`, {
              headers: { Authorization: localStorage.getItem('token') },
            });
            return { ...ticket, employee_id: response.data.employee_id };
          } catch (err) {
            console.error(`Failed to fetch employee_id for ${ticket.Requester_email}:`, err);
            return ticket;
          }
        })
      );
      setHrDetails(updatedTickets);
    };

    if (hrDetails.length > 0) {
      addEmployeeIdToTickets();
    }
  }, [hrDetails.length]);

  // Get HR info
  const hrInfo = hrDetails.length > 0
    ? {
        name: hrDetails[0].Hr_name || 'Unknown',
        role: hrDetails[0].Hr_role || 'HR',
      }
    : { name: 'Unknown', role: 'HR' };

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

          .dashboard-container .hr-header {
            background: #f1f5f9;
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 2rem;
          }

          .dashboard-container .hr-header h3 {
            font-size: 1.8rem;
            color: #1e3a8a;
            margin: 0;
          }

          .dashboard-container .hr-header p {
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

          .dashboard-container .table tbody tr.in-progress {
            background: #ffcc80;
          }

          .dashboard-container .table tbody tr.in-progress-tl-level {
            background: #fef9c3;
          }

          .dashboard-container .table tbody tr.query-raised-by-hr {
            background: #e9d5ff;
          }

          .dashboard-container .table tbody tr.query-answered {
            background: #bfdbfe;
          }

          .dashboard-container .table tbody tr.rejection-accepted {
            background: #fef3c7;
          }

          .dashboard-container .table tbody tr.tl-rejected {
            background: #f9a8d4;
          }

          .dashboard-container .table tbody tr.approved {
            background: #86efac;
          }

          .dashboard-container .table tbody tr.re-raised {
            background: #ddd6fe;
          }

          .dashboard-container .table tbody tr.in-progress-tl-level-re-raised {
            background: #c4b5fd;
          }

          .dashboard-container .table tbody tr.re-raised-approved {
            background: #86efac;
          }

          .dashboard-container .table tbody tr.re-raised-rejected {
            background: #f9a8d4;
          }

          .dashboard-container .table tbody tr.hr-rejected {
            background: #fecaca;
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
          .dashboard-container .btn-query,
          .dashboard-container .btn-query-raised,
          .dashboard-container .btn-query-answered,
          .dashboard-container .btn-waiting-tl,
          .dashboard-container .btn-tl-approved,
          .dashboard-container .btn-tl-rejected,
          .dashboard-container .btn-ticket-rejected,
          .dashboard-container .btn-ticket-approved,
          .dashboard-container .btn-re-raised,
          .dashboard-container .btn-re-raised-approved,
          .dashboard-container .btn-re-raised-rejected,
          .dashboard-container .btn-rejection-acknowledged,
          .dashboard-container .btn-ticket-reraised,
          .dashboard-container .btn-waiting-tl-re-raised,
          .dashboard-container .btn-you-rejected,
          .dashboard-container .btn-analyse-leave {
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

          .dashboard-container .btn-query {
            background: linear-gradient(90deg, #8b5cf6, #6d28d9) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-query:hover {
            background: linear-gradient(90deg, #6d28d9, #5b21b6) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
          }

          .dashboard-container .btn-query-raised {
            background: linear-gradient(90deg, #c084fc, #9333ea) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-query-raised:hover {
            background: linear-gradient(90deg, #9333ea, #7e22ce) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(192, 132, 252, 0.3);
          }

          .dashboard-container .btn-query-answered {
            background: linear-gradient(90deg, #3b82f6, #1e40af) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-query-answered:hover {
            background: linear-gradient(90deg, #1e40af, #1e3a8a) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .btn-waiting-tl {
            background: linear-gradient(90deg, #f97316, #c2410c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-waiting-tl:hover {
            background: linear-gradient(90deg, #c2410c, #9a3412) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(249, 115, 22, 0.3);
          }

          .dashboard-container .btn-tl-approved {
            background: linear-gradient(90deg, #16a34a, #15803d) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-tl-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
          }

          .dashboard-container .btn-tl-rejected {
            background: linear-gradient(90deg, #f43f5e, #be123c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-tl-rejected:hover {
            background: linear-gradient(90deg, #be123c, #9f1239) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(244, 63, 94, 0.3);
          }

          .dashboard-container .btn-ticket-rejected {
            background: linear-gradient(90deg, #dc2626, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-ticket-rejected:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(220, 38, 38, 0.3);
          }

          .dashboard-container .btn-ticket-approved {
            background: linear-gradient(90deg, #22c55e, #15803d) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-ticket-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
          }

          .dashboard-container .btn-re-raised {
            background: linear-gradient(90deg, #a855f7, #7e22ce) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-re-raised:hover {
            background: linear-gradient(90deg, #7e22ce, #6b21a8) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3);
          }

          .dashboard-container .btn-re-raised-approved {
            background: linear-gradient(90deg, #22c55e, #15803d) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-re-raised-approved:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
          }

          .dashboard-container .btn-re-raised-rejected {
            background: linear-gradient(90deg, #ef4444, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-re-raised-rejected:hover {
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

          .dashboard-container .btn-ticket-reraised {
            background: linear-gradient(90deg, #d8b4fe, #a855f7) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-ticket-reraised:hover {
            background: linear-gradient(90deg, #a855f7, #9333ea) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(216, 180, 254, 0.3);
          }

          .dashboard-container .btn-waiting-tl-re-raised {
            background: linear-gradient(90deg, #fb923c, #ea580c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-waiting-tl-re-raised:hover {
            background: linear-gradient(90deg, #ea580c, #c2410c) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(251, 146, 60, 0.3);
          }

          .dashboard-container .btn-you-rejected {
            background: linear-gradient(90deg, #dc2626, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-you-rejected:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(220, 38, 38, 0.3);
          }

          .dashboard-container .btn-analyse-leave {
            background: linear-gradient(90deg, #8b5cf6, #6d28d9) !important;
            color: #ffffff !important;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .dashboard-container .btn-analyse-leave:hover {
            background: linear-gradient(90deg, #6d28d9, #5b21b6) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
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

          .dashboard-container .filter-container select {
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            background: #f1f5f9;
            color: #374151;
            width: 200px;
          }

          .dashboard-container .filter-container select:focus {
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

          .dashboard-container .modal-body textarea {
            width: 100%;
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            background: #f1f5f9;
            color: #374151;
            resize: vertical;
          }

          .dashboard-container .modal-body textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
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

          .dashboard-container .static-text {
            font-size: 0.9rem;
            color: #374151;
            padding: 0.5rem 1rem;
            background: #f1f5f9;
            border-radius: 5px;
            margin: 0 0.25rem;
          }

          .dashboard-container .leave-count-container {
            background: #f1f5f9;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }

          .dashboard-container .leave-count-container p {
            font-size: 1rem;
            color: #374151;
            margin: 0.5rem 0;
          }

          .dashboard-container .month-selector {
            margin-bottom: 1rem;
          }

          .dashboard-container .month-selector select {
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            background: #f1f5f9;
            color: #374151;
            width: 200px;
          }

          .dashboard-container .month-selector select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .chart-container {
            background: #ffffff;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            margin: 0 auto;
          }

          @media (max-width: 768px) {
            .dashboard-container .dashboard-card {
              padding: 1.5rem;
            }

            .dashboard-container h2 {
              font-size: 1.8rem;
            }

            .dashboard-container .hr-header h3 {
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
            .dashboard-container .btn-query,
            .dashboard-container .btn-query-raised,
            .dashboard-container .btn-query-answered,
            .dashboard-container .btn-waiting-tl,
            .dashboard-container .btn-tl-approved,
            .dashboard-container .btn-tl-rejected,
            .dashboard-container .btn-ticket-rejected,
            .dashboard-container .btn-ticket-approved,
            .dashboard-container .btn-re-raised,
            .dashboard-container .btn-re-raised-approved,
            .dashboard-container .btn-re-raised-rejected,
            .dashboard-container .btn-rejection-acknowledged,
            .dashboard-container .btn-ticket-reraised,
            .dashboard-container .btn-waiting-tl-re-raised,
            .dashboard-container .btn-you-rejected,
            .dashboard-container .btn-analyse-leave {
              padding: 0.3rem 0.6rem;
              font-size: 0.8rem;
            }

            .dashboard-container .filter-container {
              flex-direction: column;
              align-items: flex-start;
            }

            .dashboard-container .filter-container select {
              width: 100%;
            }

            .dashboard-container .month-selector select {
              width: 100%;
            }

            .dashboard-container .modal-body textarea {
              width: 100%;
            }

            .dashboard-container .chart-container {
              max-width: 100%;
            }
          }
        `}
      </style>
      <div className="dashboard-card">
        <h2>HR Dashboard - Assigned Leave Requests</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="hr-header">
          <h3>{hrInfo.name}</h3>
          <p>Role: {hrInfo.role}</p>
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
              <option value="in-progress">In Progress</option>
              <option value="in-progress-tl-level">In Progress TL Level</option>
              <option value="query-raised-by-hr">Query Raised</option>
              <option value="query-answered">Query Answered</option>
              <option value="rejection-accepted">Rejection Acknowledged</option>
              <option value="tl-rejected">TL Rejected</option>
              <option value="approved">Approved</option>
              <option value="re-raised">Re-Raised</option>
              <option value="in-progress-tl-level-re-raised">In Progress TL Level Re-Raised</option>
              <option value="re-raised-approved">Re-Raised Approved</option>
              <option value="re-raised-rejected">Re-Raised Rejected</option>
              <option value="hr-rejected">HR Rejected</option>
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
                {filteredTickets.map((ticket, index) => (
                  <tr
                    key={ticket.ticket_id || index}
                    className={(ticket.status || 'unknown').toLowerCase().replace(' ', '-')}
                  >
                    <td>{ticket.Requester_name || '-'}</td>
                    <td>{ticket.Leave_type || '-'}</td>
                    <td>{ticket.Applied_at || '-'}</td>
                    <td className="actions-column">
                      <div className="actions-container">
                        {ticket.status.toLowerCase() === 'in-progress-tl-level' &&
                        ticket.tl_status.toLowerCase() === 'approved' ? (
                          <button
                            className="btn btn-tl-approved btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            TL-Approved
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level' &&
                          ticket.tl_status.toLowerCase() === 'tl-rejected' ? (
                          <button
                            className="btn btn-tl-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            TL-Rejected
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level' &&
                          ticket.tl_status.toLowerCase() === 'pending' ? (
                          <button
                            className="btn btn-waiting-tl btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Waiting for TL-Approval
                          </button>
                        ) : ticket.status.toLowerCase() === 'tl-rejected' &&
                          ticket.tl_status.toLowerCase() === 'tl-rejected' ? (
                          <button
                            className="btn btn-ticket-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Ticket Rejected
                          </button>
                        ) : ticket.status.toLowerCase() === 'approved' &&
                          ticket.tl_status.toLowerCase() === 'approved' ? (
                          <button
                            className="btn btn-ticket-approved btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Ticket Approved
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress' ? (
                          <button
                            className="btn btn-info btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            View
                          </button>
                        ) : ticket.status.toLowerCase() === 'query-raised-by-hr' ? (
                          <button
                            className="btn btn-query-raised btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Query Raised
                          </button>
                        ) : ticket.status.toLowerCase() === 'query-answered' ? (
                          <button
                            className="btn btn-query-answered btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Query Answered
                          </button>
                        ) : ticket.status.toLowerCase() === 'rejection-accepted' ? (
                          <button
                            className="btn btn-rejection-acknowledged btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Rejection Acknowledged
                          </button>
                        ) : ticket.status.toLowerCase() === 're-raised' ? (
                          <button
                            className="btn btn-ticket-reraised btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Ticket ReRaised
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                          ticket.tl_status.toLowerCase() === 'pending' ? (
                          <button
                            className="btn btn-waiting-tl-re-raised btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Waiting for Approval (Re-Raised)
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                          ticket.tl_status.toLowerCase() === 'tl-rejected' ? (
                          <button
                            className="btn btn-waiting-tl-re-raised btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Waiting for TL Approval (Re-Raised)
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                          ticket.tl_status.toLowerCase() === 're-raised-approved' ? (
                          <button
                            className="btn btn-re-raised-approved btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raise Approved
                          </button>
                        ) : ticket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                          ticket.tl_status.toLowerCase() === 're-raised-rejected' ? (
                          <button
                            className="btn btn-re-raised-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raise Rejected
                          </button>
                        ) : ticket.status.toLowerCase() === 're-raised-approved' ? (
                          <button
                            className="btn btn-re-raised-approved btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raise Approved
                          </button>
                        ) : ticket.status.toLowerCase() === 're-raised-rejected' ? (
                          <button
                            className="btn btn-re-raised-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raise Rejected
                          </button>
                        ) : ticket.status.toLowerCase() === 'hr-rejected' ? (
                          <button
                            className="btn btn-you-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            You-Rejected
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No assigned leave requests found for the selected filters.</p>
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
                    <p><strong>Ticket ID:</strong> {selectedTicket.ticket_id || '-'}</p>
                    <p><strong>Requester Name:</strong> {selectedTicket.Requester_name || '-'}</p>
                    <p><strong>Requester Email:</strong> {selectedTicket.Requester_email || '-'}</p>
                    <p><strong>Leave Type:</strong> {selectedTicket.Leave_type || '-'}</p>
                    <p><strong>Reason:</strong> {selectedTicket.Leave_reason || '-'}</p>
                    <p><strong>Start Date:</strong> {selectedTicket.Start_date || '-'}</p>
                    <p><strong>End Date:</strong> {selectedTicket.End_date || '-'}</p>
                    <p><strong>Status:</strong> {selectedTicket.status || '-'}</p>
                    <p><strong>TL Status:</strong> {selectedTicket.tl_status || '-'}</p>
                    <p><strong>Applied At:</strong> {selectedTicket.Applied_at || '-'}</p>
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
                    <p>
                      <strong>Employee Message:</strong>{' '}
                      {selectedTicket.employee_message || 'No message'}
                    </p>
                    <p><strong>HR Message:</strong> {selectedTicket.hr_message || 'No message'}</p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {selectedTicket && (
                  <>
                    <button
                      className="btn btn-analyse-leave btn-sm"
                      onClick={() => openAnalyseLeaveModal(selectedTicket)}
                    >
                      Analyse Leave
                    </button>
                    {selectedTicket.status.toLowerCase() === 'in-progress-tl-level' &&
                    selectedTicket.tl_status.toLowerCase() === 'approved' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={openForwardEmpModal}
                        disabled={isSubmitting}
                      >
                        Forward to Employee
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level' &&
                      selectedTicket.tl_status.toLowerCase() === 'tl-rejected' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={openForwardEmpModal}
                        disabled={isSubmitting}
                      >
                        Forward to Employee
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level' &&
                      selectedTicket.tl_status.toLowerCase() === 'pending' ? (
                      <span className="static-text">Waiting for TL-Approval</span>
                    ) : selectedTicket.status.toLowerCase() === 'tl-rejected' &&
                      selectedTicket.tl_status.toLowerCase() === 'tl-rejected' ? (
                      <>
                        <span className="static-text">Ticket Rejected</span>
                        <span className="static-text">Waiting for Acknowledgement</span>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'approved' &&
                      selectedTicket.tl_status.toLowerCase() === 'approved' ? (
                      <>
                        <span className="static-text">Ticket Approved</span>
                        <span className="static-text">Ticket Got Closed</span>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress' ? (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={openForwardTLModal}
                          disabled={isSubmitting}
                        >
                          Forward to TL
                        </button>
                        <button
                          className="btn btn-query btn-sm"
                          onClick={openAskQueryModal}
                          disabled={isSubmitting}
                        >
                          Ask Query
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={openRejectModal}
                          disabled={isSubmitting}
                        >
                          Reject
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'query-raised-by-hr' ? (
                      <span className="static-text">Waiting for Query</span>
                    ) : selectedTicket.status.toLowerCase() === 'query-answered' ? (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={openForwardTLModal}
                          disabled={isSubmitting}
                        >
                          Forward to TL
                        </button>
                        <button
                          className="btn btn-query btn-sm"
                          onClick={openAskQueryModal}
                          disabled={isSubmitting}
                        >
                          Ask Query
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={openRejectModal}
                          disabled={isSubmitting}
                        >
                          Reject
                        </button>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'rejection-accepted' ? (
                      <span className="static-text">Rejection Acknowledged</span>
                    ) : selectedTicket.status.toLowerCase() === 're-raised' ? (
                      <button
                        className="btn btn-re-raised btn-sm"
                        onClick={openReRaiseModal}
                        disabled={isSubmitting}
                      >
                        Forward to TL (Re-Raised)
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                      selectedTicket.tl_status.toLowerCase() === 'pending' ? (
                      <>
                        <span className="static-text">Waiting for TL Approval</span>
                        <span className="static-text">Re-Raised Ticket</span>
                      </>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                      selectedTicket.tl_status.toLowerCase() === 'rejected' ? (
                      <span className="static-text">Waiting for TL Approval (Re-Raised)</span>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                      selectedTicket.tl_status.toLowerCase() === 're-raised-approved' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={openForwardEmpModal}
                        disabled={isSubmitting}
                      >
                        Forward to Employee
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 'in-progress-tl-level-re-raised' &&
                      selectedTicket.tl_status.toLowerCase() === 're-raised-rejected' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={openForwardEmpModal}
                        disabled={isSubmitting}
                      >
                        Forward to Employee
                      </button>
                    ) : selectedTicket.status.toLowerCase() === 're-raised-approved' ? (
                      <span className="static-text">Re-Raise Ticket Approved</span>
                    ) : selectedTicket.status.toLowerCase() === 're-raised-rejected' ? (
                      <span className="static-text">Re-Raise Ticket Rejected</span>
                    ) : selectedTicket.status.toLowerCase() === 'hr-rejected' ? (
                      <span className="static-text">Ticket Rejected By You</span>
                    ) : (
                      <span className="static-text">No actions available</span>
                    )}
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
                <h5 className="modal-title">Analyse Leave - {selectedTicket?.Requester_name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAnalyseLeaveModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {leaveCount ? (
                  <>
                    <div className="leave-count-container">
                      <h6>Remaining Leave Counts</h6>
                      <p><strong>Planned Leave:</strong> {leaveCount.Remaining_Planned_Leave}</p>
                      <p><strong>Sick Leave:</strong> {leaveCount.Remaining_Sick_Leave}</p>
                      <p><strong>Emergency Leave:</strong> {leaveCount.Remaining_Emergency_Leave}</p>
                    </div>
                    <div className="month-selector">
                      <label htmlFor="monthSelect">Select Month:</label>
                      <select
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                      >
                        <option value="">-- Select Month --</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>
                    {selectedMonth && (
                      <div className="chart-container">
                        <canvas ref={canvasRef}></canvas>
                      </div>
                    )}
                  </>
                ) : (
                  <p>Loading leave data...</p>
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

        {/* Forward to TL Modal */}
        <div className={`modal ${showForwardTLModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Forward to TL</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowForwardTLModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="forwardTLMessage">Issue Overview:</label>
                <textarea
                  id="forwardTLMessage"
                  value={hrMessage}
                  onChange={(e) => setHrMessage(e.target.value)}
                  rows="4"
                  placeholder="Enter issue overview..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() =>
                    handleStatusChange(
                      { forward_ticket_tl: true, hr_message_payload: hrMessage },
                      'Ticket forwarded to TL'
                    )
                  }
                  disabled={isSubmitting || !hrMessage.trim()}
                >
                  Confirm Forward
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowForwardTLModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        <div className={`modal ${showRejectModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Ticket</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="rejectMessage">Reason for Rejection:</label>
                <textarea
                  id="rejectMessage"
                  value={hrMessage}
                  onChange={(e) => setHrMessage(e.target.value)}
                  rows="4"
                  placeholder="Enter reason for rejection..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() =>
                    handleStatusChange(
                      { hr_reject_payload: true, hr_message_payload: hrMessage },
                      'Ticket rejected'
                    )
                  }
                  disabled={isSubmitting || !hrMessage.trim()}
                >
                  Confirm Reject
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ask Query Modal */}
        <div className={`modal ${showAskQueryModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ask Query</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAskQueryModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="queryMessage">Query:</label>
                <textarea
                  id="queryMessage"
                  value={hrMessage}
                  onChange={(e) => setHrMessage(e.target.value)}
                  rows="4"
                  placeholder="Enter your query..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-query btn-sm"
                  onClick={() =>
                    handleStatusChange(
                      { ask_query_payload: true, hr_message_payload: hrMessage },
                      'Query raised'
                    )
                  }
                  disabled={isSubmitting || !hrMessage.trim()}
                >
                  Confirm Query
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAskQueryModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Forward to Employee Modal */}
        <div className={`modal ${showForwardEmpModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Forward to Employee</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowForwardEmpModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="forwardEmpMessage">Message:</label>
                <textarea
                  id="forwardEmpMessage"
                  value={hrMessage}
                  onChange={(e) => setHrMessage(e.target.value)}
                  rows="4"
                  placeholder="Enter message to employee..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    handleStatusChange(
                      { forward_ticket_emp: true, hr_message_payload: hrMessage },
                      'Ticket forwarded to employee'
                    )
                  }
                  disabled={isSubmitting || !hrMessage.trim()}
                >
                  Confirm Forward
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowForwardEmpModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Re-Raise Ticket Modal */}
        <div className={`modal ${showReRaiseModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Forward to TL (Re-Raised)</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReRaiseModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="reRaiseMessage">Re-Raise Details:</label>
                <textarea
                  id="reRaiseMessage"
                  value={hrMessage}
                  onChange={(e) => setHrMessage(e.target.value)}
                  rows="4"
                  placeholder="Enter re-raise details..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-re-raised btn-sm"
                  onClick={() =>
                    handleStatusChange(
                      { forward_ticket_tl_raised: true, hr_message_payload: hrMessage },
                      'Ticket re-raised to TL'
                    )
                  }
                  disabled={isSubmitting || !hrMessage.trim()}
                >
                  Confirm Re-Raise
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowReRaiseModal(false)}
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

export default HRDashboard;