import React, { useState, useEffect, useCallback, useRef } from "react"
import { useDispatch } from 'react-redux'
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import "./FreshService.css";
import { Editor } from '@tinymce/tinymce-react';
import { handleImageUpload } from '../../services/Helper';
import API from "../../services/API";
import Formatter from "../../services/Formatter";

var formatDate = function (dateString) {
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

// WORKSPACE CATEGORIES DATA - Will be loaded from JSON file
let WORKSPACE_CATEGORIES = {};

// Simple API helper
const apiCall = function (endpoint, options) {
  options = options || {};
  let fullUrl = process.env.REACT_APP_FRESHSERVICE_API_BASE_URL + endpoint;
  const urlObj = new URL(fullUrl);

  if (Object.keys(options).length >= 1) {
    urlObj.searchParams.set('userEmail', options.useremail);
  }
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
const getUserAvatarClass = function (email) {
  if (!email) return 'avatar-v';
  const firstChar = email.charAt(0).toLowerCase();
  const colorMap = {
    'm': 'avatar-m', 'v': 'avatar-v', 'h': 'avatar-h', 'c': 'avatar-c',
    's': 'avatar-s', 'd': 'avatar-d', 'e': 'avatar-e', 'r': 'avatar-r'
  };
  return colorMap[firstChar] || 'avatar-v';
};

// Helper function to get user initials
const getUserInitials = function (email) {
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


function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null; // No pagination needed
  }

  const { currentPage, totalPages, hasPrevious, hasNext } = pagination;

  return React.createElement(
    'div',
    { className: 'pagination-controls' },
    // Previous button
    React.createElement(
      'button',
      {
        disabled: !hasPrevious,
        onClick: () => hasPrevious && onPageChange(currentPage - 1)
      },
      'Previous'
    ),
    // Page info
    React.createElement(
      'span',
      { style: { margin: '0 10px' } },
      `Page ${currentPage} of ${totalPages}`
    ),
    // Next button
    React.createElement(
      'button',
      {
        disabled: !hasNext,
        onClick: () => hasNext && onPageChange(currentPage + 1)
      },
      'Next'
    )
  );
}


// PROFESSIONAL TICKET LIST PAGE - Table Format
const TicketListPage = function (props) {
  var tickets = props.tickets;
  var pagination = props.pagination; // from API
  var onPageChange = props.onPageChange; // parent function to fetch a specific page
  var workspaces = props.workspaces;
  var onTicketSelect = props.onTicketSelect;
  var onFilterChange = props.onFilterChange;
  var filters = props.filters;
  var loading = props.loading;
  var error = props.error;
  var useremail = props.useremail;

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

  var getStatusText = function (status) {
    switch (status) {
      case 2: return 'Open';
      case 3: return 'Pending';
      case 4: return 'Resolved';
      case 5: return 'Closed';
      default: return 'Open';
    }
  };

  var getPriorityText = function (priority) {
    switch (priority) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Urgent';
      default: return 'Medium';
    }
  };

  // Mock function to get state based on ticket properties
  var getTicketState = function (ticket) {
    // This is a mock implementation - adjust based on your actual data
    const states = ['New', 'Requester Respond', 'Response Due', 'Overdue'];
    return states[ticket.id % 4];
  };

  var getStateClass = function (state) {
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
    React.createElement('div', { className: 'filters-fs' },
      React.createElement('div', { className: 'filter-group-fs' },
        React.createElement('label', { className: 'filter-label-fs' }, 'Workspace'),
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
                // React.createElement('th', null, 'Requester'),
                React.createElement('th', null, 'State'),
                React.createElement('th', null, 'Priority'),
                //React.createElement('th', null, 'Assigned to')
              )
            ),
            React.createElement('tbody', null,
              tickets.map(function (ticket) {
                const state = getTicketState(ticket);
                const requesterEmail = ticket.email || '';

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
                  // React.createElement('td', null,
                  //   React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
                  //     React.createElement('span', {
                  //       className: 'user-avatar ' + getUserAvatarClass(requesterEmail)
                  //     }, getUserInitials(requesterEmail)),
                  //     React.createElement('span', null, requesterEmail.split('@')[0])
                  //   )
                  // ),
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
                  // React.createElement('td', null,
                  //   React.createElement('span', { style: { color: '#64748b', fontSize: '12px' } },
                  //     'EVOX Support'
                  //   )
                  // )
                );
              })
            )
          ),
          React.createElement('div', { className: 'ticket-pagination' },
            React.createElement(Pagination, {
              pagination: pagination,
              onPageChange: onPageChange
            })
          )
        )
    )
  );
};

