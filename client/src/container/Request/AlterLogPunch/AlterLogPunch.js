import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import Select from "react-select";
import moment from 'moment';
import { useParams, useLocation, useHistory } from "react-router-dom";
import "./AlterLogPunch.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import {Table} from 'react-bootstrap';
import { InputDate,InputTime,InputDateTime, InputDateTimeIndex } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn , Field} from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";
import DatePicker from "react-datepicker";


import { fetchAlterLogPunch, 
          addAlterLogPunch,
          updateAlterLogPunch, 
          updateAlterLogPunchStatus, 
          resetAlterLogPunchInstance, 
          clearAlterLogPunchInstance } from '../../../store/actions/requests/alterPunchLogActions';

// import { viewEmployeeTargetPunch } from '../../../store/actions/dtr/dtrActions';
import { getRecentPunches2 } from '../../../store/actions/dashboard/dashboardActions'


import { setRedirect } from '../../../store/actions/redirectActions';
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions'


import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import settingsReducers from "../../../store/reducers/settings/settingsReducers";

class AlterLogPunch extends Component {

  constructor(props){
    super(props);

    this.state = {
      date: "",
      employee_note: "",
      approver_note: "",
      records :[],
      new_punch :[]
   
    }
    
    // this.state = this.initialState; 
}
addRecordHandler = (updated) => {
  console.log(updated);
    this.setState({
      
      // ...this.state,
      date:       updated.date,
      approver_note:       updated.approver_note,
      employee_note:       updated.employee_note,
      records : this.state.records.concat({count: "sample"}) ,
      new_punch : updated.new_punch.concat({start_time : new Date( updated.date, ),end_time :new Date( updated.date, )}),
      
    })
    // console.log(this.state.records)
  // }
 
}
minusRecordHandler = (updated) => {

  this.setState({
      
    // ...this.state,
    date:       updated.date,
    employee_note:       updated.employee_note,
    records : this.state.records.splice(-1) ,
    new_punch : updated.new_punch.splice(-1),
    
  })
}

showOriginalHandler = (user,date) => {

     this.props.getRecentPunches2(this.props.user.id , moment( date ).format("YYYY-MM-DD"), moment( date ).format("YYYY-MM-DD"));
    console.log(this.props.dtr);
 
}
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async(values) => {
    let new_punch_data = [];
    console.log(values);
    // Setting of Form Data to be passed in the submission
    var formData = new FormData();
    for (var key in values) {
      
        if( values[key] != null ) {
            switch( key ) {
                case "date":
                    formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
                    break;
                case "new_punch":
               
                if(values["new_punch"].length > 0) {
                  for(var item in values["new_punch"]){
                   
                    new_punch_data[item] ={
                        start_time : moment( values.new_punch[item].start_time ).format("YYYY-MM-DD HH:mm:ss"),
                        end_time : moment( values.new_punch[item].end_time ).format("YYYY-MM-DD HH:mm:ss")
                      }
              
                  }
                }
                formData.set(key, JSON.stringify(new_punch_data));
                // formData.append(key, moment( values[key] ).format("YYYY-MM-DD HH:mm:ss") );
                  // console.log( moment( values[key]).subtract(this.props.user?.user_offset_seconds, 'seconds').format("YYYY-MM-DD HH:mm:ss"));

                    break;
                default:
                    formData.set(key, values[key]);
                    break;
            }
        }
    }
    console.log(new_punch_data,formData);
    // this.props.addAlterLogPunch( formData );

    // Checks on what action to use depending on the values.action
    switch( values.action  ) { 

        // If action is NULL, it means it's either store/update
        case null:
          if (window.confirm("Are you sure you want to submit/update this request?")) {
              switch( values.method ) {

                case "store":
                  this.props.addAlterLogPunch( formData );
                    // this.props.getMyDtrNotifications( this.props?.user?.id );
                    break;
          
                case "update":
                    // formData.append('_method', 'PUT')
                    // this.props.updateAlterLog( values.id, formData );
                    // this.props.getMyDtrNotifications( this.props?.user?.id );
                    break;

                default:
                    break;

              }
            }
            break;

        // If action is approve/decline/cancel, it means it's a change of Status
        case "approve":
        case "decline":
        case "cancel":
            if (window.confirm("Are you sure you want to "+ values.action +" this request?")) {
                formData.append('_method', 'PUT')
                this.props.updateAlterLogPunchStatus( values.id, formData, values.action ,this.props?.user?.id, this.props.settings.current_payroll_cutoff.start_date , this.props.settings.current_payroll_cutoff.end_date);
                await this.props.getMyDtrNotifications( this.props?.user?.id );
                // let history = useHistory();
                // history.push(global.links.my_team_all_requests);
                
            }
            break;
    }
    
  }
  componentWillReceiveProps = (nextProps) => {

    // Detect if there's a change for the default schedule properties. Trigger the setting of Schedule if changed.
    let  new_punch_data =[];
    if(nextProps.isInstanceLoaded == true){
      if(nextProps.instance.request_type == "alter_log_punch"){
        for(var item in nextProps.instance.new_punch){
                  // console.log(item);
          new_punch_data[item] ={
              start_time :nextProps.instance.new_punch[item].start_time != undefined ? new Date( nextProps.instance.new_punch[item].start_time ) : ( nextProps.location.start_time != undefined ? new Date(  nextProps.location.start_time ) : null ), 
              end_time : nextProps.instance.new_punch[item].end_time != undefined ? new Date( nextProps.instance.new_punch[item].end_time ) : ( nextProps.location.end_time != undefined ? new Date(  nextProps.location.end_time ) : null ), 
            }
    
        }
        console.log(new_punch_data);
        this.setState({
      
          // ...this.state,
          records : nextProps.instance.new_punch,
          new_punch :  new_punch_data
          
        })
      }
    };
    
  }
  
