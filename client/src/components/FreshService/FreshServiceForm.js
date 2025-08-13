import React, { useState, useEffect, useCallback } from "react"
import { useDispatch } from 'react-redux'
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import "./FreshService.css";
import { Editor } from '@tinymce/tinymce-react';
import { handleImageUpload } from '../../services/Helper';
import API from "../../services/API";
import Formatter from "../../services/Formatter";

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
    // errors.description = 'Description must be less than 4000 characters';
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
    const availableSubCategories = allSubCategories.filter(function (subCategory) {
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
  const dispatch = useDispatch();
  var workspaces = props.workspaces;
  // var useremail = props.useremail;

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

      const ticketWorkSpace = workspaces.find(ws => ws.name === formData.selectedWorkspace);
      const selectedWorkSpaceId = ticketWorkSpace ? ticketWorkSpace.id : null;

      var ticketData = {
        subject: sanitizeInput(formData.subject),
        description: formData.description,
        priority: parseInt(formData.priority),
        status: 2,
        workspace_id: selectedWorkSpaceId
      };

      API.call({
        method: "post",
        url: "/freshservice/tickets",
        data: ticketData
      })
        .then((result) => {
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
        })
        .catch((e) => {
          /*setErrors({ submit: e.message });
          if (e.status === 401) {
            dispatch({'type': 'SHOW_MODAL_LOGIN'})
          }*/
          dispatch(Formatter.alert_error(e));
        })
        .finally(function () {
          setLoading(false);
        });
    }
  };

  var workspaceOptions = workspaces.map(function (ws) { return ws.name; });

  var subCategoryOptions = formData.selectedWorkspace && WORKSPACE_CATEGORIES[formData.selectedWorkspace]
    ? Object.keys(WORKSPACE_CATEGORIES[formData.selectedWorkspace]).filter(function (subCategory) {
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
          <Editor
            apiKey="nwf6jspi93459hl7io117u8tqtutub6tk18jw7kamd4hujd7"
            textareaName="content"
            value={formData.description}
            onEditorChange={(content, editor) => updateField('description', content)}
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
          className: 'btn-fs',
          disabled: loading
        }, loading ? 'Creating...' : 'Create Ticket'),

        errors.submit && React.createElement('div', { className: 'error-message' },
          '❌ ' + errors.submit
        )
      )
    )
  );
};

const FreshServiceForm = (props) => {
  const dispatch = useDispatch();
  var [currentView, setCurrentView] = useState('create');
  var [workspaces, setWorkspaces] = useState([]);
  var [filters, setFilters] = useState({
    workspaceId: '',
    status: 'all'
  });
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
                    currentView === 'create' ? React.createElement(CreateTicketPage, {
                      workspaces: workspaces,
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

export default FreshServiceForm