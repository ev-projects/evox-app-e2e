import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl, Tabs,Tab, Badge, } from 'react-bootstrap';
import moment from 'moment';
import { useParams, useLocation, useHistory } from "react-router-dom";
import "./DepartmentAnnouncementsForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn,Field  } from 'formik';
import * as Yup from 'yup';
import MultiSelect from "react-multi-select-component";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";
import { createDepartmentAnnouncement, fetchDepartmentAnnouncementStrict, updateDepartmentAnnouncement, clearDepartmentAnnouncementInstance } from '../../../store/actions/announcement/departmentAnnouncementActions';
import {  fetchDepartmentList } from '../../../store/actions/lookup/lookupListActions';

import { setRedirect } from '../../../store/actions/redirectActions';
import { Editor } from '@tinymce/tinymce-react';

import Wrapper from "../../../components/Template/Wrapper";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import BackButton from "../../../components/Template/BackButton";
import Formatter from "../../../services/Formatter";

class DepartmentAnnouncementsForm extends Component {

  
  constructor(props){
   

    super(props)
    // localStorage.removeItem("joyride-local-announcement-form"); 
    var joyride_steps = [
      {
        target: ".dum",
        content: "dum",
      },
      {
        target: ".joyride-set-title",
        content: "Set the announcement Title.",
      },
      {
        target: ".joyride-set-dates",
        content: "Set your Dates of release and expiration.",
      },
      {
        target: ".joyride-set-dep",
        content: "Select to publish to all departments/country or limit it to a selected accounts or locations.",
      },
      {
        target: ".joyride-set-image",
        content: "Upload your image which is also its Thumbnail.",
      },
      {
        target: ".joyride-set-content-desc",
        content: (
          <div>
            <p>Set your announcement as a:</p>
            <ul>
              <li>Page: users access it as a page in EVOX, you cannout pload a video/image, but you can embed it</li>
              <li>Link: Redirects user to External Link</li>                    
            </ul> 
          </div>
        ),
      },
    
      
    ]

    var pre_run = true;
    if(localStorage.getItem("joyride-local-announcement-form") != null && localStorage.getItem("joyride-local-announcement-form") != undefined){
      var stored_local_session = JSON.parse(localStorage.getItem("joyride-local-announcement-form"));
    
      let date1 = new Date().getTime();
      let date2 = new Date(stored_local_session.local_expiration).getTime();
      
      console.log(date1 < date2, stored_local_session.step, joyride_steps.length-1);
      if(date1 < date2 && stored_local_session.step == joyride_steps.length-1){
       pre_run= false;
      }
      
    }

  // const location = useLocation();
    console.log(this.props.location?.originPath);

    this.initialState = {
        selectedDepartments: null,
        selectedCountries: null,
        content : null,
        thumbnail: null,
        imgPrevInputFile: '/thumbnail/defthumb.jpg',
        inputFileWasUpdated: false,
        inputFileWasDeleted: false,

        on_link : false,

        set_all : false,
        run:  pre_run,
        steps: joyride_steps,
        
        previewSample : false,
        previewSampleValues : {}
    }
    this.state = this.initialState; 

    this.handleEditorChange = this.handleEditorChange.bind(this);

  

    
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {
    values['content'] = this.state.content;
    console.log(this.state.selectedDepartments);

  
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
    
 
  
    formData.set('category', "Department");
    formData.set('inputFileWasDeleted', false);
    formData.set('on_link', this.state.on_link);
    formData.set('content', this.state.content != null ? this.state.content : null);
    values['set_all'] = values['set_all'] != null && values['set_all'] != undefined ?values['set_all'] : false;
    values['set_country_all'] = values['set_country_all'] != null && values['set_country_all'] != undefined ?values['set_country_all'] : false;

    formData.set('set_all', values['set_all'] == true ? 1: 0);
    // console.log(values["set_all"] ,values["set_all"] == false ,values["set_all"] == 0,values["set_all"] == "0");
        if(values["set_all"] == false || values["set_all"] == 0 || values["set_all"] == "0"){
          formData.set('selectedDepartments', this.state.selectedDepartments!= null?(Formatter.array_to_getvalue(this.state.selectedDepartments)).toString(): (Formatter.array_to_getvalue(values['selectedDepartments'])));
        }
    formData.set('set_country_all', values['set_country_all'] == true ? 1: 0);
    // console.log(values["set_country_all"] ,values["set_country_all"] == false ,values["set_country_all"] == 0,values["set_country_all"] == "0");
        // if(values["set_country_all"] == false || values["set_country_all"] == 0 || values["set_country_all"] == "0"){
        //   formData.set('selectedCountries', this.state.selectedCountries!= null?(Formatter.array_to_getvalue(this.state.selectedCountries)).toString(): (Formatter.array_to_getvalue(values['selectedCountries'])));
        // }
        // if(values["set_country_all"] == false || values["set_country_all"] == 0 || values["set_country_all"] == "0"){
        //   formData.set('country_id', this.state.selectedCountries!= null?(Formatter.array_to_getvalue(this.state.selectedCountries)).toString(): (Formatter.array_to_getvalue(values['selectedCountries'])));
        // }
        // console.log(formData)
    // Checks on what action to use depending on the values.action
    if (values.method) {
      
        switch( values.method ) {
          case "store":
            // console.log(formData, this.state.selectedDepartments, (Formatter.array_to_getvalue(this.state.selectedDepartments)).toString());
            if (window.confirm("Are you sure you want to submit this Announcement?")) {
              
              if (this.state.thumbnail != null) {
                formData.set('thumbnail', this.state.thumbnail);
              
            }
            this.props.createDepartmentAnnouncement( formData );
            this.setState({ thumbnail: null });
            this.setState({ imgPrevInputFile: '/thumbnail/defthumb.jpg' });
          }
            
              break;
            case "update":

            if( this.props.location?.originPath != undefined && this.props.location.originPath =="AdminAnnouncementList"){
              formData.set('previousPath', "AdminAnnouncementList");
              console.log('previousPath');
            }
              
              if (window.confirm("Are you sure you want to update this Announcement?")) {
                
                if (this.state.thumbnail != null) {
                  if(this.state.inputFileWasUpdated){
                    formData.set('thumbnail', this.state.thumbnail);
                  }
                }

                if (this.state.thumbnail == null) {
                  if(this.state.inputFileWasDeleted){
                    formData.set('inputFileWasDeleted', true);
                  }
                }

              // console.log(values.method ,this.state.thumbnail, formData );
              this.props.updateDepartmentAnnouncement( values.id, formData );
              this.setState({ thumbnail: null });
              this.setState({ imgPrevInputFile: '/thumbnail/defthumb.jpg' });


            }
             
              break;
          default:
              break;

        }
      
    }
  }

  setSelectedDepartments = ( values ) => {

    this.setState({
      selectedDepartments: values,
    
    });
    const params = {
      "departments" : Formatter.array_to_getvalue(values)
    }

  }

   setSelectedCountry = ( values ) => {

    this.setState({
      selectedCountries: values,
    
    });
    const params = {
      "countries" : Formatter.array_to_getvalue(values)
    }

  }

  handleOnShow = (values) => {

    this.setState({
      previewSampleValues: values
    });

    this.setState({
      previewSample: true
    });
    // console.log(values);
    // console.log(this.state,this.state.previewSampleValues);
  }


  handleOnhide = () => {
    this.setState({
      previewSample: false
    });
  }


   handleOnLInk=(values) => {
    // var formData = {};
    // formData["category"] = values;
    // this.props.fetchDashboardAnnouncementList(formData );

    if(values =="by-content" ){
      this.setState({ on_link: false });
    }

    if(values =="by-link"){
      this.setState({ on_link: true });
    }

    // console.log(values,this.state.on_link);
  }
  componentWillMount(){
      // console.log(this.props.params.id);
    this.props.fetchDepartmentList();
    this.props.clearDepartmentAnnouncementInstance();
    if( this.props.params.id != undefined ) { 
      this.props.fetchDepartmentAnnouncementStrict( this.props.params.id )
    }
}

  handleEditorChange(e) {
    this.setState({ content : e });
  }
  handleJoyrideCallback = (data) => {
    const { dispatch } = this.props;
    const { action, index, status, type } = data;

    console.log(STATUS);
    console.log(status);

    // console.log(index)
    this.setState({ stepIndex: index });
    // if (index === 1) {
    //   this.setState({ run:  });
    // }
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Need to set our running state to false, so we can restart if we click start again.
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
      // if(status === "finished"){
      //   localStorage.setItem('user', JSON.stringify(this.props.user?.id));
      // }
    }
    if ([ACTIONS.CLOSE].includes(action)) {
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
    }
    if (index === 5) {
      var set_local = JSON.stringify({local_expiration: moment().add(6, 'M').format("YYYY-MM-DD"), step: index});
      localStorage.setItem("joyride-local-announcement-form", set_local);
      console.log(localStorage.getItem("joyride-local-announcement-form"));
    }

     if (status == "skipped") {
      var set_local = JSON.stringify({local_expiration: moment().add(6, 'M').format("YYYY-MM-DD"), step: 5});
      localStorage.setItem("joyride-local-announcement-form", set_local);
      console.log(localStorage.getItem("joyride-local-announcement-form"));
    }

    // if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
    //   // Update state to advance the tour
    //   this.setState({ stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) });

    // } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
    //   // Need to set our running state to false, so we can restart if we click start again.
    //   this.setState({ run: false });
    // }
  };
  render = () => {
    // Sets the Method of the current state.
    const method = (this.props.params.id != undefined) ? 'update' : 'store'

    var today = new Date();
    console.log(method)
    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance?.id != undefined  && method == "update" ? this.props.instance.id  : null,
        // log_date:        this.props.instance?.log_date != undefined  && method == "update" ? new Date( this.props.instance.log_date ) : null,
        release_date:       this.props.instance?.release_date != undefined  && method == "update" ? new Date( this.props.instance?.release_date ) : null,
        expiry_date:        this.props.instance?.expiry_date != undefined  && method == "update" ? new Date( this.props.instance?.expiry_date ) : null,
        title:              this.props.instance?.title != undefined  && method == "update" ? this.props.instance.title : "",
        headline:           this.props.instance?.headline != undefined  && method == "update" ? this.props.instance.headline : "",
        
        link:               this.props.instance?.link != undefined  && method == "update" ? this.props.instance.link : null,
        content:            this.props.instance?.content != undefined  && method == "update" ? this.props.instance.content : null,
        category:           this.props.instance?.category != undefined  && method == "update" ? this.props.instance.category : null,
        selectedDepartments:           this.props.instance?.selectedDepartments != undefined  && method == "update" ? this.props.instance.selectedDepartments : null,
        set_all:            this.props.instance?.set_all != undefined  && method == "update" ? this.props.instance.set_all == 1? true : false : false,
        set_country_all:            this.props.instance?.set_country_all != undefined  && method == "update" ? this.props.instance.set_country_all == 1? true : false : true,
        country_id:           this.props.instance?.country_id != undefined  && method == "update" ? this.props.instance.country_id : null,

        // selectedDepartments:this.props.instance?.selectedDepartments != undefined  && method == "update" ? this.props.instance.selectedDepartments : [],
    }
  