  componentWillMount(){
      console.log( this.props.params);
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearAlterLogPunchInstance();

      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {

        this.props.fetchAlterLogPunch( this.props.params.id )
      }
      console.log( this.props.instance);
  }

  render = () => {  


    // Checks if the Instance is On Approval state.
    const onApproval = this.props.instance?.is_under_supervisee && Authenticator.check('supervisor', 'manage_employee_request') ? this.props.instance.is_under_supervisee : false;

    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    const   owner_offset = this.props.instance.offset_difference != undefined ? this.props.instance.offset_difference : null;
    console.log(this.props.instance); 
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance.id != undefined ? this.props.instance.id : null, 
        date:               this.state.date != ""?this.state.date :this.props.instance.date != undefined ? new Date( this.props.instance.date ) : ( this.props.location.date != undefined ? new Date(  this.props.location.date ) : null ),
        employee_note:      this.state.employee_note != ""?this.state.employee_note :this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        user_id:            this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(), 
      
        approver_note:      this.state.approver_note != ""?this.state.approver_note :this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null,
        // pov_current_time_in:    this.props.instance.pov_current_time_in != undefined ? new Date( this.props.instance.pov_current_time_in ) : ( this.props.location.pov_current_time_in != undefined ? new Date(  this.props.location.pov_current_time_in ) : null ), 
        // pov_current_time_out:   this.props.instance.pov_current_time_out != undefined ? new Date( this.props.instance.pov_current_time_out ) : ( this.props.location.pov_current_time_out != undefined ? new Date(  this.props.location.pov_current_time_out ) : null ), 
        // pov_new_time_in:        this.props.instance.pov_new_time_in != undefined ? new Date( this.props.instance.pov_new_time_in ) : ( this.props.location.pov_current_time_in != undefined ? new Date(  this.props.location.pov_current_time_in ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        // pov_new_time_out:       this.props.instance.pov_new_time_out != undefined ? new Date( this.props.instance.pov_new_time_out ) : ( this.props.location.pov_current_time_out != undefined ? new Date(  this.props.location.pov_current_time_out ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        // pov_timezone:                 this.props.instance.pov_timezone != undefined ? "-" + this.props.instance.pov_timezone : null,
        new_punch:           this.state.new_punch,
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = initialValue.date != undefined ? 'Alter Log - ' + moment(initialValue.date).format("MMMM D YYYY") : '';
 


		const { single_punch_list, isSingleListPunchLoaded } = this.props.dtr;
    let punchList = single_punch_list;
  
    // if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
        if( (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded)){
          punchList = this.props.instance.old_punch
        }
        let content = [];
      

        let title = 'Alter Log Punch';
      return <Wrapper {...this.props} >
        <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler}
        validationSchema={validationSchema} 
        initialValues={initialValue}
        >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        
        <form onSubmit={handleSubmit}>
        <input type="hidden" name="action" value={values.action} />
        <input type="hidden" name="method" value={method} />
        {/* <input type="hidden" name="date" value={values.date} /> */}
        <input type="hidden" name="id"  value={values.id} />
        { onApproval ? <input type="hidden" name="status"  value={values.status} /> : null}
        <ContainerWrapper>
          <ContainerBody>
          
