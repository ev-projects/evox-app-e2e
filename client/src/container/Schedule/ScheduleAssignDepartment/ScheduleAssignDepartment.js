import React, { Component,useState  } from "react";
import { Redirect,Link } from "react-router-dom";
import { Form,Button,Container,Col,InputGroup,FormControl,Tabs,Tab  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";

import { Scheduledetails, onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,SchedulePolicy,WorkDays,StandardSchedDetailsForm,FlexibleSchedDetailsForm} from '../../../components/Schedule/ScheduleDetails.js';
import PageNotFound from "../../PageNotFound";
import PageLoading from "../../PageLoading";
import { ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';

import Formatter from '../../../services/Formatter';
import { scheduleAssign,getDefaultSchedule,listTemplate,getTemplateSchedule } from '../../../store/actions/scheduleActions';
import Wrapper from "../../../components/Template/Wrapper/index.js";
import BackButton from "../../../components/Template/BackButton/index.js";
import Validator from "../../../services/Validator.js";

class ScheduleAssignDepartment extends Component {    
  constructor(props){
    super(props);
    

    this.initialState = {
      isInitialDataLoaded: false,
      bind_to: 'department',
      bind_id: '',
      from_date : null,
      to_date : null,
      work_day : [],
      default_schedule : null,
      templateList : [],
      std_schedule_details : [],
      flx_schedule_details : [],
      cst_schedule_details : [],
      schedule_policies : {},
      creation_type : 'customize',
      source_type : 'default',
      schedule_type : null
    }

    this.state = this.initialState;
  }

  onSubmitHandler = (values) => {
    // Format the data that will be past on the API
    values.schedule_details = Formatter.format_schedule_details(values);
    values.valid_from = values.from.toISOString().substring(0, 10);
    values.valid_to = values.to.toISOString().substring(0, 10);
    this.props.scheduleAssign(values)
  }

  loadTemplateSched = (template_id) => {
    if( Validator.isValid(template_id) ){
      this.props.getTemplateSchedule(template_id,'Default');
    }
  }

  loadDepartmentSchedule = ( department_id ) => {
    if( Validator.isValid(department_id) ){
      this.setState({ bind_id: department_id });
      this.props.getDefaultSchedule( this.state.bind_to, department_id )
    } else {
      this.setState({ bind_id: '' });
    }
  }

  // Setting of Schedule Instance
  setSchedule = ( schedule ) => {

    this.setState({
      isInitialDataLoaded: false
    });

    var state = {};
    
    state.creation_type = Validator.isValid( schedule?.creation_type ) ? schedule.creation_type : 'customize';


    if( state.creation_type != 'template' ){
      state.from_date = Validator.isValid( schedule?.valid_from ) ? new Date(schedule.valid_from) : null;
      state.to_date = new Date();
      state.to_date.setHours( state.to_date.getHours() + 9 );
    }

    state.work_day = Validator.isValid( schedule?.work_days ) ? schedule.work_days : [];

    state.schedule_policies =  {
      allow_late :      ( Validator.isValid( schedule.schedule_policies?.allow_late ) && schedule.schedule_policies.allow_late == 1 ) ? schedule.schedule_policies.allow_late : 0 , 
      allow_undertime : ( Validator.isValid( schedule.schedule_policies?.allow_undertime ) && schedule.schedule_policies.allow_undertime == 1 ) ? schedule.schedule_policies.allow_undertime : 0, 
      allow_night_diff: ( Validator.isValid( schedule.schedule_policies?.allow_night_diff ) && schedule.schedule_policies.allow_night_diff == 1 ) ? schedule.schedule_policies.allow_night_diff : 0 
    };
    
    state.schedule_type = schedule.schedule_type;

    if( state.schedule_type == 'standard' ){
      state.std_schedule_details = [{
        start_time  :   new Date("2020-01-01 " + schedule.schedule_details.all.start_time), 
        end_time    :   new Date("2020-01-01 " + schedule.schedule_details.all.end_time), 
        break_time  :   new Date("2020-01-01 " +schedule.schedule_details.all.break_time)
      }];
    
    }else if( state.schedule_type == 'flexible' ){
      state.flx_schedule_details = [{
        start_time        : new Date("2020-01-01 " + schedule.schedule_details.all.start_time), 
        end_time          : new Date("2020-01-01 " + schedule.schedule_details.all.end_time), 
        start_flexy_time  : new Date("2020-01-01 " + schedule.schedule_details.all.start_flexy_time), 
        end_flexy_time    : new Date("2020-01-01 " + schedule.schedule_details.all.end_flexy_time), 
        break_time        : new Date("2020-01-01 " + schedule.schedule_details.all.break_time)
      }];
    
    }else if( state.schedule_type == 'customize' ){
      state.cst_schedule_details = [];
      var index = 0;
      for (var key in schedule.schedule_details ) {
        state.cst_schedule_details[index] = {
          start_time        :  new Date("2020-01-01 " + eval('schedule.schedule_details.' +key+'.start_time')), 
          end_time          :  new Date("2020-01-01 " + eval('schedule.schedule_details.' +key+'.end_time')), 
          start_flexy_time  :  new Date("2020-01-01 " + eval('schedule.schedule_details.' +key+'.start_flexy_time')), 
          end_flexy_time    :  new Date("2020-01-01 " + eval('schedule.schedule_details.' +key+'.end_flexy_time')), 
          break_time        :  new Date("2020-01-01 " + eval('schedule.schedule_details.' +key+'.break_time')) 
        }; 
        index++;
      }
    }

    state.isInitialDataLoaded = true;

    this.setState(state);
  }

  componentWillMount(){
    this.props.listTemplate();
  }

  componentWillReceiveProps = (nextProps) => {

    // Detect if there's a change for the default schedule properties. Trigger the setting of Schedule if changed.
    if (nextProps.default_schedule !== this.props.default_schedule &&
        nextProps.page_reloaded == true) {
          this.setSchedule( nextProps.default_schedule );
    }

    // Detect if there's a change for the template list properties. Set the update template list state if changed.
    if (nextProps.template_list !== this.props.template_list) {
          this.setState({
            templateList: nextProps.template_list
          });
    }

    // Detect if there's a change for the template data properties. Trigger the setting of Schedule base on the Template if changed.
    if (nextProps.template_data !== this.props.template_data && Validator.isValid( nextProps.template_data ) ) {

        this.setSchedule({
          work_days :  nextProps.template_data.work_days,
          schedule_policies :  nextProps.template_data.schedule_policies,
          schedule_details :  nextProps.template_data.schedule_details,
          schedule_type :  nextProps.template_data.schedule_type,
          creation_type : 'template'
        });
    }
  }

  render = () => {
    
    return <Wrapper>
              <Formik 
                enableReinitialize
                onSubmit={this.onSubmitHandler} 
                validationSchema={validationSchema} 
                initialValues={{
                  bind_to: this.state.bind_to, 
                  bind_id: this.state.bind_id,
                  sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],
                  wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}},
                  from : this.state.from_date,
                  to : this.state.to_date,
                  std_schedule_details: this.state.std_schedule_details,
                  flx_schedule_details: this.state.flx_schedule_details,
                  cst_schedule_details: this.state.cst_schedule_details, 
                  creation_type : this.state.creation_type,
                  source_type:  this.state.source_type,
                  schedule_policies : this.state.schedule_policies,
                  schedule_type : this.state.schedule_type,
                  work_days: this.state.work_day 
              }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                <form onSubmit={handleSubmit}> 
              <ContainerWrapper>   
              <Col sm={7}>
                <Form.Group className="white_bg">
                  <div className="header">
                    <h1>
                      Departments Handled
                    </h1>
                  </div>
                  <div className="body">
                      <Form.Control as="select" onChange={e => this.loadDepartmentSchedule(e.target.value)} >
                        <option value="">Select a Department</option>
                        {this.props.user.departments_handled.map((departments, index) => {
                            return <option value={departments.id}>{departments.department_name}</option>;
                        })}
                      </Form.Control>
                  </div>
                </Form.Group>
              </Col>
              { Validator.isValid( this.state.bind_id  ) ? 
                <div>
                <Col sm={7}>
                  <Form.Group className="white_bg">
                  <div className="header">
                    <h1>
                        Schedule Scope
                    </h1>
                  </div>
                  <div className="body">
                    <Form.Row>
                      <Col sm={4}>
                      <Form.Label>Date From :</Form.Label>
                        <DatePicker 
                          className="form-control"
                          timeIntervals={60}
                          timeCaption="Time"
                          dateFormat="MMMM d, yyyy"
                          timeFormat="MMMM d, yyyy"
                          selected={values.from}              
                          onChange={date => setFieldValue('from', date)}
                        />           
                        <Form.Control.Feedback type="invalid">
                          &nbsp;<ErrorMessage component="div" name="from" className="input-feedback" />
                        </Form.Control.Feedback>
                        </Col>
                      </Form.Row>
                      </div>
                    </Form.Group>
                </Col>    
                <Col sm={7}>
                  <div>
                  <Form.Group className="white_bg">
                    <div className="header">
                      <h1>
                        Creation Type
                      </h1>
                    </div>
                    <div className="body">
                      <label>          
                        <input 
                          type="radio"
                          checked={values.creation_type === "customize"}
                          onChange={() => {
                            setFieldValue('creation_type', "customize")
                          }}
                        /> 
                      Customize &nbsp;</label>
                      <label>
                        <input 
                          type="radio"
                          checked={values.creation_type === "template"}
                          onChange={() => { 
                            setFieldValue('creation_type', "template")
                          }}
                        /> 
                      Template &nbsp;</label>
                      <Form.Control.Feedback type="invalid">
                        &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
                        </Form.Control.Feedback>
                      { values.creation_type  === "template" ? (<div>
                      <Form.Label>Custom Select</Form.Label>
                      <Form.Control as="select" onChange={e => this.loadTemplateSched(e.target.value)} >
                        <option  value="">Please Select Template</option>
                        {this.state.templateList.map((day, index) => {
                            return <option value={day.id}>{day.name}</option>;
                        })}
                      </Form.Control>
                        </div>) : null}
                    </div>  
                    </Form.Group>
                  </div>
                </Col>       
                <Col sm={7}>
                  <Form.Group className="white_bg">
                    <div className="header">
                      <h1>
                        Schedule Policy
                      </h1>
                    </div>
                    <div className="body">
                      <SchedulePolicy/> 
                    </div>
                  </Form.Group>
                </Col>
                <Col sm={7}>
                <Form.Group className="white_bg">
                  <div className="header">
                    <h1>
                      Schedule Type
                    </h1>
                  </div>
                  <div className="body">
                    <FieldArray name="std_schedule_details" render={arrayHelpers => (
                      <label>          
                        <input 
                          type="radio"
                          name="schedule_type"
                          checked={values.schedule_type === "standard"}
                          onChange={() => {
                            setFieldValue('std_schedule_details', []);
                            arrayHelpers.insert(0,{break_time : "",start_time : "",end_time : ""})
                            setFieldValue('schedule_type', 'standard')
                          }}
                        /> 
                      Standard &nbsp;</label>
                    )}/>
                    <FieldArray name="flx_schedule_details" render={arrayHelpers => (
                      <label>
                        <input 
                          type="radio"
                          name="schedule_type"
                          checked={values.schedule_type === "flexible"}
                          onChange={() => { 
                            setFieldValue('flx_schedule_details', []);

                            arrayHelpers.insert(0,{break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
                            setFieldValue('schedule_type', 'flexible');
                          }}
                        /> 
                      Flexible &nbsp;</label>
                      )}
                      />
                      <FieldArray name="cst_schedule_details" render={arrayHelpers => (
                      <label>
                        <input 
                          type="radio"
                          name="schedule_type"
                          checked={values.schedule_type === "customize"}
                          onChange={() => {
                            setFieldValue('cst_schedule_details', []);
                            for (var i = 0; i < values.work_days.length; i++) {
                              arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
                            }
                            setFieldValue('schedule_type', 'customize')
                          }}
                        /> 
                      Customize &nbsp;</label>      
                    )}
                    />  
                    <Form.Control.Feedback type="invalid">
                    &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
                    </Form.Control.Feedback>
                  </div>
                  </Form.Group>
                </Col>
                <Col sm={7} >
                  <Form.Group className="white_bg">
                    <div className="header">
                      <h1>
                        Work Days
                      </h1>
                    </div>
                    <div className="body">
                      <WorkDays/>
                    </div>
                  </Form.Group>
                </Col>
                        
                { values.schedule_type  === '' ? (
                  null
                ) : values.schedule_type  === 'standard' ? ( 
                <Col sm={7} >
                  <Form.Group className="white_bg">
                    <div className="header">
                        <h1>
                          Standard Schedule
                        </h1>
                    </div>
                    <div className="body">
                      <StandardSchedDetailsForm/>
                    </div>
                  </Form.Group>
                </Col>
                ) : values.schedule_type=== 'flexible' ? (
                <Col sm={7} >
                  <Form.Group className="white_bg">
                    <div className="header">
                        <h1>
                          Flexible Schedule
                        </h1>
                    </div>
                    <div className="body">
                      <FlexibleSchedDetailsForm/>
                    </div>
                  </Form.Group>
                </Col>
                ): values.schedule_type === 'customize' ? (
                    <Col sm={7} >
                      <Form.Group className="white_bg">
                      <div className="header">
                        <h1>
                          Customize Schedule
                        </h1>
                      </div>
                      <div className="body">
                        {values.sorted_weekday.map((day, index) => {
                              if(values.work_days.includes(day)==true){
                              return <Scheduledetails day={day} index={values.work_days.indexOf(day)} />
                              }
                        })}
                      </div>
                      </Form.Group>
                    </Col>
                ) : null}
                <Col sm={7}>
                  <Button variant="primary" type="submit">
                    Update
                  </Button>
                  &nbsp;
                  <BackButton {...this.props} />
                </Col>
                </div>
                :
              null }
            </ContainerWrapper>
            </form>
            )}
          
          </Formik>
        </Wrapper>;
   
  }
}