    let tab_set =          this.props.instance?.on_link != undefined  && method == "update" ? this.props.instance.on_link : null;
    tab_set = tab_set != null ?  tab_set == 1 ? "by-link": "by-content":  "by-content";
    // console.log(tab_set);
    let title = 'Announcement Form';

    if( (method == 'store') || ([ 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      // const department_list = this.props.user.departments_handled.length > 0 ?(Formatter.array_to_multiselect_array( this.props.user.departments_handled, 'department_name', 'id')): [];;
      
      
      let department_list = [];

      // let country_list = this.props.settings.countries !== undefined ?(Formatter.array_to_multiselect_array(this.props.settings.countries, 'country_name', 'country_id')): []
      let country_list = this.props.settings.countries !== undefined ?(this.props.settings.countries): []
  
      
      if(!this.state.reloadingDepartmentList  && this.props.department != undefined){
        // console.log((Formatter.array_to_multiselect_array(this.props.department, 'department_name', 'id')));
         department_list =this.props.department.length > 0 ?(Formatter.array_to_multiselect_array(this.props.department, 'department_name', 'id')): [];

      }




      const { run, steps, stepIndex } = this.state;

      return <Wrapper {...this.props} >
        
          <Joyride
          callback={this.handleJoyrideCallback}
          run={run}
          steps={steps}
          continuous={true}
          // hideBackButton={stepIndex === 1 ? true : false}
          // locale={{ skip: "Skip" }}
          showSkipButton={true}
          disableScrolling={true}
          styles={{
            options: {
              arrowColor: "#fff",
              backgroundColor: "#fff",
              primaryColor: "#0097A7",
              textColor: "#000",
              width: 400,
              zIndex: 1000,
            },
          }}
          // disableBeacon={true}
        />
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
                  <Row >
                    <Col size="3 dep-announcement-col joyride-set-title">
                      <div className="form-group ">
                        <label className ="dep-announcement-label dep-announcement-required">Title:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="title" className="title" onChange={handleChange} value={values.title} />
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.title && touched.title && errors.title}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                    <Col size="7 dep-announcement-col">
                      <div className="form-group">
                        <label className ="dep-announcement-label">Headline:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="headline" className="headline" onChange={handleChange} value={values.headline}   placeholder="(Optional)"/>
                            <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.headline && touched.headline && errors.headline}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>

                  </Row>
                  <Row>

                <Col size = "6  dep-announcement-col joyride-set-dates">
              
               
                <Row>
                <Col size="6">
                      <div className="form-group">
                        <label className ="dep-announcement-label dep-announcement-required">Release Date:</label>
                        <InputDate name="release_date" value={values.release_date}/>
                      </div>
                    </Col>
                    <Col size="6">
                      <div className="form-group">
                        <label className ="dep-announcement-label dep-announcement-required">Expiry Date:</label>
                        <InputDate name="expiry_date" value={values.expiry_date}/>
                      </div>
                    </Col>
                </Row>
            
                  </Col>
                    <Col size="4 dep-announcement-col joyride-set-dep">
                      <div className="form-group">



                      <label>
                        <input 
                          type="checkbox"
                          checked={values.set_all}
                          onChange={() =>  setFieldValue('set_all',values.set_all==1?0:1)}
                        />
                       <span className="for-all"> For All Departments</span>  
                       {/* <a href="#" data-tool-tip="tooltip" ><i className="fa  fa-question-circle "/></a>&nbsp; */}
                      </label>
                      <br/>
                        <label className ="dep-announcement-label">By Selected Departments:{values.set_all ?  "(disabled)" : null}</label>
                          <MultiSelect
                              disabled = {values.set_all}
                              name="team_id[]"
                              options={department_list}
                              value={this.state.selectedDepartments != null ? this.state.selectedDepartments : values.selectedDepartments}
                              onChange={this.setSelectedDepartments}
                              labelledBy={"Select Departments"}
                              hasSelectAll = {false}
                            />
                      </div>

                      <div className="form-group">



                      <label>
                        <input 
                          type="checkbox"
                          checked={values.set_country_all}
                          onChange={() =>  setFieldValue('set_country_all',values.set_country_all==1?0:1)}
                        />
                      <span className="for-all"> Set to Global</span>  
                      {/* <a href="#" data-tool-tip="tooltip" ><i className="fa  fa-question-circle "/></a>&nbsp; */}
                      </label>
                      <br/>

                              <select
                              className="form-control" 
                                name="country_id"
                                value={this.state.country_id != null ? this.state.country_id : values.country_id}
                                onChange={(e) => { setFieldValue('country_id', e.target.value);  }}
                                style={{ display: 'block' }}
                                 disabled = {values.set_country_all}
                              >
                              <option label="Select Country" value=''/>
                              {country_list.map(function(item){
                                return <option value={item.country_id} label={item.country_name} />;
                              })}
                              </select>
                        {/* <label className ="dep-announcement-label">By Selected Countries:{values.set_country_all ?  "(disabled)" : null}</label>
                          <MultiSelect
                              disabled = {values.set_country_all}
                              name="country_id[]"
                              options={country_list}
                              value={this.state.selectedCountries != null ? this.state.selectedCountries : values.selectedCountries}
                              onChange={this.setSelectedCountry}
                              labelledBy={"Select Departments"}
                              hasSelectAll = {false}
                            /> */}
                      </div>

                    </Col>
                  </Row>
                  <div className="joyride-set-image">
                    <Row>
                    <Col size="3 dep-announcement-col">
                                                  <label className ="dep-announcement-label">Thumbnail </label>
                                                  <InputGroup >
                                                    

                                                      <input type="file" id="img-to-upload"  accept="image/*"  style={{'display': 'none'}} onChange={(event) => {
                                                          if (event.currentTarget.files.length !== 0) {
                                                              this.setState({ thumbnail: event.currentTarget.files[0] })
                                                              this.setState({ imgPrevInputFile: URL.createObjectURL(event.currentTarget.files[0]) })
                                                              if(method == 'update'){
                                                                this.setState({ inputFileWasUpdated: true })
                                                                this.setState({ inputFileWasDeleted: false })
                                                              }
                                                          }
                                                      }} />


                                                  <div className = "img-to-upload">

                                                  <Row >
                                                      <Col size="7">
                                                          <label for="img-to-upload"><div className="btn btn-primary"style={{'height': '45px'}} >
                                                            <i class="fa fa-upload" aria-hidden="true"/> <br/>Upload</div></label>
                                                      </Col>
                                                      <Col size="2">
                                                      <div className="btn btn-secondary" style={{'height': '45px'}} onClick={(event) => {
                                                          
                                                          this.setState({ thumbnail: null })
                                                          this.setState({ imgPrevInputFile: null })
                                                          this.setState({ inputFileWasDeleted: true })

                                                      
                                                }
                                                }><i class="fa fa-remove" aria-hidden="true"/><br/>Remove</div>                                                    </Col>
                                                    
                                                    </Row>
                                                  </div>

                                                      <Form.Control.Feedback type="invalid">&nbsp;{errors.thumbnail && touched.thumbnail && errors.thumbnail}</Form.Control.Feedback>
                                                  </InputGroup>
                                                  
                                                

                      </Col>
                      <Col size="7 dep-announcement-col"> 
                                <div className="thumbnail-image">
                                    {(this.props?.instance?.thumbnail != null && this?.state?.inputFileWasDeleted == false && this?.state?.imgPrevInputFile == '/thumbnail/defthumb.jpg' && method == "update")
                                        ? 
                                        <img style={{ maxWidth: '100%' }} src={this.props?.instance?.thumbnail} />
                                      // : <img style={{ maxWidth: '100%' }} src={this.state.imgPrevInputFile} />}
                                        : 
                                      <>
                                
                                      {this.state.thumbnail == null ? 
                                      <div><label for="img-to-upload" className="upload-imagealter">UPLOAD AN IMAGE <i class="fa fa-image" aria-hidden="true"/> </label>
                                        
                                      </div> 
                                      : 
                                      <>
                                      <img style={{ maxWidth: '100%' }} src={this.state.imgPrevInputFile} />
                                      </>}
                                      </>
                                        
                                        }
                                        
                                </div>
                      </Col>
                    </Row>
                  </div>
                
            

         <div className="joyride-set-content-desc">
          <Tabs
              defaultActiveKey={tab_set}
              id="pub-tab-example "
              className="col-8 dep-announcement-tabs-form "
              fill
              transition={false}
              onSelect= { this.handleOnLInk
              }
            >
                <Tab eventKey="by-content" className="fill-dep-ann-tab " title="Viewed as Content Page">
                    <div className="form-group content-input">
                            <label className = "dep-announcement-label-white">Content:</label>
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
                                  'advlist','autolink', 'emoticons',
                                  'lists','link','image','charmap','preview','anchor','searchreplace','visualblocks',
                                  'fullscreen','insertdatetime','media','table','help','wordcount','media'

                                  //  plugins: 'media',
  // toolbar: 'media'
                              ],
                            //    paste_preprocess: function (plugin, args) {
                            //     // console.log("Attempted to paste: ", args.content);
                            //     // replace copied text with empty string
                            //     args.content = '';
                            // },
                                toolbar: 'undo redo | casechange blocks | bold italic forecolor backcolor emoticons media | ' +
                                'alignleft aligncenter alignright alignjustify | link | ' +
                                'bullist numlist checklist outdent indent | removeformat | help ',
                                // smart_paste: false,
                                // paste_data_images: false,
                                
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                branding: false,


