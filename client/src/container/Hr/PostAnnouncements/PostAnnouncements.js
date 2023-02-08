import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import moment from 'moment';

import "./PostAnnouncements.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { addChangeLogs } from '../../../store/actions/admin/changeLogsActions';
import { fetchHrAnnouncements, addHrAnnouncements } from '../../../store/actions/hr/hrAnnouncementsActions';

import { setRedirect } from '../../../store/actions/redirectActions';
import { Editor } from '@tinymce/tinymce-react';

import Wrapper from "../../../components/Template/Wrapper";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import BackButton from "../../../components/Template/BackButton";

class PostAnnouncements extends Component {
  constructor(props){
    super(props)

    this.initialState = {
        description : null,
    }
    this.state = this.initialState; 

    this.handleEditorChange = this.handleEditorChange.bind(this);
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {
    values['description'] = this.state.description;

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    for (var key in values) {
      if( values[key] != null ) {
        switch( key ) {
          case "log_date":
            formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
            break;
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }

    // Checks on what action to use depending on the values.action
    if (values.method == "store") {
      if (window.confirm("Are you sure you want to submit this change log?")) {
        switch( values.method ) {
          case "store":
              this.props.addChangeLogs( formData );
              break;
          default:
              break;

        }
      }
    }
  }

  handleEditorChange(e) {
    this.setState({ description : e });
  }

  render = () => {
    // Sets the Method of the current state.
    const method = 'store';

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        log_date:           this.props.instance.log_date != undefined ? new Date( this.props.instance.log_date ) : null,
        title:              this.props.instance.title != undefined ? this.props.instance.title : null,
        description:        this.props.instance.description != undefined ? this.props.instance.description : null,
        category:           this.props.instance.category != undefined ? this.props.instance.category : null,
    }

    // Sets the default title for the Request. Checks aswell if it's for approval.
    let title = 'HR Announcement Form';

    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){

      return <Wrapper {...this.props} >
        <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler}
        validationSchema={validationSchema} 
        initialValues={initialValue}
        >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange,handleEditorChange}) => (
        
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="action" value={values.action} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="date" value={values.log_date} />
            <input type="hidden" name="id"  value={values.id} />
            <input type="hidden" name="status"  value={values.status} />
            <ContainerWrapper>
              <ContainerBody>
                <Content col="12" title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                  <Row>
                    <Col size="3">
                      <div className="form-group">
                        <label>Title:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="title" className="title" onChange={handleChange} value={values.title} />
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.title && touched.title && errors.title}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                    <Col size="3">
                      <div className="form-group">
                        <label>Category:</label>
                        <select name="category" value={ values.category } className="form-control" onChange={handleChange}>
                            <option></option>
                            <option value="Announcements">Announcements</option>
                            <option value="Updates">Updates</option>
                            <option value="Release Notes">Release Notes</option>
                        </select>
                        <Form.Control.Feedback type="invalid">
                            &nbsp;{errors.category && touched.category && errors.category}
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                    <Col size="3">
                      <div className="form-group">
                        <label>Date:</label>
                        <InputDate name="log_date" value={values.log_date}/>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col size="12">
                      <div className="form-group">
                        <label>Description:</label>
                        {/* <textarea className="form-control" rows="10" name="description" onChange={handleChange} value={values.description??''} placeholder="Change log summary..."></textarea> */}
                        <Editor
                          // onInit={(evt, editor) => editorRef.current = editor}
                          apiKey="nwf6jspi93459hl7io117u8tqtutub6tk18jw7kamd4hujd7"
                          textareaName="description"
                          initialValue={values.description ?? ''}
                          onEditorChange={(e) => { this.handleEditorChange(e); }}
                          init={{
                            height: 500,
                            menubar: false,
                            plugins: [
                              'a11ychecker','advlist','advcode','advtable','autolink','checklist','export', 'emoticons',
                              'lists','link','image','charmap','preview','anchor','searchreplace','visualblocks',
                              'powerpaste','fullscreen','formatpainter','insertdatetime','media','table','help','wordcount'
                           ],
                            toolbar: 'undo redo | casechange blocks | bold italic backcolor emoticons | ' +
                            'alignleft aligncenter alignright alignjustify | ' +
                            'bullist numlist checklist outdent indent | removeformat | help',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                          }}
                        />
                        {/* <Form.Control.Feedback type="invalid">
                          &nbsp;{errors.description && touched.description && errors.description}
                        </Form.Control.Feedback> */}
                      </div>
                    </Col>
                  </Row>

                  <span>
                    <Button type="submit" className="btn btn-primary" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}>
                      <i className="fa fa-location-arrow" /> Submit
                    </Button>&nbsp;
                    <BackButton style={{'float': 'right'}} {...this.props} />
                  </span>
                  
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
    
      </Formik>
      </Wrapper>
    
    }
    return <PageLoading/>;
  }
}
/** Form Validation */

const validationSchema = Yup.object().shape({
    title         : Yup.string().required("This field is required").nullable(),
    category      : Yup.string().required("This field is required").nullable(),
    // description   : Yup.string().required("This field is required").nullable(),
    log_date      : Yup.date().required("This field is required").nullable(),
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.restDayWork.instance,
    isInstanceLoaded  : state.restDayWork.isInstanceLoaded,
		user			        : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      // addRestDayWork        : ( post_data ) => dispatch( addRestDayWork( post_data ) ),
      addChangeLogs : ( post_data ) => dispatch( addChangeLogs( post_data ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(PostAnnouncements);








