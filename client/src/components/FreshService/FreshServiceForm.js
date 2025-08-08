import React, { useState, useEffect, useCallback } from "react"
import { useDispatch } from 'react-redux';
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table, Button, Container } from "react-bootstrap"
import API from "../../services/API"
import Formatter from "../../services/Formatter"
import moment from 'moment';
import { da } from "date-fns/locale";
import Modal from "react-bootstrap/Modal";
import FileViewer from 'react-file-viewer';

const FreshServiceForm = (props) => {
  var [currentView, setCurrentView] = useState('list');
  var [selectedTicket, setSelectedTicket] = useState(null);
  
  var [workspaces, setWorkspaces] = useState([]);
  var [tickets, setTickets] = useState([]);
  var [filters, setFilters] = useState({
    workspaceId: '',
    status: 'all'
  });
  var [ticketsLoading, setTicketsLoading] = useState(false);
  var [ticketsError, setTicketsError] = useState(null);
  var [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Load workspace categories from JSON file
  useEffect(function () {
    console.log('🔄 Loading workspace categories from JSON file');
    fetch('/workspace-categories.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load workspace categories');
        }
        return response.json();
      })
      .then(function (data) {
        WORKSPACE_CATEGORIES = data;
        setCategoriesLoaded(true);
        console.log('✅ Workspace categories loaded from JSON');
      })
      .catch(function (error) {
        console.error('❌ Failed to load workspace categories:', error);
        // Fallback to minimal data if JSON fails
        WORKSPACE_CATEGORIES = {
          "EVOX": {
            "EVOX": ["Access", "Bug", "Update"],
            "Hardware": ["Asset"],
            "Software": ["Application"]
          }
        };
        setCategoriesLoaded(true);
      });
  }, []);

  // Load workspaces once
  useEffect(function () {
    console.log('🔄 Loading workspaces (once)');
    apiCall('/workspaces')
      .then(function (data) {
        var activeWorkspaces = (data || []).filter(function (ws) {
          return ws.state === 'active';
        });
        setWorkspaces(activeWorkspaces);
        console.log('✅ Workspaces loaded');
      })
      .catch(function (error) {
        console.error('❌ Failed to load workspaces:', error);
      });
  }, []);

  // Load tickets when filters change
  var loadTickets = useCallback(function () {
    console.log('🔄 Loading tickets');
    setTicketsLoading(true);
    setTicketsError(null);

    var params = new URLSearchParams({
      status: filters.status,
      page: '1',
      limit: '25'
    });

    if (filters.workspaceId) {
      params.append('workspaceId', filters.workspaceId);
    }

    apiCall('/tickets/my-tickets?' + params.toString())
      .then(function (data) {
        setTickets(data.tickets || []);
        console.log('✅ Tickets loaded');
      })
      .catch(function (error) {
        console.error('❌ Failed to load tickets:', error);
        setTicketsError(error.message);
      })
      .finally(function () {
        setTicketsLoading(false);
      });
  }, [filters.status, filters.workspaceId]);

  useEffect(function () {
    if (currentView === 'list') {
      loadTickets();
    }
  }, [loadTickets, currentView]);

  // Event handlers
  var handleTicketCreated = useCallback(function () {
    setCurrentView('list');
    setTimeout(loadTickets, 500);
  }, [loadTickets]);

  var handleTicketSelect = useCallback(function (ticket) {
    setSelectedTicket(ticket);
    setCurrentView('details');
  }, []);

  var handleBackToList = useCallback(function () {
    setCurrentView('list');
    setSelectedTicket(null);
  }, []);

  var handleFilterChange = useCallback(function (field, value) {
    setFilters(function (prev) {
      return { ...prev, [field]: value };
    });
  }, []);

  var formatDate = function(dateString) {
    try {
      if (!dateString) return 'Invalid Date';
      var date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Inject the professional CSS styles
  const professionalStyles = `
  /* Reset and Base Styles */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    font-size: 14px;
    line-height: 1.5;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Professional Header */
  .header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo {
    width: 32px;
    height: 32px;
    background: #3b82f6;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: white;
    font-size: 14px;
  }

  .header h1 {
    color: #1e293b;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .header-subtitle {
    color: #64748b;
    font-size: 13px;
    font-weight: 400;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-size: 13px;
  }

  .nav {
    display: flex;
    border-top: 1px solid #f1f5f9;
    height: 48px;
  }

  .nav-button {
    background: none;
    border: none;
    padding: 0 16px;
    height: 48px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-button:hover {
    color: #3b82f6;
    background: #f8fafc;
  }

  .nav-button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
    background: #f8fafc;
  }

  /* Main Content */
  .main {
    flex: 1;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    padding: 24px;
  }

  /* Professional Card Styles */
  .card-fs {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .card-header-fs {
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;
  }

  .card-title-fs {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    display: flex;
    align-items: center;
  }

  .card-content-fs {
    padding: 24px;
  }

  /* Professional Table Styles */
  .table-container {
    overflow-x: auto;
  }

  .professional-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .professional-table th {
    background: #f8fafc;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .professional-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .professional-table tbody tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .professional-table tbody tr:hover {
    background: #f8fafc;
  }

  /* Status and Priority Badges */
  .status-badge, .priority-badge, .state-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  /* Status Badges */
  .status-open {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-resolved {
    background: #d1fae5;
    color: #047857;
  }

  .status-closed {
    background: #f3f4f6;
    color: #374151;
  }

  /* Priority Badges */
  .priority-low {
    background: #f3f4f6;
    color: #6b7280;
  }

  .priority-medium {
    background: #dbeafe;
    color: #1e40af;
  }

  .priority-high {
    background: #fef3c7;
    color: #92400e;
  }

  .priority-urgent {
    background: #fee2e2;
    color: #dc2626;
  }

  /* State Badges */
  .state-new {
    background: #ecfdf5;
    color: #059669;
  }

  .state-requester-respond {
    background: #eff6ff;
    color: #2563eb;
  }

  .state-response-due {
    background: #fef2f2;
    color: #dc2626;
  }

  .state-overdue {
    background: #fef2f2;
    color: #991b1b;
    font-weight: 600;
  }

  /* Ticket ID Styling */
  .ticket-id {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #3b82f6;
  }

  /* Subject Column */
  .ticket-subject {
    font-weight: 500;
    color: #1e293b;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* User Avatar/Initial */
  .user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: white;
    margin-right: 8px;
  }

  .user-avatar.avatar-m { background: #10b981; }
  .user-avatar.avatar-v { background: #3b82f6; }
  .user-avatar.avatar-h { background: #f59e0b; }
  .user-avatar.avatar-c { background: #8b5cf6; }
  .user-avatar.avatar-s { background: #ef4444; }
  .user-avatar.avatar-d { background: #06b6d4; }
  .user-avatar.avatar-e { background: #84cc16; }
  .user-avatar.avatar-r { background: #f97316; }

  /* Professional Filters */
  .filters {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px 24px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    align-items: center;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filter-label {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .form-select {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: white;
    min-width: 120px;
  }

  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Professional Form Styles */
  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
    font-size: 13px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    min-height: 100px;
    resize: vertical;
    font-family: inherit;
  }

  /* Professional Buttons */
  .btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    transition: background-color 0.15s ease;
  }

  .btn:hover {
    background: #2563eb;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6b7280;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  /* Error and Success Messages */
  .error-message {
    color: #dc2626;
    font-size: 13px;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .success-message {
    background: #ecfdf5;
    color: #065f46;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    border: 1px solid #a7f3d0;
    font-size: 14px;
  }

  /* Loading States */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: #6b7280;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: #6b7280;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin-bottom: 8px;
    color: #374151;
    font-size: 16px;
    font-weight: 500;
  }

  /* Subject Preview */
  .subject-preview {
    background: #f8fafc;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 13px;
    color: #475569;
    margin-bottom: 8px;
    min-height: 38px;
    display: flex;
    align-items: center;
  }

  /* Conversation Styles */
  .conversation-list {
    max-height: 500px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 24px;
  }

  .conversation-item {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .conversation-item:last-child {
    border-bottom: none;
  }

  .conversation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .conversation-user {
    font-weight: 500;
    color: #3b82f6;
    font-size: 13px;
  }

  .conversation-date {
    font-size: 12px;
    color: #64748b;
  }

  .conversation-body {
    color: #374151;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Back Button */
  .back-button {
    background: #6b7280;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 16px;
    font-size: 13px;
    transition: background-color 0.15s ease;
  }

  .back-button:hover {
    background: #4b5563;
  }

  /* Notification Badge */
  .notification-badge {
    background: #3b82f6;
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header-top {
      flex-direction: column;
      height: auto;
      padding: 16px 0;
      gap: 12px;
    }

    .nav {
      overflow-x: auto;
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .main {
      padding: 16px;
    }

    .professional-table {
      font-size: 12px;
    }

    .professional-table th,
    .professional-table td {
      padding: 8px 12px;
    }

    .ticket-subject {
      max-width: 200px;
    }
  }
  `;

  // Inject styles into head
  if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = professionalStyles;
    document.head.appendChild(styleElement);
  }

  // HARDCODED USER - Replace with actual auth when integrating
  const CURRENT_USER = {
    email: "vishnu.prakash@eastvantage.com"
  };

  // API Configuration
  const API_BASE = 'https://localhost:7014/api';
  const EVOX_WORKSPACE_ID = 14;

  // WORKSPACE CATEGORIES DATA - Will be loaded from JSON file
  let WORKSPACE_CATEGORIES = {};

  // Simple API helper
  const apiCall = function (endpoint, options) {
    options = options || {};
    let fullUrl = API_BASE + endpoint;

    const urlObj = new URL(fullUrl);
    urlObj.searchParams.set('userEmail', CURRENT_USER.email);
    fullUrl = urlObj.toString();

    console.log('🌐 API Call:', fullUrl);

    return fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'omit',
      method: options.method || 'GET',
      body: options.body || undefined
    })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .catch(function (error) {
        console.error('❌ API call failed:', error.message);
        throw error;
      });
  };

  // Helper function to get user avatar color
  const getUserAvatarClass = function(email) {
    if (!email) return 'avatar-v';
    const firstChar = email.charAt(0).toLowerCase();
    const colorMap = {
      'm': 'avatar-m', 'v': 'avatar-v', 'h': 'avatar-h', 'c': 'avatar-c',
      's': 'avatar-s', 'd': 'avatar-d', 'e': 'avatar-e', 'r': 'avatar-r'
    };
    return colorMap[firstChar] || 'avatar-v';
  };

  // Helper function to get user initials
  const getUserInitials = function(email) {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  // Utility functions
  const sanitizeInput = function (input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '');
  };

  const SafeTextRenderer = function ({ text }) {
    if (!text) return null;
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return React.createElement('div', { style: { whiteSpace: 'pre-wrap' } }, cleanText);
  };

  const buildSubjectPrefix = function (workspace, subCategory, itemCategory) {
    if (!workspace) return '';
    if (!subCategory) return `[${workspace}] | | - `;
    
    const parts = [workspace, subCategory];
    if (itemCategory && itemCategory.trim()) parts.push(itemCategory);
    
    return '[' + parts.join('] | [') + '] | - ';
  };

  // Enhanced Validation Functions
  const validateTicketData = function (data) {
    var errors = {};

    const prefix = buildSubjectPrefix(data.selectedWorkspace, data.selectedSubCategory, data.selectedItemCategory);
    const userSubject = data.subject.replace(prefix, '').trim();

    if (!userSubject || userSubject.length < 5) {
      errors.userSubject = 'Subject must be at least 5 characters';
    } else if (data.subject.length > 255) {
      errors.userSubject = 'Total subject (including categories) must be less than 255 characters';
    }

    if (!data.description || typeof data.description !== 'string') {
      errors.description = 'Description is required';
    } else if (data.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (data.description.length > 4000) {
      errors.description = 'Description must be less than 4000 characters';
    }

    if (!data.priority || ![1, 2, 3, 4].includes(data.priority)) {
      errors.priority = 'Priority must be selected';
    }

    if (!data.selectedWorkspace) {
      errors.selectedWorkspace = 'Workspace must be selected';
    } else if (!WORKSPACE_CATEGORIES[data.selectedWorkspace]) {
      errors.selectedWorkspace = 'Invalid workspace selected';
    }

    if (data.selectedWorkspace && WORKSPACE_CATEGORIES[data.selectedWorkspace]) {
      const allSubCategories = Object.keys(WORKSPACE_CATEGORIES[data.selectedWorkspace]);
      const availableSubCategories = allSubCategories.filter(function(subCategory) {
        return subCategory !== data.selectedWorkspace;
      });
      
      if (availableSubCategories.length > 0 && !data.selectedSubCategory) {
        errors.selectedSubCategory = 'Sub-Category must be selected';
      } else if (data.selectedSubCategory && !availableSubCategories.includes(data.selectedSubCategory)) {
        errors.selectedSubCategory = 'Invalid sub-category selected';
      }
    }

    if (data.selectedWorkspace && data.selectedSubCategory && WORKSPACE_CATEGORIES[data.selectedWorkspace]) {
      const itemCategories = WORKSPACE_CATEGORIES[data.selectedWorkspace][data.selectedSubCategory] || [];
      if (itemCategories.length > 1 && !data.selectedItemCategory) {
        errors.selectedItemCategory = 'Item Category must be selected';
      } else if (data.selectedItemCategory && !itemCategories.includes(data.selectedItemCategory)) {
        errors.selectedItemCategory = 'Invalid item category selected';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors
    };
  };

  // CREATE TICKET PAGE - Professional Version
  const CreateTicketPage = function (props) {
    var workspaces = props.workspaces;
    var onTicketCreated = props.onTicketCreated;

    var [formData, setFormData] = useState({
      subject: '',
      userSubject: '',
      description: '',
      priority: 2,
      selectedWorkspace: 'EVOX',
      selectedSubCategory: '',
      selectedItemCategory: ''
    });

    var [errors, setErrors] = useState({});
    var [success, setSuccess] = useState(false);
    var [loading, setLoading] = useState(false);

    useEffect(function () {
      const prefix = buildSubjectPrefix(
        formData.selectedWorkspace,
        formData.selectedSubCategory,
        formData.selectedItemCategory
      );
      setFormData(function (prev) {
        return { ...prev, subject: prefix + prev.userSubject };
      });
    }, [formData.selectedWorkspace, formData.selectedSubCategory, formData.selectedItemCategory, formData.userSubject]);

    var updateField = function (field, value) {
      setFormData(function (prev) {
        var newData = { ...prev, [field]: value };
        
        if (field === 'selectedWorkspace') {
          newData.selectedSubCategory = '';
          newData.selectedItemCategory = '';
        }
        if (field === 'selectedSubCategory') {
          newData.selectedItemCategory = '';
        }
        
        return newData;
      });
      
      if (errors[field]) {
        setErrors(function (prev) {
          var newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

    var handleSubmit = function (e) {
      e.preventDefault();

      var validation = validateTicketData(formData);
      setErrors(validation.errors);

      if (validation.isValid) {
        setLoading(true);

        var ticketData = {
          subject: sanitizeInput(formData.subject),
          description: sanitizeInput(formData.description),
          email: CURRENT_USER.email,
          priority: parseInt(formData.priority),
          status: 2,
          workspace_id: EVOX_WORKSPACE_ID
        };

        apiCall('/tickets', {
          method: 'POST',
          body: JSON.stringify(ticketData)
        })
          .then(function (result) {
            setSuccess(true);
            setFormData({
              subject: '',
              userSubject: '',
              description: '',
              priority: 2,
              selectedWorkspace: 'EVOX',
              selectedSubCategory: '',
              selectedItemCategory: ''
            });
            setTimeout(function () { setSuccess(false); }, 3000);
            if (onTicketCreated) onTicketCreated();
          })
          .catch(function (error) {
            setErrors({ submit: error.message });
          })
          .finally(function () {
            setLoading(false);
          });
      }
    };

    var workspaceOptions = workspaces.map(function(ws) { return ws.name; });
    
    var subCategoryOptions = formData.selectedWorkspace && WORKSPACE_CATEGORIES[formData.selectedWorkspace] 
      ? Object.keys(WORKSPACE_CATEGORIES[formData.selectedWorkspace]).filter(function(subCategory) {
          return subCategory !== formData.selectedWorkspace;
        })
      : [];
      
    var itemCategoryOptions = (formData.selectedWorkspace && formData.selectedSubCategory && WORKSPACE_CATEGORIES[formData.selectedWorkspace]) 
      ? (WORKSPACE_CATEGORIES[formData.selectedWorkspace][formData.selectedSubCategory] || [])
      : [];

    return React.createElement('div', { className: 'card-fs' },
      React.createElement('div', { className: 'card-header-fs' },
        React.createElement('h2', { className: 'card-title-fs' }, 'Create New Ticket')
      ),

      React.createElement('div', { className: 'card-content-fs' },
        success && React.createElement('div', { className: 'success-message' },
          '✅ Ticket created successfully!'
        ),

        React.createElement('form', { onSubmit: handleSubmit },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Workspace *'),
            React.createElement('select', {
              className: 'form-select',
              value: formData.selectedWorkspace,
              onChange: function (e) { updateField('selectedWorkspace', e.target.value); }
            },
              React.createElement('option', { value: '' }, 'Select Workspace'),
              workspaceOptions.map(function (workspaceName) {
                return React.createElement('option', { key: workspaceName, value: workspaceName }, workspaceName);
              })
            ),
            errors.selectedWorkspace && React.createElement('div', { className: 'error-message' },
              '⚠️ ' + errors.selectedWorkspace
            )
          ),

          formData.selectedWorkspace && subCategoryOptions.length > 0 && React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Sub-Category *'),
            React.createElement('select', {
              className: 'form-select',
              value: formData.selectedSubCategory,
              onChange: function (e) { updateField('selectedSubCategory', e.target.value); }
            },
              React.createElement('option', { value: '' }, 'Select Sub-Category'),
              subCategoryOptions.map(function (subCategory) {
                return React.createElement('option', { key: subCategory, value: subCategory }, subCategory);
              })
            ),
            errors.selectedSubCategory && React.createElement('div', { className: 'error-message' },
              '⚠️ ' + errors.selectedSubCategory
            )
          ),

          formData.selectedSubCategory && itemCategoryOptions.length > 1 && React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Item Category'),
            React.createElement('select', {
              className: 'form-select',
              value: formData.selectedItemCategory,
              onChange: function (e) { updateField('selectedItemCategory', e.target.value); }
            },
              React.createElement('option', { value: '' }, 'Select Item Category'),
              itemCategoryOptions.map(function (itemCategory, index) {
                return React.createElement('option', { key: index, value: itemCategory }, itemCategory || '(No specific category)');
              })
            ),
            errors.selectedItemCategory && React.createElement('div', { className: 'error-message' },
              '⚠️ ' + errors.selectedItemCategory
            )
          ),

          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Subject Preview'),
            React.createElement('div', { className: 'subject-preview' }, 
              formData.subject || 'Please select categories above...'
            ),
            
            React.createElement('label', { className: 'form-label' }, 'Your Subject *'),
            React.createElement('input', {
              type: 'text',
              className: 'form-input',
              placeholder: 'Brief description of the issue',
              value: formData.userSubject,
              onChange: function (e) { updateField('userSubject', e.target.value); }
            }),
            errors.userSubject && React.createElement('div', { className: 'error-message' },
              '⚠️ ' + errors.userSubject
            )
          ),

          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Description *'),
            React.createElement('textarea', {
              className: 'form-textarea',
              placeholder: 'Detailed description of the issue...',
              value: formData.description,
              onChange: function (e) { updateField('description', e.target.value); },
              rows: '6'
            }),
            errors.description && React.createElement('div', { className: 'error-message' },
              '⚠️ ' + errors.description
            )
          ),

          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Priority *'),
            React.createElement('select', {
              className: 'form-select',
              value: formData.priority,
              onChange: function (e) { updateField('priority', parseInt(e.target.value)); }
            },
              React.createElement('option', { value: 1 }, 'Low'),
              React.createElement('option', { value: 2 }, 'Medium'),
              React.createElement('option', { value: 3 }, 'High'),
              React.createElement('option', { value: 4 }, 'Urgent')
            )
          ),

          React.createElement('button', {
            type: 'submit',
            className: 'btn',
            disabled: loading
          }, loading ? 'Creating...' : 'Create Ticket'),

          errors.submit && React.createElement('div', { className: 'error-message' },
            '❌ ' + errors.submit
          )
        )
      )
    );
  };

  // PROFESSIONAL TICKET LIST PAGE - Table Format
  const TicketListPage = function (props) {
    var tickets = props.tickets;
    var workspaces = props.workspaces;
    var onTicketSelect = props.onTicketSelect;
    var onFilterChange = props.onFilterChange;
    var filters = props.filters;
    var loading = props.loading;
    var error = props.error;

    var getStatusClass = function (status) {
      switch (status) {
        case 2: return 'status-open';
        case 3: return 'status-pending';
        case 4: return 'status-resolved';
        case 5: return 'status-closed';
        default: return 'status-open';
      }
    };

    var getPriorityClass = function (priority) {
      switch (priority) {
        case 1: return 'priority-low';
        case 2: return 'priority-medium';
        case 3: return 'priority-high';
        case 4: return 'priority-urgent';
        default: return 'priority-medium';
      }
    };

  

    var getStatusText = function(status) {
      switch (status) {
        case 2: return 'Open';
        case 3: return 'Pending';
        case 4: return 'Resolved';
        case 5: return 'Closed';
        default: return 'Open';
      }
    };

    var getPriorityText = function(priority) {
      switch (priority) {
        case 1: return 'Low';
        case 2: return 'Medium';
        case 3: return 'High';
        case 4: return 'Urgent';
        default: return 'Medium';
      }
    };

    // Mock function to get state based on ticket properties
    var getTicketState = function(ticket) {
      // This is a mock implementation - adjust based on your actual data
      const states = ['New', 'Requester Respond', 'Response Due', 'Overdue'];
      return states[ticket.id % 4];
    };

    var getStateClass = function(state) {
      switch (state) {
        case 'New': return 'state-new';
        case 'Requester Respond': return 'state-requester-respond';
        case 'Response Due': return 'state-response-due';
        case 'Overdue': return 'state-overdue';
        default: return 'state-new';
      }
    };

    if (loading) {
      return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'loading' },
          React.createElement('span', { className: 'spinner' }),
          'Loading tickets...'
        )
      );
    }

    return React.createElement('div', null,
      // Professional Filters
      React.createElement('div', { className: 'filters' },
        React.createElement('div', { className: 'filter-group' },
          React.createElement('label', { className: 'filter-label' }, 'Workspace'),
          React.createElement('select', {
            className: 'form-select',
            value: filters.workspaceId,
            onChange: function (e) { onFilterChange('workspaceId', e.target.value); }
          },
            React.createElement('option', { value: '' }, 'All Workspaces'),
            workspaces.map(function (workspace) {
              return React.createElement('option', {
                key: workspace.id,
                value: workspace.id
              }, workspace.name);
            })
          )
        ),

        React.createElement('div', { className: 'filter-group' },
          React.createElement('label', { className: 'filter-label' }, 'Status'),
          React.createElement('select', {
            className: 'form-select',
            value: filters.status,
            onChange: function (e) { onFilterChange('status', e.target.value); }
          },
            React.createElement('option', { value: 'all' }, 'All Status'),
            React.createElement('option', { value: 'open' }, 'Open'),
            React.createElement('option', { value: 'pending' }, 'Pending'),
            React.createElement('option', { value: 'resolved' }, 'Resolved'),
            React.createElement('option', { value: 'closed' }, 'Closed')
          )
        ),

        React.createElement('div', { 
          style: { 
            marginLeft: 'auto', 
            fontSize: '13px', 
            color: '#64748b',
            display: 'flex',
            alignItems: 'center'
          } 
        }, 
          tickets.length + ' tickets'
        )
      ),

      // Professional Table
      React.createElement('div', { className: 'card-fs' },
        React.createElement('div', { className: 'card-header-fs' },
          React.createElement('h2', { className: 'card-title-fs' }, 
            'My Tickets',
            tickets.length > 0 && React.createElement('span', { className: 'notification-badge' }, tickets.length)
          )
        ),

        error && React.createElement('div', { className: 'card-content-fs' },
          React.createElement('div', { className: 'error-message' },
            '❌ Failed to load tickets: ' + error
          )
        ),

        tickets.length === 0 ?
          React.createElement('div', { className: 'empty-state' },
            React.createElement('div', { className: 'empty-state-icon' }, '🎫'),
            React.createElement('h3', null, 'No tickets found'),
            React.createElement('p', null, 'You haven\'t created any tickets yet.')
          ) :
          React.createElement('div', { className: 'table-container' },
            React.createElement('table', { className: 'professional-table' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', null, 'Status'),
                  React.createElement('th', null, 'Created Date'),
                  React.createElement('th', null, 'Subject'),
                  React.createElement('th', null, 'Requester'),
                  React.createElement('th', null, 'State'),
                  React.createElement('th', null, 'Priority'),
                  React.createElement('th', null, 'Assigned to')
                )
              ),
              React.createElement('tbody', null,
                tickets.map(function (ticket) {
                  const state = getTicketState(ticket);
                  const requesterEmail = ticket.email || CURRENT_USER.email;
                  
                  return React.createElement('tr', {
                    key: ticket.id,
                    onClick: function () { onTicketSelect(ticket); }
                  },
                    React.createElement('td', null,
                      React.createElement('span', {
                        className: 'status-badge ' + getStatusClass(ticket.status)
                      }, getStatusText(ticket.status))
                    ),
                    React.createElement('td', null, formatDate(ticket.created_at)),
                    React.createElement('td', null,
                      React.createElement('div', { className: 'ticket-subject' },
                        React.createElement('span', { className: 'ticket-id' }, '#' + ticket.id + ' '),
                        sanitizeInput(ticket.subject || 'No subject')
                      )
                    ),
                    React.createElement('td', null,
                      React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
                        React.createElement('span', {
                          className: 'user-avatar ' + getUserAvatarClass(requesterEmail)
                        }, getUserInitials(requesterEmail)),
                        React.createElement('span', null, requesterEmail.split('@')[0])
                      )
                    ),
                    React.createElement('td', null,
                      React.createElement('span', {
                        className: 'state-badge ' + getStateClass(state)
                      }, state)
                    ),
                    React.createElement('td', null,
                      React.createElement('span', {
                        className: 'priority-badge ' + getPriorityClass(ticket.priority)
                      }, getPriorityText(ticket.priority))
                    ),
                    React.createElement('td', null,
                      React.createElement('span', { style: { color: '#64748b', fontSize: '12px' } },
                        'EVOX Support'
                      )
                    )
                  );
                })
              )
            )
          )
      )
    );
  };

  // TICKET DETAILS PAGE - Professional Version
  const TicketDetailsPage = function (props) {
    var ticket = props.ticket;
    var onBack = props.onBack;

    var [conversations, setConversations] = useState([]);
    var [reply, setReply] = useState('');
    var [loading, setLoading] = useState(false);
    var [conversationsLoading, setConversationsLoading] = useState(false);

    useEffect(function () {
      if (!ticket.id) return;
      
      var ticketId = parseInt(ticket.id);
      if (isNaN(ticketId) || ticketId <= 0) return;

      console.log('🔄 Loading conversations for ticket:', ticketId);
      setConversationsLoading(true);

      apiCall('/tickets/' + ticketId + '/conversations')
        .then(function (data) {
          console.log('✅ Conversations loaded successfully');
          setConversations(data.conversations || []);
        })
        .catch(function (error) {
          console.error('❌ Failed to load conversations:', error);
        })
        .finally(function () {
          setConversationsLoading(false);
        });
    }, [ticket.id]);

    var handleReplySubmit = function (e) {
      e.preventDefault();
      if (!reply.trim()) return;

      setLoading(true);
      var id = parseInt(ticket.id);

      apiCall('/tickets/' + id + '/reply', {
        method: 'POST',
        body: JSON.stringify({ body: sanitizeInput(reply) })
      })
        .then(function () {
          setReply('');
          return apiCall('/tickets/' + id + '/conversations');
        })
        .then(function (data) {
          setConversations(data.conversations || []);
        })
        .catch(function (error) {
          console.error('Reply failed:', error);
        })
        .finally(function () {
          setLoading(false);
        });
    };

    return React.createElement('div', null,
      React.createElement('button', {
        className: 'back-button',
        onClick: onBack
      }, '← Back to My Tickets'),

      React.createElement('div', { className: 'card-fs' },
        React.createElement('div', { className: 'card-header-fs' },
          React.createElement('h2', { className: 'card-title-fs' }, 'Ticket #' + ticket.id)
        ),
        React.createElement('div', { className: 'card-content-fs' },
          React.createElement('h3', { style: { color: '#3b82f6', marginBottom: '16px' } }, ticket.subject),

          React.createElement('div', {
            style: {
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e2e8f0'
            }
          },
            React.createElement('strong', { style: { color: '#374151' } }, 'Description:'),
            React.createElement('div', { style: { marginTop: '8px' } },
              React.createElement(SafeTextRenderer, {
                text: ticket.description || 'No description provided'
              })
            )
          )
        )
      ),

      React.createElement('div', { className: 'card-fs' },
        React.createElement('div', { className: 'card-header-fs' },
          React.createElement('h3', { className: 'card-title-fs' }, 'Conversations')
        ),
        React.createElement('div', { className: 'card-content-fs' },
          conversationsLoading ?
            React.createElement('div', { className: 'loading' },
              React.createElement('span', { className: 'spinner' }),
              'Loading conversations...'
            ) :
            conversations.length === 0 ?
              React.createElement('div', { className: 'empty-state' },
                React.createElement('div', { className: 'empty-state-icon' }, '💬'),
                React.createElement('p', null, 'No conversations yet.')
              ) :
              React.createElement('div', { className: 'conversation-list' },
                conversations.map(function (conv) {
                  return React.createElement('div', {
                    key: conv.id,
                    className: 'conversation-item'
                  },
                    React.createElement('div', { className: 'conversation-header' },
                      React.createElement('span', { className: 'conversation-user' }, 'User ' + conv.userId),
                      React.createElement('span', { className: 'conversation-date' },
                        formatDate(conv.createdAt || conv.created_at))
                    ),
                    React.createElement('div', { className: 'conversation-body' },
                      React.createElement(SafeTextRenderer, {
                        text: conv.bodyText || conv.body || 'No content'
                      })
                    )
                  );
                })
              ),

          React.createElement('div', { 
            style: { 
              borderTop: '1px solid #e2e8f0', 
              paddingTop: '24px', 
              marginTop: '24px' 
            } 
          },
            React.createElement('h4', { style: { marginBottom: '12px', color: '#374151' } }, 'Add Reply'),
            React.createElement('form', { onSubmit: handleReplySubmit },
              React.createElement('textarea', {
                className: 'form-textarea',
                placeholder: 'Type your reply...',
                value: reply,
                onChange: function (e) { setReply(e.target.value); },
                rows: '4'
              }),
              React.createElement('button', {
                type: 'submit',
                className: 'btn',
                disabled: loading || !reply.trim(),
                style: { marginTop: '12px' }
              }, loading ? 'Adding Reply...' : 'Add Reply')
            )
          )
        )
      )
    );
  };

  return (
    <>
      <Wrapper>
        <ContainerWrapper>
          <ContainerBody>
            <Content>
              {React.createElement('div', { className: 'app' },
                React.createElement('header', { className: 'header' },
                  React.createElement('div', { className: 'header-container' },
                    React.createElement('div', { className: 'header-top' },
                      // React.createElement('div', { className: 'logo-section' },
                      //   React.createElement('div', { className: 'logo' }, 'EV'),
                      //   React.createElement('div', null,
                      //     React.createElement('h1', null, 'EVOX Service Desk'),
                      //     React.createElement('div', { className: 'header-subtitle' },
                      //       'Professional IT Support System'
                      //     )
                      //   )
                      // ),
                      // React.createElement('div', { className: 'user-info' },
                      //   React.createElement('span', {
                      //     className: 'user-avatar ' + getUserAvatarClass(CURRENT_USER.email)
                      //   }, getUserInitials(CURRENT_USER.email)),
                      //   CURRENT_USER.email
                      // )
                    ),

                    React.createElement('nav', { className: 'nav' },
                      React.createElement('button', {
                        className: 'nav-button' + (currentView === 'create' ? ' active' : ''),
                        onClick: function () { setCurrentView('create'); }
                      }, 
                        React.createElement('span', null, '📝'),
                        'Create Ticket'
                      ),
                      React.createElement('button', {
                        className: 'nav-button' + (currentView === 'list' ? ' active' : ''),
                        onClick: function () { setCurrentView('list'); }
                      },
                        React.createElement('span', null, '📋'),
                        'My Tickets'
                      )
                    )
                  )
                ),

                React.createElement('main', { className: 'main' },
                  !categoriesLoaded ? 
                    React.createElement('div', { className: 'loading' },
                      React.createElement('span', { className: 'spinner' }),
                      'Loading workspace categories...'
                    ) :
                    currentView === 'create' ? React.createElement(CreateTicketPage, {
                      workspaces: workspaces,
                      onTicketCreated: handleTicketCreated
                    }) :
                    currentView === 'list' ? React.createElement(TicketListPage, {
                      tickets: tickets,
                      workspaces: workspaces,
                      onTicketSelect: handleTicketSelect,
                      onFilterChange: handleFilterChange,
                      filters: filters,
                      loading: ticketsLoading,
                      error: ticketsError
                    }) :
                    currentView === 'details' && selectedTicket ? React.createElement(TicketDetailsPage, {
                      ticket: selectedTicket,
                      onBack: handleBackToList
                    }) : null
                )
              )}
              {/* <header className="header">
                <div className="header-container">
                  <nav className="nav">
                    <button className="nav-button"><span>📝</span>Create Ticket</button>
                    <button className="nav-button active"><span>📋</span>My Tickets</button>
                  </nav>
                </div>
              </header>
              <main className="main">
                <div>
                  <div className="filters">
                    <div className="filter-group"><label className="filter-label">Workspace</label><select className="form-select"><option value="">All Workspaces</option></select></div>
                    <div className="filter-group"><label className="filter-label">Status</label><select className="form-select"><option value="all">All Status</option><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
                    <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'rgb(100, 116, 139)', display: 'flex', alignItems: 'center' }}>0 tickets</div>
                  </div>

                  <div className="card-fs">
                    <div className="card-header-fs">
                      <h2 className="card-title-fs">My Tickets</h2>
                    </div>
                    <div className="card-content-fs"><div className="error-message">❌ Failed to load tickets: Failed to fetch</div></div>
                    <div className="empty-state"><div className="empty-state-icon">🎫</div><h3>No tickets found</h3><p>You haven't created any tickets yet.</p></div>
                  </div>
                </div>
              </main> */}
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    </>
  )
}

export default FreshServiceForm