                                // video_template_callback: function(data) {
                                //   console.log(data);
                                //   //return '<video width="' + data.width + '" height="' + data.height + '"' + (data.poster ? ' poster="' + data.poster + '"' : '') + ' controls="controls">\n' + '<source src="' + data.source + '"' + (data.sourcemime ? ' type="' + data.sourcemime + '"' : '') + ' />\n' + (data.altsource ? '<source src="' + data.altsource + '"' + (data.altsourcemime ? ' type="' + data.altsourcemime + '"' : '') + ' />\n' : '') + '</video>'; 
                                // }


                              }}
                            />
                            {/* <Form.Control.Feedback type="invalid">
                              &nbsp;{errors.content && touched.content && errors.content}
                            </Form.Control.Feedback> */}

                          <br/>
                        <div className="form-group content-input-note"><b>Note: This be will publish as an announcement page and viewed only in the EVOX site. Editor for announcement pages does not accept inserted images.</b></div>
                          </div>
                      
  
                </Tab>
                <Tab eventKey="by-link"  className="fill-dep-ann-tab " title="Redirect as Link">

                      <div className="form-group content-input">
                          <label className ="dep-announcement-label-white">Redirect to External link:</label>
                          <InputGroup>
                              <FormControl variant="primary" name="link" className="link" onChange={handleChange} value={values.link} />
                              <Form.Control.Feedback type="invalid">
                                &nbsp;{errors.link && touched.link && errors.link}
                              </Form.Control.Feedback>
                          </InputGroup>
                          <br/>
                        <div className="form-group content-input-note"><b>Note: This will be publish as an link, users who click on the announcement will be redirected to the external link.</b></div>
                        </div>
                    
                    
                </Tab>
                {/* <Tab eventKey="contact" title="Contact" disabled>
                  
                </Tab> */}
            </Tabs>
        </div>
                
                

                  <span>
                   
                    <BackButton  {...this.props} />
                    &nbsp;
                 
                    <Button style={{'float': 'right'}} type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}>
                      <i className="fa fa-location-arrow is-green" /> Submit
                    </Button>

                       <Button style={{'float': 'right', 'margin-right': '5px'}} className="btn btn-primary-3" onClick={(e)=>{  this.handleOnShow(values); }}>
                      <i className="fa fa-eye  is-black" /> Preview Page 
                    </Button>


                    {
                  this.state.previewSample &&
                  <PreviewAnnouncment 
                  props = {this.props}
                  handleModalClose = {() => {this.handleOnhide()}}
                  values = {this.state.previewSampleValues}
                  imageCondtion = {this.props?.instance?.thumbnail != null && this?.state?.inputFileWasDeleted == false && this?.state?.imgPrevInputFile == '/thumbnail/defthumb.jpg' && method == "update"}
                  imageSource = {(this.props?.instance?.thumbnail != null && this?.state?.inputFileWasDeleted == false && this?.state?.imgPrevInputFile == '/thumbnail/defthumb.jpg' && method == "update")
                  ? this.props?.instance?.thumbnail 
                  : (this.state.thumbnail == null)? "on_update": this.state.imgPrevInputFile}
                  content = {this.state.content != null ? this.state.content : ( this.props.instance?.content != undefined  && method == "update" ? this.props.instance.content : null)}
								/>
                }

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



