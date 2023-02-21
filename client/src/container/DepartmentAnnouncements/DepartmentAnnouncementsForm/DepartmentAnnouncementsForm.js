import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import moment from 'moment';

import "./DepartmentAnnouncementsForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";
import { createDepartmentAnnouncement, fetchDepartmentAnnouncement } from '../../../store/actions/announcement/departmentAnnouncementActions';

import { setRedirect } from '../../../store/actions/redirectActions';
import { Editor } from '@tinymce/tinymce-react';

import Wrapper from "../../../components/Template/Wrapper";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import BackButton from "../../../components/Template/BackButton";

class DepartmentAnnouncementsForm extends Component {
  constructor(props){
    super(props)

    this.initialState = {
        content : null,
        thumbnail: null,
        imgPrevInputFile: '/thumbnail/defthumb.jpg'
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
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }
    console.log(formData);
    // Checks on what action to use depending on the values.action
    if (values.method == "store") {
      if (window.confirm("Are you sure you want to submit this change log?")) {
        if (this.state.thumbnail != null) {
          formData.set('thumbnail', this.state.thumbnail);
          
      }
        switch( values.method ) {
          case "store":
              this.props.createDepartmentAnnouncement( formData );
              this.setState({ thumbnail: null });
              this.setState({ imgPrevInputFile: '/thumbnail/defthumb.jpg' });
              break;
          default:
              break;

        }
      }
    }
  }

  componentWillMount(){
      // console.log(this.props.params.id);
    if( this.props.params.id != undefined ) {

      this.props.fetchDepartmentAnnouncement( this.props.params.id )
    }
}

  handleEditorChange(e) {
    this.setState({ content : e });
  }

  render = () => {
    // Sets the Method of the current state.
    const method = (this.props.params.id != undefined) ? 'update' : 'store'
    var today = new Date();
    console.log(today, moment().format('MMMM d, yyyy'));
    console.log(this.props.instance);
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        id:           this.props.instance?.id != undefined ? new Date( this.props.instance.id ) : null,
        // log_date:           this.props.instance?.log_date != undefined ? new Date( this.props.instance.log_date ) : null,
        release_date:           this.props.instance?.release_date != undefined ? new Date( this.props.instance.release_date ) : null,
        title:              this.props.instance?.title != undefined ? this.props.instance.title : null,
        headline:              this.props.instance?.headline != undefined ? this.props.instance.headline : null,
        content:        this.props.instance?.content != undefined ? this.props.instance.content : null,
        category:           this.props.instance?.category != undefined ? this.props.instance.category : null,
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
                            <FormControl variant="primary" name="headline" className="headline" onChange={handleChange} value={values.headline} />
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.headline && touched.headline && errors.headline}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                    {/* <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Category:</label>
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
                    </Col> */}
                    
                    {/* <Col size ="3">
                    

                    </Col> */}
                    {/* <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Date:</label>
                        <InputDate name="log_date" value={values.log_date}/>
                      </div>
                    </Col> */}

                  </Row>
                  <Row>
                    <Col size="2 dep-announcement-col">
                            <div className="feature-checkbox">

                            
                            <label className ="dep-announcement-label"> Featured Anncouncement</label>
                            <input id="featuredOption" type="checkbox" className="" variant="primary" name="featured" value={values.featured}
                                // onChange={handleChange}
                                onChange={() => setFieldValue('featured', values.featured == 1 ? 0 : 1)}
                                checked={values.featured === 1 ? true : false}
                            />
                            <br/>
                            <label className ="dep-announcement-label"> Publish</label>
                            <input id="featuredOption" type="checkbox" className="" variant="primary" name="featured" value={values.featured}
                                // onChange={handleChange}
                                onChange={() => setFieldValue('featured', values.featured == 1 ? 0 : 1)}
                                checked={values.featured === 1 ? true : false}
                            />
                            </div>
                            
                    </Col>
                    {/* <Col size="3 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Seen By:</label>
                        <select name="exposure_level" value={ values.exposure_level } className="form-control" onChange={handleChange}>
                            <option></option>
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
                  </Row>
                  <Row>
                  <Col size="2 dep-announcement-col">
                                                <label className ="dep-announcement-label">Thumbnail </label>
                                                <InputGroup >
                                                    <Form.Control name="thumbnail" type="file" onChange={(event) => {
                                                        if (event.currentTarget.files.length !== 0) {
                                                            this.setState({ thumbnail: event.currentTarget.files[0] })
                                                            this.setState({ imgPrevInputFile: URL.createObjectURL(event.currentTarget.files[0]) })
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
                
                  {/* <Row>
                    <Col size="7 dep-announcement-col">
                    <div className="form-group">
                        <label className ="dep-announcement-label">Redirect to External link:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="link" className="link" onChange={handleChange} value={values.link} />
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.link && touched.link && errors.link}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                  </Row> */}
                
                  <Row>
                    <Col size="12">
                      <div className="form-group">
                        <label className = "dep-announcement-label  dep-announcement-col">Content:</label>
                        {/* <textarea className="form-control" rows="10" name="content" onChange={handleChange} value={values.content??''} placeholder="Change log summary..."></textarea> */}
                        <Editor
                          // onInit={(evt, editor) => editorRef.current = editor}
                          apiKey="nwf6jspi93459hl7io117u8tqtutub6tk18jw7kamd4hujd7"
                          textareaName="content"
                          initialValue={values.content ?? ''}
                          onEditorChange={(e) => { this.handleEditorChange(e); }}
                          init={{
                            height: 500,
                            menubar: false,
                            plugins: [
                              'a11ychecker','advlist','advcode','advtable','autolink','checklist','export', 'emoticons',
                              'lists','link','image','charmap','preview','anchor','searchreplace','visualblocks',
                              'powerpaste','fullscreen','formatpainter','insertdatetime','media','table','help','wordcount'
                           ],
                           paste_preprocess: function (plugin, args) {
                            // console.log("Attempted to paste: ", args.content);
                            // replace copied text with empty string
                            args.content = '';
                        },
                            toolbar: 'undo redo | casechange blocks | bold italic backcolor emoticons | ' +
                            'alignleft aligncenter alignright alignjustify | ' +
                            'bullist numlist checklist outdent indent | removeformat | help',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                          }}
                        />
                        {/* <Form.Control.Feedback type="invalid">
                          &nbsp;{errors.content && touched.content && errors.content}
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
    // category      : Yup.string().required("This field is required").nullable(),
    // content   : Yup.string().required("This field is required").nullable(),
    // log_date      : Yup.date().required("This field is required").nullable(),
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
      fetchDepartmentAnnouncement        : ( id ) => dispatch( fetchDepartmentAnnouncement( id ) ),
      createDepartmentAnnouncement : ( post_data ) => dispatch( createDepartmentAnnouncement( post_data ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(DepartmentAnnouncementsForm);