// Object for Data Validation
const required_field = "This field is required"

const validation_var = Yup.string().required(required_field).nullable();



const validationSchema = Yup.object().shape({
  bind_id : validation_var,
  from: validation_var,
  to: Yup.string().nullable().when('source_type', {
        is: 'update',
        then:   validation_var
  }),
  schedule_type: Yup
    .string()
    .min(3)
    .max(255)
    .required('Please Select Schedule Type'),
  std_schedule_details: Yup.array().when('schedule_type', {
        is: 'standard',
        then:   Yup.array().of(
        Yup.object().shape({
          start_time: validation_var,
          end_time: validation_var,
          break_time: validation_var,
        }))
  }),
  flx_schedule_details: Yup.array().when('schedule_type', {
        is: 'flexible',
        then:   Yup.array().of(
        Yup.object().shape({
         start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
        }))
  }),
  cst_schedule_details: Yup.array().when('schedule_type', {
        is: 'customize',
        then:   Yup.array().of(
        Yup.object().shape({
         start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
        }))
  })
});




const mapStateToProps = (state) => {
    return {
        page_reloaded: state.schedule.isScheduleLoaded,
        template_list : state.schedule.templateList,
        default_schedule : state.schedule.defaultSchedule,
        template_data : state.schedule.templateData,
        
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      listTemplate : () => dispatch( listTemplate() ),
      scheduleAssign : (post_data) => dispatch( scheduleAssign(post_data) ),
      getDefaultSchedule : (bind_to, bind_id) => dispatch( getDefaultSchedule(bind_to, bind_id) ),
      getTemplateSchedule : (template_id,type) => dispatch( getTemplateSchedule(template_id,type) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(ScheduleAssignDepartment);