function PreviewAnnouncment(props) {
  console.log(props);
      return (
       
        <div id="myModal" className="modal-main">
          
        <div className="modal-content modal-content-preview">
          <div className="modal-header">
            Preview
          <span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
          </div>

          <div className="modal-body">
          {/* <h6>Clock Out Early?</h6> */}
        

          {/* <p>This could result in undertime on this date.</p> */}
        
          
            
                    <div  className="announcement-content-page">
                                   
                                          <div >
                                            {/* <div className="page-content-title">TITLE</div> */}
                                            <div className="page-content-title">{props.values.title}</div>
                                              <div className="page-content-info">Posted: {props.values.release_date != null? moment(props.values.release_date).format("YYYY-MM-DD"):  null }
                                              <br/><Badge className="tag-badge">{"Department"}</Badge></div>

                                              {
                                                props.imageCondtion ? 
                                                  <>
                                                       <img src={props.imageSource} className="page-img" alt={null}></img>
                                                  </>
                                                  :
                                                  <>
                                                  {
                                                      props.imageSource == 'on_update' ? null :  
                                                      <>
                                                       <img src={props.imageSource} className="page-img" alt={null}></img>
                                                      </>

                                                  }
                                                  </>
                                              }
                                             
                                          <div className="page-content" dangerouslySetInnerHTML={{ __html:   props.content}} />
                                        </div>
                      </div>
          

              

            
            <br />
          
          </div>
        </div>
        </div>    
      )
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
      link         : Yup.string().nullable().matches(
        /((https?):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/,
        'Enter correct url!')
});

const mapStateToProps = (state) => {
  return {
    department        : state.lookup.department,
    constant          : state.constant,
    instance          : state.departmentAnnouncement.instance,
    isInstanceLoaded  : state.departmentAnnouncement.isInstanceLoaded,
		user			        : state.user,
    settings          : state.settings,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchDepartmentList               : () => dispatch( fetchDepartmentList() ),
      fetchDepartmentAnnouncementStrict        : ( id ) => dispatch( fetchDepartmentAnnouncementStrict( id ) ),
      clearDepartmentAnnouncementInstance        : ( id ) => dispatch( clearDepartmentAnnouncementInstance( id ) ),
      createDepartmentAnnouncement : ( post_data ) => dispatch( createDepartmentAnnouncement( post_data ) ),
      updateDepartmentAnnouncement : ( id,post_data ) => dispatch( updateDepartmentAnnouncement( id,post_data ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(DepartmentAnnouncementsForm);