          {/* <p> {this.state.records.length}</p> */}
            <Row>
            <Content col="6" title={title} subtitle={<RequestSubtitle method={method}  />}>
        
        <Row>  
          <Col size="4">  
            <div className="form-group">
              <label>Date: </label>
              <Field>
                {({ field, form }) => (
                        <div>
                          <DatePicker 
                              className="form-control"                      
                              showDateSelect
                              showDateSelectOnly
                              timeCaption="Time"
                              dateFormat="MMMM d, yyyy"
                              timeFormat="MMMM d, yyyy"
                              selected={ eval('field.value.' +"date")}       
                              // readOnly={ props.readOnly != undefined ? props.readOnly : false }
                              onChange={date => {this.showOriginalHandler(1, date) ;form.setFieldValue("date", date); }}
                          /> 
                          <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name={"date"} className="input-feedback" />
                          </Form.Control.Feedback> 
                        </div>)}
              </Field>
            </div>
          </Col> 
        </Row>
      
                     
      <div >
        { punchList.length > 0  ? 
        
        <div className="recent_punch-table">

            
              <Table className="responsive hover dtr-table ">
            <thead>
                <tr>
                    <th className="dtr-date">Date</th>
                     {/* <th className="dtr-schedule">Schedule</th> */}
                      <th className="dtr-log">Clock In</th>
                      <th className="dtr-log">Clock Out</th>
                      <th className="dtr-log">Hour Count</th>
                      <th className="dtr-log">Punch Status</th>
                </tr>
            </thead>
            <tbody>
            {punchList.slice().reverse().map((punch, index) => {
                

                  return <tr className={"center "}>
                          <td className="dtr-date">{(punch.date)}</td> 
                          
                           {/* <td className="dtr-schedule"><div className="dtr-status">{status}</div><div>{DtrFormatter.displaySchedule(dtr)}</div></td> */}
                          <td className="dtr-log"><div>{(punch.time_in)}</div></td>
                          <td className="dtr-log"><div>
                            { (punch.time_out)}
                          </div></td>

                            <td className="dtr-log"><div>
                            { (punch.hours)}
                            </div></td>
                            <td className="dtr-log">
                            <div>
                          <span>{(punch.log_out_type == "Log_out" && punch.log_in_type == "Continue") || (punch.log_out_type == "Log_out" && punch.log_in_type == "Log_in") ? <i className="fa fa-sign-out" /> : punch.log_out_type == "Pause" ? <i className="fa fa-pause" /> : punch.log_in_type == "rest_day_work" ? <i className="fa fa-calendar-times-o" /> : "" } </span>
                           
                          <b>{ ((punch.log_out_type == "Log_out" && punch.log_in_type == "Continue") || (punch.log_out_type == "Log_out" && punch.log_in_type == "Log_in")? "Logout" : punch.log_out_type == "Pause" ? "Pause" : punch.log_in_type == "rest_day_work" ? "Rest Day Work" : "" )}</b>
                            </div></td>
                        </tr>
              })}
              </tbody>
        </Table>
        </div>
              :
              <div className="no-previous-dtr">No  Punch logs on Date</div>
              } 
              </div>
      
  
        {  /** Shows Employee Note if Not on Approval   */
        ! onApproval ? 
          <div className="form-group">
            <label>Note:</label>
            <textarea className="form-control" rows="3" name="employee_note" onChange={handleChange} value={values.employee_note??''} placeholder="Enter Note..."></textarea>
            <Form.Control.Feedback type="invalid">
              &nbsp;{errors.employee_note && touched.employee_note && errors.employee_note}
            </Form.Control.Feedback> 
          </div> 
          :
          null 
        }

