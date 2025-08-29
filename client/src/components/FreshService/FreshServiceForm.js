import React, { useState, useEffect, useRef, useCallback } from "react"
import { connect, useDispatch } from 'react-redux'
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import "./FreshService.css";
import { Editor } from '@tinymce/tinymce-react';
import { handleImageUpload } from '../../services/Helper';
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { fetchWorkSpaces } from '../../store/actions/freshservice/freshServiceActions';

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
  }

  if (data.selectedWorkspace && WORKSPACE_CATEGORIES[data.selectedWorkspace]) {
    const allSubCategories = Object.keys(WORKSPACE_CATEGORIES[data.selectedWorkspace]);
    const availableSubCategories = allSubCategories.filter(function (subCategory) {
      return subCategory !== data.selectedWorkspace;
    });

    if (availableSubCategories.length > 0 && !data.selectedSubCategory) {
      errors.selectedSubCategory = 'Category must be selected';
    } else if (data.selectedSubCategory && !availableSubCategories.includes(data.selectedSubCategory)) {
      errors.selectedSubCategory = 'Invalid category selected';
    }
  }

  if (data.selectedWorkspace && data.selectedSubCategory && WORKSPACE_CATEGORIES[data.selectedWorkspace]) {
    const itemCategories = WORKSPACE_CATEGORIES[data.selectedWorkspace][data.selectedSubCategory] || [];
    if (itemCategories.length > 1 && !data.selectedItemCategory) {
      errors.selectedItemCategory = 'Sub-category must be selected';
    } else if (data.selectedItemCategory && !itemCategories.includes(data.selectedItemCategory)) {
      errors.selectedItemCategory = 'Invalid sub-category selected';
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
  const workspaces = props.workspaces || [];
  const defaultSignature = `
    <br><br>
    Best Regards,<br>
    <strong>${props.user.first_name + ' ' + props.user.last_name}</strong><br>
    <span style="display: inline-block;">${props.user.department_main}</span><br>
    <span style="display: inline-block;">Employee ID: ${props.user.emp_num}</span><br>
    <span style="display: inline-block;">Country: ${props.user.country}</span>
  `;

  var [formData, setFormData] = useState({
    subject: '',
    userSubject: '',
    description: '',
    priority: 2,
    selectedWorkspaceId: '',
    selectedSubCategoryId: '',
    selectedItemCategoryId: '',
    selectedWorkspace: '',
    selectedSubCategory: '',
    selectedItemCategory: '',
    attachments: [],
    attachmentsValues: [],
    removedAttachments: [],
    subCategoriesList: [],
    itemCategoriesList: [],
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

  const fileInputRef = useRef(null);

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
        description: formData.description,
        priority: parseInt(formData.priority),
        status: 2,
        workspace_id: formData.selectedWorkspaceId,
        attachments: formData.attachmentsValues,
        removed_attachments: formData.removedAttachments
      };

      API.call({
        method: "post",
        url: "/freshservice/tickets",
        data: ticketData
      })
        .then((result) => {
          setSuccess(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setFormData({
            subject: '',
            userSubject: '',
            description: defaultSignature,
            priority: 2,
            selectedWorkspaceId: '',
            selectedSubCategoryId: '',
            selectedItemCategoryId: '',
            selectedWorkspace: '',
            selectedSubCategory: '',
            selectedItemCategory: '',
            attachments: [],
            attachmentsValues: [],
            removedAttachments: [],
            subCategoriesList: [],
            itemCategoriesList: [],
          });
          setTimeout(function () { setSuccess(false); }, 3000);
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        })
        .finally(function () {
          setLoading(false);
        });
    }
  };

  var subCategoryOptions = formData.selectedWorkspace && formData.subCategoriesList
    ? formData.subCategoriesList.map(function (subcategory) {
        return {
          Id: subcategory.Id,
          CategoryName: subcategory.CategoryName
        };
      })
    : [];

  var itemCategoryOptions = (formData.selectedWorkspace && formData.selectedSubCategory && formData.itemCategoriesList)
    ? formData.itemCategoriesList.map(function (itemcategory) {
        return {
          Id: itemcategory.Id,
          SubCategoryName: itemcategory.SubCategoryName
        };
      })
    : [];

  return React.createElement('div', { className: 'card-fs' },
    React.createElement('div', { className: 'card-header-fs' },
      React.createElement('h2', { className: 'card-title-fs' }, 'Create New Ticket')
    ),

    React.createElement('div', { className: 'card-content-fs' },
      success && React.createElement('div', { className: 'success-message' },
        '✅ Thanks! EV Assist has logged your request. Our team will be in touch shortly.'
      ),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'EV Department *'),
          React.createElement('select', {
            className: 'form-select',
            value: formData.selectedWorkspaceId,
            onChange: function (e) {
              const selectedText = e.target.options[e.target.selectedIndex].text;
              updateField('selectedWorkspace', selectedText);
              updateField('selectedWorkspaceId', e.target.value);
              updateField('subCategoriesList', props.categories[e.target.value]);
            }
          },
            React.createElement('option', { value: '' }, 'Select Department'),
            workspaces.map(function (workSpaceOption) {
              return React.createElement('option', { key: workSpaceOption.Id, value: workSpaceOption.Id }, workSpaceOption.Name);
            })
          ),
          errors.selectedWorkspace && React.createElement('div', { className: 'error-message' },
            '⚠️ ' + errors.selectedWorkspace
          )
        ),

        formData.selectedWorkspace && subCategoryOptions.length > 0 && React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Category *'),
          React.createElement('select', {
            className: 'form-select',
            value: formData.selectedSubCategoryId,
            onChange: function (e) {
              const selectedText = e.target.options[e.target.selectedIndex].text;
              updateField('selectedSubCategory', selectedText);
              updateField('selectedSubCategoryId', e.target.value);
              updateField('itemCategoriesList', props.sub_categories[e.target.value]);
            }
          },
            React.createElement('option', { value: '' }, 'Select Category'),
            subCategoryOptions.map(function (subCategory) {
              return React.createElement('option', { key: subCategory.Id, value: subCategory.Id }, subCategory.CategoryName);
            })
          ),
          errors.selectedSubCategory && React.createElement('div', { className: 'error-message' },
            '⚠️ ' + errors.selectedSubCategory
          )
        ),

        formData.selectedSubCategoryId && itemCategoryOptions.length > 0 && React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Sub-category'),
          React.createElement('select', {
            className: 'form-select',
            value: formData.selectedItemCategoryId,
            onChange: function (e) {
              const selectedText = e.target.options[e.target.selectedIndex].text;
              updateField('selectedItemCategory', selectedText);
              updateField('selectedItemCategoryId', e.target.value);
            }
          },
            React.createElement('option', { value: '' }, 'Select Sub-category'),
            itemCategoryOptions.map(function (itemCategory, index) {
              return React.createElement('option', { key: itemCategory.Id, value: itemCategory.Id }, itemCategory.SubCategoryName || '(No specific category)');
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
            placeholder: 'Brief description',
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
            onInit={(evt, editor) => {
              if (!formData.description || formData.description.trim() === '') {
                editor.setContent(defaultSignature);
                updateField('description', defaultSignature);
              }
            }}
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

        formData.selectedWorkspace ? React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Attachments'),
          React.createElement('input', {
            type: 'file',
            className: 'form-input',
            multiple: false,
            ref: fileInputRef,
            accept: '.jpg, .jpeg, .png, .pdf, .csv, .xls, .xlsx',
            onChange: function (e) {
              setLoading(true);
              const newFiles = Array.from(e.target.files);
              const attachmentData = new FormData();

              attachmentData.append('workspace_id', formData.selectedWorkspaceId);
              attachmentData.append("attachment", newFiles[0]);

              API.call({
                method: "post",
                url: "/freshservice/tickets/attachments/",
                data: attachmentData
              })
                .then((result) => {
                  updateField('attachments', [...formData.attachments, ...newFiles]);
                  updateField('attachmentsValues', [...formData.attachmentsValues, result.data.content.files[0]]);
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
          errors.attachments && React.createElement('div', { className: 'error-message' },
            '⚠️ ' + errors.attachments
          )
        ) : null,
        formData.attachments.length > 0 && React.createElement('ul', { className: 'attachments-list-fs' },
          formData.attachments.map((file, index) =>
            React.createElement('li', { key: index },
              file.name,
              React.createElement('button', {
                className: 'attachment-remove-btn-fs',
                type: 'button',
                onClick: function () {
                  const updatedFiles = formData.attachments.filter((_, i) => i !== index);
                  updateField('attachments', updatedFiles);
                  updateField('removedAttachments', [...formData.removedAttachments, formData.attachmentsValues[index]]);
                  const updatedValues = formData.attachmentsValues.filter((_, i) => i !== index);
                  updateField('attachmentsValues', updatedValues);
                }
              }, '❌')
            )
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
        }, loading ? 'Creating...' : 'Create a Ticket'),

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

  // Load workspaces
  useEffect(() => {
    dispatch(fetchWorkSpaces());
  }, []);

  return (
    <>
      <Wrapper>
        <ContainerWrapper>
          <ContainerBody>
            <Content>
              <div className="app-fs">
                <main className="main-fs">
                  {!props.workspacesLoaded ? (
                    <div className="loading">
                      <span className="spinner"></span>
                      Loading workspace categories...
                    </div>
                  ) : (
                    currentView === 'create' && props.workspaces.length > 0 && (
                      <CreateTicketPage
                        workspaces={props.workspaces}
                        categories={props.categories}
                        sub_categories={props.sub_categories}
                        useremail={props.user.email}
                        user={props.user}
                      />
                    )
                  )}
                </main>
              </div>
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    </>
  )
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
    workspaces: state.freshService.workspaces,
    categories: state.freshService.categories,
    sub_categories: state.freshService.sub_categories,
    workspacesLoaded: state.freshService.isInstanceLoaded
  };
};

export default connect(mapStateToProps)(FreshServiceForm);