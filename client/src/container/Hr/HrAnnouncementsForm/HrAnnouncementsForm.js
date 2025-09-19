import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import moment from 'moment';

import "./HrAnnouncementsForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";
import { createHrAnnouncement, fetchHrAnnouncementStrict, updateHrAnnouncement, clearHrAnnouncementInstance } from '../../../store/actions/announcement/hrAnnouncementActions';

import { setRedirect } from '../../../store/actions/redirectActions';
import { Editor } from '@tinymce/tinymce-react';

import Wrapper from "../../../components/Template/Wrapper";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import BackButton from "../../../components/Template/BackButton";

class HrAnnouncementsForm extends Component {
  constructor(props){
    super(props)
    console.log(window.location.pathname);
    console.log(window.location.pathname);
    this.initialState = {
        content : null,
        thumbnail: null,
        imgPrevInputFile: '/thumbnail/defthumb.jpg',
        inputFileWasUpdated: false
        
    }
    this.state = this.initialState; 

    this.handleEditorChange = this.handleEditorChange.bind(this);
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {
    values['content'] = this.state.content;

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    for (var key in values) {
      if( values[key] != null ) {
        switch( key ) {
          case "log_date":
            formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
            break;
            case "release_date":
              formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
              break;
              case "expiry_date":
                formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
                break;
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }
    formData.set('category', "HR");
    // Checks on what action to use depending on the values.action
    if (values.method) {
    
        switch( values.method ) {
          case "store":
            console.log(formData);
            if (window.confirm("Are you sure you want to submit this Announcement?")) {
              
              if (this.state.thumbnail != null) {
                formData.set('thumbnail', this.state.thumbnail);
              }
              
            this.props.createHrAnnouncement( formData );
            this.setState({ thumbnail: null });
            this.setState({ imgPrevInputFile: '/thumbnail/defthumb.jpg' });
          }
            
              break;
            case "update":
              
              if (window.confirm("Are you sure you want to update this Announcement?")) {
                
                if (this.state.thumbnail != null) {
                  if(this.state.inputFileWasUpdated){
                    formData.set('thumbnail', this.state.thumbnail);
                  }
              }
              this.props.updateHrAnnouncement( values.id, formData );
              this.setState({ thumbnail: null });
              this.setState({ imgPrevInputFile: '/thumbnail/defthumb.jpg' });
            }
             
              break;
          default:
              break;

        }
      
    }
  }

  componentWillMount(){
    this.props.clearHrAnnouncementInstance();
    if( this.props.params.id != undefined ) {

      this.props.fetchHrAnnouncementStrict( this.props.params.id )
    }
}

  handleEditorChange(e) {
    this.setState({ content : e });
  }

  render = () => {

    const method = (this.props.params.id != undefined) ? 'update' : 'store'

    var today = new Date();

    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance?.id != undefined  && method == "update" ? this.props.instance.id  : null,
        // log_date:        this.props.instance?.log_date != undefined  && method == "update" ? new Date( this.props.instance.log_date ) : null,
        release_date:       this.props.instance?.release_date != undefined  && method == "update" ? new Date( this.props.instance?.release_date ) : null,
        expiry_date:        this.props.instance?.expiry_date != undefined  && method == "update" ? new Date( this.props.instance?.expiry_date ) : null,
        title:              this.props.instance?.title != undefined  && method == "update" ? this.props.instance.title : null,
        headline:           this.props.instance?.headline != undefined  && method == "update" ? this.props.instance.headline : null,
        content:            this.props.instance?.content != undefined  && method == "update" ? this.props.instance.content : null,
        category:           this.props.instance?.category != undefined  && method == "update" ? this.props.instance.category : null,
    }
   
    let title = 'Announcement Form';

    if( (method == 'store') || ([ 'update'].includes( method ) && this.props.isInstanceLoaded) ){

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
                <Content col="12" title={title} subtitle={<RequestSubtitle method={method} 
                // user={this.props.instance.user} 
                />}>
                  <Row>
                    <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Title:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="title" className="title" onChange={handleChange} value={values.title} />
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.title && touched.title && errors.title}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                    <Col size="5 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Headline:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="headline" className="headline" onChange={handleChange} value={values.headline} placeholder="(Optional)"/>
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.headline && touched.headline && errors.headline}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                

                  </Row>
                  <Row>
{/*                   
                     <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Seen By:</label>
                        <select name="exposure_level" value={ values.exposure_level } className="form-control" onChange={handleChange}>

                            <option value="All Users">All Users</option>
                            <option value="My Account Only">My Account Only</option>
                            <option value="My Account Span">My Account Span</option>
                        </select>
                        <Form.Control.Feedback type="invalid">
                            &nbsp;{errors.exposure_level && touched.exposure_level && errors.exposure_level}
                        </Form.Control.Feedback>
                      </div>
                    </Col> */}

                
                    <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Release Date:</label>
                        <InputDate name="release_date" value={values.release_date}/>
                      </div>
                    </Col>
                    <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Expiry Date:</label>
                        <InputDate name="expiry_date" value={values.expiry_date}/>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                  <Col size="2 dep-announcement-col">
                                                <label className ="dep-announcement-label">Thumbnail </label>
                                                <InputGroup >
                                                    <Form.Control name="thumbnail" type="file" onChange={(event) => {
                                                        if (event.currentTarget.files.length !== 0) {
                                                            this.setState({ thumbnail: event.currentTarget.files[0] })
                                                            this.setState({ imgPrevInputFile: URL.createObjectURL(event.currentTarget.files[0]) })
                                                            if(method == 'update'){
                                                              this.setState({ inputFileWasUpdated: true })
                                                            }
                                                        }
                                                    }} />
                                                    <Form.Control.Feedback type="invalid">&nbsp;{errors.thumbnail && touched.thumbnail && errors.thumbnail}</Form.Control.Feedback>
                                                </InputGroup>
                                                
                                               

                    </Col>
                    <Col size="9 dep-announcement-col"> 
                              <div className="thumbnail-image">
                                  {(this.props?.instance?.thumbnail != null
                                      && this.state.imgPrevInputFile == '/thumbnail/defthumb.jpg')
                                      ? <img style={{ maxWidth: '100%' }} src={this.props?.instance?.thumbnail} />

                                     : <img style={{ maxWidth: '100%' }} src={this.state.imgPrevInputFile} />}
                                      
                              </div>
                    </Col>
                  </Row>
                
              
                
                  <Row>
                    <Col size="12">
                      <div className="form-group">
                        <label className = "dep-announcement-label  dep-announcement-col">Content:</label>
                      
                        <Editor
  
                          // apiKey="ooiknxilulphmr12emasyl0fguerpmwsxgmhq05ej7tm06c6"
                          tinymceScriptSrc='https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.3.1/tinymce.min.js'
                          licenseKey='gpl'
                          textareaName="content"
                          initialValue={values.content ?? ''}
                          onEditorChange={(e) => { this.handleEditorChange(e); }}
                          init={{
                            height: 500,
                            menubar: false,
                            plugins: [
                              'advlist','autolink', 'emoticons',
                              'lists','link','image','charmap','preview','anchor','searchreplace','visualblocks',
                              'fullscreen','insertdatetime','media','table','help','wordcount'
                           ],
 
                            toolbar: 'undo redo | casechange blocks fontfamily fontsize | bold italic forecolor backcolor removeformat emoticons | ' +
                            'alignleft aligncenter alignright alignjustify | link | ' +
                            'bullist numlist checklist outdent indent | removeformat | help ',

                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                          }}
                        />

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
  title         : Yup.string().required("This field is required").nullable().max(100, 'Max Title Length reached'),
  headline      : Yup.string().max(100, 'Max Headline Length reached').nullable(),
  // category      : Yup.string().required("This field is required").nullable(),
  // content   : Yup.string().required("This field is required").nullable(),
  // log_date      : Yup.date().required("This field is required").nullable(),
    //     expiry_date      : Yup.date().required("This field is required"),
    // release_date      : Yup.date().required("This field is required"),
    release_date: Yup.date().required("This field is required").nullable().max(Yup.ref('release_date'), 'Please select a Valid From date.'),
    expiry_date: Yup.date().required("This field is required").nullable().min(Yup.ref('expiry_date'), 'Please select a Valid To date.'),
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.departmentAnnouncement.instance,
    isInstanceLoaded  : state.departmentAnnouncement.isInstanceLoaded,
		user			        : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchHrAnnouncementStrict        : ( id ) => dispatch( fetchHrAnnouncementStrict( id ) ),
      clearHrAnnouncementInstance        : ( id ) => dispatch( clearHrAnnouncementInstance( id ) ),
      createHrAnnouncement : ( post_data ) => dispatch( createHrAnnouncement( post_data ) ),
      updateHrAnnouncement : ( id,post_data ) => dispatch( updateHrAnnouncement( id,post_data ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(HrAnnouncementsForm);