        {  /** Shows Approver Note if on Approval   */
          onApproval ? 
          <span>
          <div className="form-group">
            <b>Employee's Note:</b> {values.employee_note??''}
          </div>
          <div className="form-group">
            <label>Note:</label>
            <textarea className="form-control" rows="3" name="approver_note" onChange={handleChange} value={values.approver_note} placeholder="Enter Note..."></textarea>
            <Form.Control.Feedback type="invalid">
              &nbsp;{errors.approver_note && touched.approver_note && errors.approver_note}
            </Form.Control.Feedback> 
          </div> 
          </span>
          :
          null 
        }

        <RequestButtons method={method} {...this} />
        
      </Content>
      <Content col="5" title={"EDIT"} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>

     {values.date !== null ? 
     <>
      <Button className="btn btn-primary-2" onClick={(e) => {this.addRecordHandler(values);}} ><i className="fa   fa-plus" /> </Button> &nbsp;
        <Button className="btn btn-primary-2" onClick={(e) => { this.minusRecordHandler(values); }} ><i className="fa   fa-minus" /> </Button> &nbsp;
        {/* <Button className="btn btn-primary-2" ><i className="fa  is-green fa-car" /> </Button> &nbsp; */}

        {this.state.records?.map((item,index)=>{
                    return <Row>  
                    <Col size="5">   
                      <div className="form-group">
                        <label>On Duty {index+1}: </label>
                        <InputDateTimeIndex name="start_time"   popperPlacement="right-start"  value={values.date} minDate={values.date} maxDate={index != 0 ?DateFormatter.add_day_to_datetime( values.date, 1 ):values.date } type="indexing" indexid={index}/>
                      </div>
                    </Col> 
                    <Col size="5"> 
                    <div className="form-group">
                        <label>Off Duty: </label>
                        <InputDateTimeIndex name="end_time"   popperPlacement="right-start"  value={values.date} minDate={values.date} maxDate={DateFormatter.add_day_to_datetime( values.date, 1 )} type="indexing" indexid={index}/>
                      </div> 
                    </Col> 
                  
                  </Row>;
                })}
                </>:
                  
                <>
                <div className="no-previous-dtr">No Date Selected</div>
                </>
     
    }
        
      </Content>
            </Row>
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
  

    employee_note:            Yup.string().nullable(),
    approver_note:            Yup.string().nullable()
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.alterLogPunch.instance,
    isInstanceLoaded  : state.alterLogPunch.isInstanceLoaded,
		user			        : state.user,
    settings          : state.settings,
    dtr               : state.dtr,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchAlterLogPunch         : ( id ) => dispatch( fetchAlterLogPunch( id ) ),
      addAlterLogPunch           :       ( post_data ) => dispatch( addAlterLogPunch( post_data ) ),
      getRecentPunches2  : ( id, from, to ) => dispatch( getRecentPunches2( id, from, to ) ),
      updateAlterLogPunch        : ( id, post_data ) => dispatch( updateAlterLogPunch( id, post_data ) ),
      updateAlterLogPunchStatus  : ( id, post_data, status, user_id, fromdate, todate ) => dispatch( updateAlterLogPunchStatus( id, post_data, status, user_id, fromdate, todate ) ),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
      resetAlterLogPunchInstance : () => dispatch( resetAlterLogPunchInstance() ),
      clearAlterLogPunchInstance : () => dispatch( clearAlterLogPunchInstance() ),
      getMyDtrNotifications  : () => dispatch( getMyDtrNotifications() ),

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AlterLogPunch);








