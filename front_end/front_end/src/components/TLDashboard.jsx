import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const TLDashboard = () => {
  const [tlTickets, setTlTickets] = useState([]);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messagePayload, setMessagePayload] = useState('');
  const [actionType, setActionType] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const navigate = useNavigate();

  // Fetch TL tickets
  const fetchTlTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await axios.post('http://127.0.0.1:8000/api/TL/view', {}, {
        headers: { Authorization: token },
      });
      console.log('Fetch TL Tickets Response:', response.data);
      setTlTickets(response.data.processing_ticket || []);
      setError('');
    } catch (err) {
      console.error('Fetch TL Tickets Error:', err.response);
      const errorMsg = err.response?.status === 403
        ? 'Credentials do not match TL role'
        : err.response?.data?.detail || 'Failed to fetch TL tickets';
      setError(errorMsg);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  // Fetch TL tickets on mount
  useEffect(() => {
    fetchTlTickets();
  }, []);

  // Debug tickets and modal states
  useEffect(() => {
    console.log('Current tlTickets:', tlTickets);
    console.log('showSuccessModal:', showSuccessModal, 'successMessage:', successMessage);
    console.log('Filters:', { approvalFilter, leaveTypeFilter });
    console.log('selectedTicket:', selectedTicket);
  }, [tlTickets, showSuccessModal, successMessage, approvalFilter, leaveTypeFilter, selectedTicket]);

  // Filter tickets based on tl_status and leave type
  const filteredTickets = tlTickets.filter((ticket) => {
    const matchesApproval = approvalFilter === 'All' || ticket.tl_status === approvalFilter;
    const matchesLeaveType = leaveTypeFilter === 'All' || ticket.leave_type === leaveTypeFilter;
    return matchesApproval && matchesLeaveType;
  });

  // Open view ticket modal
  const openViewModal = (ticket) => {
    console.log('Selected Ticket tl_status:', ticket.tl_status);
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  // Open message modal for Approve/Reject
  const openMessageModal = (type) => {
    setActionType(type);
    setMessagePayload('');
    setShowMessageModal(true);
  };

  // Handle status change (Approve, Reject, Approve-reraise, Reject-reraise)
  const handleStatusChange = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ticketid_payload: selectedTicket.Ticked_id,
        [actionType === 'approve' ? 'ticket_approval_payload' : 
         actionType === 'reject' ? 'ticket_reject_payload' :
         actionType === 'approve-reraise' ? 'reraise_approve_payload' :
         'reraise_reject_payload']: true,
        message_payload: messagePayload,
      };
      console.log('Status Change Payload:', payload);
      const response = await axios.post('http://127.0.0.1:8000/api/TL/status', payload, {
        headers: { Authorization: token },
      });
      console.log('Status Change Response:', response.data);
      setShowMessageModal(false);
      setShowViewModal(false);
      setSuccessMessage(
        actionType === 'approve' ? 'Ticket approved successfully' :
        actionType === 'reject' ? 'Ticket rejected successfully' :
        actionType === 'approve-reraise' ? 'Re-raised ticket approved successfully' :
        'Re-raised ticket rejected successfully'
      );
      setShowSuccessModal(true);
      await fetchTlTickets();
    } catch (err) {
      console.error('Status Change Error:', err.response);
      setError(err.response?.data?.detail || 'Failed to update ticket status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique TL info
  const tlInfo = tlTickets.length > 0 ? {
    name: tlTickets[0].TL_Name || 'Unknown',
    email: tlTickets[0].TL_mail || 'Unknown',
  } : { name: 'Unknown', email: 'Unknown' };

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

          .dashboard-container .tl-header {
            background: #f1f5f9;
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            max-width: 300px;
          }

          .dashboard-container .tl-header h3 {
            font-size: 1.8rem;
            color: #1e3a8a;
            margin: 0;
          }

          .dashboard-container .tl-header p {
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

          .dashboard-container .filter-container {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
          }

          .dashboard-container .filter-container label {
            font-size: 1rem;
            color: #1e3a8a;
            font-weight: 600;
            margin-right: 0.5rem;
          }

          .dashboard-container .filter-container select {
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #374151;
            min-width: 150px;
          }

          .dashboard-container .filter-container select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }

          .dashboard-container .table {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
          }

          .dashboard-container .table th, .dashboard-container .table td {
            padding: 1rem;
            vertical-align: middle;
          }

          .dashboard-container .table th {
            background: #f1f5f9;
            color: #1e3a8a;
            font-weight: 600;
          }

          .dashboard-container .table tbody tr.pending {
            background: #fefcbf !important;
          }

          .dashboard-container .table tbody tr.approved {
            background: #d1fae5 !important;
          }

          .dashboard-container .table tbody tr.tl-rejected {
            background: #fee2e2 !important;
          }

          .dashboard-container .table tbody tr.re-raised-approved {
            background: #c8e6c9 !important;
          }

          .dashboard-container .table tbody tr.re-raised-rejected {
            background: #fecaca !important;
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
          .dashboard-container .btn-you-approved,
          .dashboard-container .btn-you-rejected,
          .dashboard-container .btn-rejection-acknowledged,
          .dashboard-container .btn-ticket-re-raised,
          .dashboard-container .btn-re-raised-accepted,
          .dashboard-container .btn-re-raised-rejected,
          .dashboard-container .btn-approve-reraise,
          .dashboard-container .btn-reject-reraise,
          .dashboard-container .btn-static,
          .dashboard-container .btn-waiting-for-acceptance {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
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
          }

          .dashboard-container .btn-info:hover {
            background: linear-gradient(90deg, #0891b2, #0e7490) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
          }

          .dashboard-container .btn-you-approved {
            background: #86efac !important;
            color: #065f46 !important;
            border: none;
          }

          .dashboard-container .btn-you-approved:hover {
            background: #4ade80 !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
          }

          .dashboard-container .btn-you-rejected {
            background: #fca5a5 !important;
            color: #7f1d1d !important;
            border: none;
          }

          .dashboard-container .btn-you-rejected:hover {
            background: #f87171 !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .dashboard-container .btn-rejection-acknowledged {
            background: #facc15 !important;
            color: #713f12 !important;
            border: none;
          }

          .dashboard-container .btn-rejection-acknowledged:hover {
            background: #eab308 !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(250, 204, 21, 0.3);
          }

          .dashboard-container .btn-ticket-re-raised {
            background: #d8b4fe !important;
            color: #6b21a8 !important;
            border: none;
          }

          .dashboard-container .btn-ticket-re-raised:hover {
            background: #c084fc !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(216, 180, 254, 0.3);
          }

          .dashboard-container .btn-re-raised-accepted {
            background: #86efac !important;
            color: #065f46 !important;
            border: none;
          }

          .dashboard-container .btn-re-raised-accepted:hover {
            background: #4ade80 !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
          }

          .dashboard-container .btn-re-raised-rejected {
            background: #fca5a5 !important;
            color: #7f1d1d !important;
            border: none;
          }

          .dashboard-container .btn-re-raised-rejected:hover {
            background: #f87171 !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
          }

          .dashboard-container .btn-approve-reraise {
            background: linear-gradient(90deg, #16a34a, #15803d) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-approve-reraise:hover {
            background: linear-gradient(90deg, #15803d, #166534) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
          }

          .dashboard-container .btn-reject-reraise {
            background: linear-gradient(90deg, #dc2626, #b91c1c) !important;
            color: #ffffff !important;
            border: none;
          }

          .dashboard-container .btn-reject-reraise:hover {
            background: linear-gradient(90deg, #b91c1c, #991b1b) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(220, 38, 38, 0.3);
          }

          .dashboard-container .btn-static {
            background: #e5e7eb !important;
            color: #374151 !important;
            border: 1px solid #d1d5db;
            cursor: default;
          }

          .dashboard-container .btn-waiting-for-acceptance {
            background: #fefcbf !important;
            color: #713f12 !important;
            border: 1px solid #d1d5db;
            cursor: default;
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

          .dashboard-container .modal-body textarea {
            width: 100%;
            padding: 0.5rem;
            font-size: 0.9rem;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            margin-bottom: 1rem;
            height: 100px;
            resize: vertical;
          }

          .dashboard-container .modal-footer {
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .dashboard-container .actions-container {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            justify-content: center;
          }

          .dashboard-container .table td.actions-column {
            min-width: 180px;
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

          @media (max-width: 768px) {
            .dashboard-container .dashboard-card {
              padding: 1.5rem;
            }

            .dashboard-container h2 {
              font-size: 1.8rem;
            }

            .dashboard-container .tl-header h3 {
              font-size: 1.5rem;
            }

            .dashboard-container .filter-container {
              flex-direction: column;
              gap: 0.75rem;
            }

            .dashboard-container .filter-container select {
              min-width: 100%;
            }

            .dashboard-container .table th,
            .dashboard-container .table td {
              padding: 0.75rem;
              font-size: 0.85rem;
            }

            .dashboard-container .table td.actions-column {
              min-width: 140px;
            }

            .dashboard-container .btn-info,
            .dashboard-container .btn-you-approved,
            .dashboard-container .btn-you-rejected,
            .dashboard-container .btn-rejection-acknowledged,
            .dashboard-container .btn-ticket-re-raised,
            .dashboard-container .btn-re-raised-accepted,
            .dashboard-container .btn-re-raised-rejected,
            .dashboard-container .btn-approve-reraise,
            .dashboard-container .btn-reject-reraise,
            .dashboard-container .btn-static,
            .dashboard-container .btn-waiting-for-acceptance {
              padding: 0.3rem 0.6rem;
              font-size: 0.8rem;
            }

            .dashboard-container .actions-container {
              flex-direction: column;
              gap: 0.3rem;
            }
          }
        `}
      </style>
      <div className="dashboard-card">
        <h2>Team Lead Dashboard - Processing Leave Requests</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="tl-header">
          <h3>{tlInfo.name}</h3>
          <p>Email: {tlInfo.email}</p>
        </div>
        <div className="dashboard-content">
          {/* Filter Dropdowns */}
          <div className="filter-container">
            <div>
              <label htmlFor="approvalFilter">Approval Status:</label>
              <select
                id="approvalFilter"
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="tl-rejected">TL Rejected</option>
                <option value="re-raised-approved">Re-Raised Approved</option>
                <option value="re-raised-rejected">Re-Raised Rejected</option>
              </select>
            </div>
            <div>
              <label htmlFor="leaveTypeFilter">Leave Type:</label>
              <select
                id="leaveTypeFilter"
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="SickLeave">Sick Leave</option>
                <option value="PlannedLeave">Planned Leave</option>
                <option value="EmergencyLeave">Emergency Leave</option>
              </select>
            </div>
          </div>
          {/* Tickets Table */}
          {filteredTickets.length > 0 ? (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Employee Name</th>
                  <th>Leave Type</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>TL Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, index) => (
                  <tr key={ticket.Ticked_id || index} className={(ticket.tl_status || '').toLowerCase().replace(' ', '-')}>
                    <td>{ticket.Ticked_id || '-'}</td>
                    <td>{ticket.Employee_Name || '-'}</td>
                    <td>{ticket.leave_type || '-'}</td>
                    <td>{ticket.Department || '-'}</td>
                    <td>{ticket.Status || '-'}</td>
                    <td>{ticket.tl_status || '-'}</td>
                    <td className="actions-column">
                      <div className="actions-container">
                        {(ticket.Status === 'in-progress-tl-level' && ticket.tl_status === 'pending') ? (
                          <button
                            className="btn btn-info btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            View Ticket
                          </button>
                        ) : (ticket.Status === 'in-progress-tl-level' && ticket.tl_status === 'approved') ||
                          (ticket.Status === 'approved' && ticket.tl_status === 'approved') ? (
                          <button
                            className="btn btn-you-approved btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            You Approved
                          </button>
                        ) : (ticket.Status === 'in-progress-tl-level' && ticket.tl_status === 'tl-rejected') ||
                          (ticket.Status === 'tl-rejected' && ticket.tl_status === 'tl-rejected') ? (
                          <button
                            className="btn btn-you-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            You Rejected
                          </button>
                        ) : (ticket.Status === 'rejection-accepted' && ticket.tl_status === 'tl-rejected') ? (
                          <button
                            className="btn btn-rejection-acknowledged btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Rejection Acknowledged
                          </button>
                        ) : (ticket.Status === 'in-progress-tl-level-re-raised' && 
                          (ticket.tl_status?.toLowerCase() === 'pending' || ticket.tl_status?.toLowerCase() === 'tl-rejected' )) ? (
                          <button
                            className="btn btn-ticket-re-raised btn-sm"
                            onClick={() => {
                              console.log('Ticket Re-Raised button clicked for ticket:', ticket.Ticked_id, 'tl_status:', ticket.tl_status);
                              openViewModal(ticket);
                            }}
                          >
                            Ticket Re-Raised
                          </button>
                        ) : (ticket.Status === 'in-progress-tl-level-re-raised' && ticket.tl_status === 're-raised-approved') 
                        ||
                          (ticket.Status === 're-raised-approved' && ticket.tl_status === 're-raised-approved')? (
                          <button
                            className="btn btn-re-raised-accepted btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raised Accepted
                          </button>
                        ) : ((ticket.Status === 'in-progress-tl-level-re-raised' && ticket.tl_status === 're-raised-rejected') ||
                          (ticket.Status === 're-raised-approved' && ticket.tl_status === 're-raised-rejected') ||
                          (ticket.Status === 're-raised-rejected' && ticket.tl_status === 're-raised-rejected')) ? (
                          <button
                            className="btn btn-re-raised-rejected btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            Re-Raised Rejected
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openViewModal(ticket)}
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No leave requests match the selected filters.</p>
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
                    <p><strong>TL Name:</strong> {selectedTicket.TL_Name || '-'}</p>
                    <p><strong>TL Email:</strong> {selectedTicket.TL_mail || '-'}</p>
                    <p><strong>Ticket ID:</strong> {selectedTicket.Ticked_id || '-'}</p>
                    <p><strong>Employee Name:</strong> {selectedTicket.Employee_Name || '-'}</p>
                    <p><strong>Employee ID:</strong> {selectedTicket['Employee-ID'] || '-'}</p>
                    <p><strong>Leave Type:</strong> {selectedTicket.leave_type || '-'}</p>
                    <p><strong>Reason:</strong> {selectedTicket.Reason || '-'}</p>
                    <p><strong>Department:</strong> {selectedTicket.Department || '-'}</p>
                    <p><strong>Status:</strong> {selectedTicket.Status || '-'}</p>
                    <p><strong>TL Status:</strong> {selectedTicket.tl_status || '-'}</p>
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
                    {selectedTicket.hr_message && (
                      <p><strong>HR Message:</strong> {selectedTicket.hr_message || '-'}</p>
                    )}
                    {selectedTicket.tl_message && (
                      <p><strong>TL Message:</strong> {selectedTicket.tl_message || '-'}</p>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                {selectedTicket && (
                  <>
                    {selectedTicket.Status === 'in-progress-tl-level' && selectedTicket.tl_status === 'pending' ? (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openMessageModal('approve')}
                          disabled={isSubmitting}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => openMessageModal('reject')}
                          disabled={isSubmitting}
                        >
                          Reject
                        </button>
                      </>
                    ) : (selectedTicket.Status === 'in-progress-tl-level' && selectedTicket.tl_status === 'approved') ||
                      (selectedTicket.Status === 'approved' && selectedTicket.tl_status === 'approved') ? (
                      <button className="btn btn-static btn-sm" disabled>
                        You Approved
                      </button>
                    ) : (selectedTicket.Status === 'in-progress-tl-level' && selectedTicket.tl_status === 'tl-rejected') ||
                      (selectedTicket.Status === 'tl-rejected' && selectedTicket.tl_status === 'tl-rejected') ? (
                      <>
                        <button className="btn btn-static btn-sm" disabled>
                          You Rejected
                        </button>
                        <button className="btn btn-waiting-for-acceptance btn-sm" disabled>
                          Waiting for Acceptance
                        </button>
                      </>
                    ) : (selectedTicket.Status === 'rejection-accepted' && selectedTicket.tl_status === 'tl-rejected') ? (
                      <>
                        <button className="btn btn-static btn-sm" disabled>
                          Rejected
                        </button>
                        <button className="btn btn-static btn-sm" disabled>
                          Rejection Acknowledged
                        </button>
                      </>
                    ) : (selectedTicket.Status === 'in-progress-tl-level-re-raised' && 
                      (selectedTicket.tl_status === 'tl-rejected' || selectedTicket.tl_status === 'pending')) ? (
                      <>
                        <button
                          className="btn btn-approve-reraise btn-sm"
                          onClick={() => openMessageModal('approve-reraise')}
                          disabled={isSubmitting}
                        >
                          Approve-reraise
                        </button>
                        <button
                          className="btn btn-reject-reraise btn-sm"
                          onClick={() => openMessageModal('reject-reraise')}
                          disabled={isSubmitting}
                        >
                          Reject-reraise
                        </button>
                      </>
                    ) : (selectedTicket.Status === 'in-progress-tl-level-re-raised' && selectedTicket.tl_status === 're-raised-approved') ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raised Ticket Accepted
                      </button>
                    ) : ((selectedTicket.Status === 'in-progress-tl-level-re-raised' && selectedTicket.tl_status === 're-raised-rejected') ||
                      (selectedTicket.Status === 're-raised-approved' && selectedTicket.tl_status === 're-raised-rejected') ||
                      (selectedTicket.Status === 're-raised-rejected' && selectedTicket.tl_status === 're-raised-rejected')) ? (
                      <button className="btn btn-static btn-sm" disabled>
                        Re-Raised Ticket Rejected
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

        {/* Message Input Modal */}
        <div className={`modal ${showMessageModal ? 'd-block' : 'd-none'}`} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {actionType === 'approve' ? 'Reason for Approval' :
                   actionType === 'reject' ? 'Reason for Rejection' :
                   actionType === 'approve-reraise' ? 'Reason for Re-Raise Approval' :
                   'Reason for Re-Raise Rejection'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMessageModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="messagePayload">Message:</label>
                <textarea
                  id="messagePayload"
                  value={messagePayload}
                  onChange={(e) => setMessagePayload(e.target.value)}
                  placeholder="Enter your reason here"
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStatusChange}
                  disabled={isSubmitting || !messagePayload.trim()}
                >
                  Submit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowMessageModal(false)}
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

export default TLDashboard;