// TICKET DETAILS PAGE - Professional Version
const TicketDetailsPage = function (props) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  var ticket = props.ticket;
  var onBack = props.onBack;
  var useremail = props.useremail;

  var [conversations, setConversations] = useState([]);
  var [reply, setReply] = useState('');
  var [loading, setLoading] = useState(false);
  var [conversationsLoading, setConversationsLoading] = useState(false);
  var [attachment, setAttachment] = useState({
    attachments: [],
    attachmentsValues: [],
    removedAttachments: []
  });
  var [attachments, setAttachments] = useState([]);
  var [attachmentsValues, setAttachmentsValues] = useState([]);
  var [removedAttachments, setRemovedAttachments] = useState([]);

  useEffect(function () {
    if (!ticket.id) return;

    var ticketId = parseInt(ticket.id);
    if (isNaN(ticketId) || ticketId <= 0) return;

    console.log('🔄 Loading conversations for ticket:', ticketId);
    setConversationsLoading(true);

    API.call({
      method: "get",
      url: "/freshservice/tickets/" + ticketId + "/conversations/"
    })
      .then((result) => {
        console.log('✅ Conversations loaded successfully');
        setConversations(result.data.content.conversations || []);
      })
      .catch((e) => {
        console.error('❌ Failed to load conversations:', e);
        dispatch(Formatter.alert_error(e));
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

    var replyData = {
      body: reply,
      attachments: attachmentsValues,
      removed_attachments: removedAttachments,
      requester_id: ticket.requester_id
    }

    API.call({
      method: "post",
      url: "/freshservice/tickets/" + id + "/reply",
      data: replyData
    })
      .then((result) => {
        setReply('');
        setAttachment({
          attachments: [],
          attachmentsValues: [],
          removedAttachments: []
        });
        return API.call({
          method: "get",
          url: "/freshservice/tickets/" + id + "/conversations/"
        })
          .then((result) => {
            console.log('✅ Conversations loaded successfully');
            setConversations(result.data.content.conversations || []);
          })
          .catch((e) => {
            console.error('❌ Failed to load conversations:', e);
            dispatch(Formatter.alert_error(e));
          })
          .finally(function () {
            setConversationsLoading(false);
          });
      })
      .catch((e) => {
        console.error('Reply failed:', e);
        // if (e.status === 401) {
        //   dispatch({'type': 'SHOW_MODAL_LOGIN'})
        // }
        dispatch(Formatter.alert_error(e));
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
            React.createElement('div', {
              dangerouslySetInnerHTML: { __html: ticket.description || 'No description provided' }
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
                    //React.createElement('span', { className: 'conversation-user' }, 'User ' + conv.user_id),
                    React.createElement('span', { className: 'conversation-date' },
                      formatDate(conv.createdAt || conv.created_at))
                  ),
                  // React.createElement('div', { className: 'conversation-body' },
                  //   React.createElement(SafeTextRenderer, {
                  //     text: conv.bodyText || conv.body || 'No content'
                  //   })
                  // )
                  React.createElement('div', {
                    className: 'conversation-body',
                    dangerouslySetInnerHTML: { __html: conv.bodyText || conv.body || 'No content' }
                  })
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
            <Editor
              apiKey="nwf6jspi93459hl7io117u8tqtutub6tk18jw7kamd4hujd7"
              textareaName="content"
              value={reply}
              onEditorChange={(newContent, editor) => setReply(newContent)}
              init={{
                height: 500,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'emoticons',
                  'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks',
                  'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],

                toolbar: 'undo redo | casechange blocks fontfamily fontsize | bold italic forecolor backcolor removeformat emoticons | image | ' +
                  'alignleft aligncenter alignright alignjustify | link | ' +
                  'bullist numlist checklist outdent indent | removeformat | help ',

                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                paste_data_images: true,
                automatic_uploads: true,
                images_upload_handler: handleImageUpload,
                images_reuse_filename: false,
                relative_urls: false,
                remove_script_host: false,
                document_base_url: process.env.REACT_APP_STORAGE_URL,
              }}
            />,

            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Attachments'),
              React.createElement('input', {
                type: 'file',
                className: 'form-input',
                multiple: false,
                ref: fileInputRef,
                onChange: function (e) {
                  setLoading(true);
                  const newFiles = Array.from(e.target.files);
                  const attachmentData = new FormData();

                  attachmentData.append('ticket_id', ticket.id);
                  attachmentData.append('workspace_id', ticket.workspace_id);
                  attachmentData.append("attachment", newFiles[0]);

                  API.call({
                    method: "post",
                    url: "/freshservice/tickets/attachments/",
                    data: attachmentData
                  })
                    .then((result) => {
                      setAttachments([...attachments, ...newFiles]);
                      setAttachmentsValues([...attachmentsValues, result.data.content.files[0]]);
                    })
                    .catch((e) => {
                      dispatch(Formatter.alert_error(e));
                    })
                    .finally(function () {
                      setLoading(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    });
                }
              }),
              // errors.attachments && React.createElement('div', { className: 'error-message' },
              //   '⚠️ ' + errors.attachments
              // )
            ),
            attachments.length > 0 && React.createElement('ul', { className: 'attachments-list-fs' },
              attachments.map((file, index) =>
                React.createElement('li', { key: index },
                  file.name,
                  React.createElement('button', {
                    className: 'attachment-remove-btn-fs',
                    type: 'button',
                    onClick: function () {
                      const updatedFiles = attachments.filter((_, i) => i !== index);
                      setAttachments(updatedFiles);
                      setRemovedAttachments([...removedAttachments, attachmentsValues[index]]);
                      const updatedValues = attachmentsValues.filter((_, i) => i !== index);
                      setAttachmentsValues(updatedValues);
                    }
                  }, '❌')
                )
              )
            ),

            React.createElement('button', {
              type: 'submit',
              className: 'btn-fs',
              disabled: loading || !reply.trim(),
              style: { marginTop: '12px' }
            }, loading ? 'Adding Reply...' : 'Add Reply')
          )
        )
      )
    )
  );
};

const FreshServiceTickets = (props) => {
  const dispatch = useDispatch();
  var [currentView, setCurrentView] = useState('list');
  var [selectedTicket, setSelectedTicket] = useState(null);

  var [workspaces, setWorkspaces] = useState([]);
  var [tickets, setTickets] = useState([]);
  var [pagination, setPagination] = useState(null);
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
    API.call({
      method: "get",
      url: "/freshservice/workspaces/",
    })
      .then((result) => {
        var activeWorkspaces = (result.data.content || []).filter(function (ws) {
          return ws.state === 'active';
        });
        setWorkspaces(activeWorkspaces);
        setCategoriesLoaded(true);
        console.log('✅ Workspaces loaded');
      })
      .catch((e) => {
        setCategoriesLoaded(true);
        console.error('❌ Failed to load workspaces:', e);
        dispatch(Formatter.alert_error(e));
      });
  }, []);

  // Load tickets when filters change
  var loadTickets = useCallback(function (page = null) {
    console.log('🔄 Loading tickets');
    setTicketsLoading(true);
    setTicketsError(null);

    var params = new URLSearchParams({
      status: filters.status,
      page: page ?? '1',
      limit: '100',
      userEmail: props.user.email
    });

    if (filters.workspaceId) {
      params.append('workspaceId', filters.workspaceId);
    }

    API.call({
      method: "get",
      url: "/freshservice/tickets/my-tickets?" + params.toString(),
    })
      .then((result) => {
        setTickets(result.data.content.tickets || []);
        setPagination(result.data.content.pagination || null)
        console.log('✅ Tickets loaded');
      })
      .catch((e) => {
        console.error('❌ Failed to load tickets:', e);
        setTicketsError(e.message);
        dispatch(Formatter.alert_error(e));
      })
      .finally(function () {
        setTicketsLoading(false);
      });
  }, [filters.status, filters.workspaceId, props.user.email]);

  useEffect(function () {
    if (currentView === 'list') {
      loadTickets();
    }
  }, [loadTickets, currentView]);

  // Event handlers
  var handleTicketSelect = useCallback(function (ticket) {
    setSelectedTicket(ticket);
    setCurrentView('details');
  }, []);

  var handleBackToList = useCallback(function () {
    setCurrentView('list');
    setSelectedTicket(null);
  }, []);

  var onPageChange = useCallback(function (page = null) {
    loadTickets(page);
  }, []);

  var handleFilterChange = useCallback(function (field, value) {
    setFilters(function (prev) {
      return { ...prev, [field]: value };
    });
  }, []);

  return (
    <>
      <Wrapper>
        <ContainerWrapper>
          <ContainerBody>
            <Content>
              {React.createElement('div', { className: 'app-fs' },
                React.createElement('main', { className: 'main-fs' },
                  !categoriesLoaded ?
                    React.createElement('div', { className: 'loading' },
                      React.createElement('span', { className: 'spinner' }),
                      'Loading workspace categories...'
                    ) :
                    currentView === 'list' ? React.createElement(TicketListPage, {
                      tickets: tickets,
                      pagination: pagination,
                      onPageChange: onPageChange,
                      workspaces: workspaces,
                      onTicketSelect: handleTicketSelect,
                      onFilterChange: handleFilterChange,
                      filters: filters,
                      loading: ticketsLoading,
                      error: ticketsError,
                      useremail: props.user.email
                    }) :
                      currentView === 'details' && selectedTicket ? React.createElement(TicketDetailsPage, {
                        ticket: selectedTicket,
                        onBack: handleBackToList,
                        useremail: props.user.email
                      }) : null
                )
              )}
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    </>
  )
}

export default FreshServiceTickets