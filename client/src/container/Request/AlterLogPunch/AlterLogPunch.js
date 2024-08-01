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
import { getRecentPunches2, clearRecentPunches2 } from '../../../store/actions/dashboard/dashboardActions'


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

    this.setState({
      
      // ...this.state,
      date:       updated.date,
      approver_note:       updated.approver_note,
      employee_note:       updated.employee_note,
      records : this.state.records.concat({count: "sample"}) ,
      new_punch : updated.new_punch.concat({start_time : new Date( updated.date, ),end_time :new Date( updated.date, )}),
      
    })

}
 minusRecordHandler = async (updated) => {



  // this javascript function splice has a bug where where splice deletes the wrong records.
  // console.log(this.state.new_punch)
  // let new_records =  this.state.new_punch;
  // console.log(new_records.splice(-1, 1))
  let length = this.state.new_punch.length;
//  console.log(length -1);
  let  new_records =  [];
  this.state.new_punch.forEach(function (value, i) {

    if(i != length-1 ){
       new_records[i] =  value;
    }
});
// console.log(new_records, "here");
  this.setState({
      
    // ...this.state,
    date:       updated.date,
    employee_note:       updated.employee_note,
    records : new_records ,
    new_punch : new_records,
    
  })
}
minusSelectedHandler = async (updated,index) => {



  // this javascript function splice has a bug where where splice deletes the wrong records.
  // console.log(this.state.new_punch)
  // let new_records =  this.state.new_punch;
  // console.log(new_records.splice(-1, 1))
//   let length = this.state.new_punch.length;
//  console.log(length -1);
  let  new_records =  [];
  this.state.new_punch.forEach(function (value, i) {
    if(i != index ){
       new_records = new_records.concat(value);
    }
});
// console.log(new_records, "here");
  this.setState({
      
    // ...this.state,
    date:       updated.date,
    employee_note:       updated.employee_note,
    records : new_records ,
    new_punch : new_records,
    
  })
}

showOriginalHandler = (user,date) => {

     this.props.getRecentPunches2(this.props.user.id , moment( date ).format("YYYY-MM-DD"), moment( date ).format("YYYY-MM-DD"));
     this.setState({
      ...this.state,
      date: date
     })
    // console.log(this.props.dtr);
 
}
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async(values) => {
    let new_punch_data = [];
    // console.log(values);
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
                   console.log(values);
                    new_punch_data[item] ={
                        start_time : moment( values.new_punch[item].start_time ).format("YYYY-MM-DD HH:mm:ss"),
                        end_time : moment( values.new_punch[item].end_time ).format("YYYY-MM-DD HH:mm:ss"),
                        project_name : values.new_punch[item].project_name,
                        remarks : values.new_punch[item].remarks
                      }
              
                  }
                }
                formData.set(key, JSON.stringify(new_punch_data));
      

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
    // console.log(nextProps);
    // Detect if there's a change for the default schedule properties. Trigger the setting of Schedule if changed.
    let  new_punch_data =[];
    if(nextProps.isInstanceLoaded == true){
      if(nextProps.instance.request_type == "alter_log_punch"){
        for(var item in nextProps.instance.new_punch){
                  // console.log(item);
          new_punch_data[item] ={
              start_time :nextProps.instance.new_punch[item].start_time != undefined ? new Date( nextProps.instance.new_punch[item].start_time ) : ( nextProps.location.start_time != undefined ? new Date(  nextProps.location.start_time ) : null ), 
              end_time : nextProps.instance.new_punch[item].end_time != undefined ? new Date( nextProps.instance.new_punch[item].end_time ) : ( nextProps.location.end_time != undefined ? new Date(  nextProps.location.end_time ) : null ), 
              project_name :nextProps.instance.new_punch[item].project_name != undefined ? nextProps.instance.new_punch[item].project_name : ( nextProps.location.project_name != undefined ? nextProps.instance.new_punch[item].project_name : null ), 
              remarks : nextProps.instance.new_punch[item].remarks != undefined ?nextProps.instance.new_punch[item].remarks : ( nextProps.location.end_time != undefined ? nextProps.instance.new_punch[item].remarks: null ), 
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
    if(nextProps.isInstanceLoaded == false && Object.keys(nextProps.instance).length === 0){
      // console.log(nextProps.dtr.single_punch_list);
      if(nextProps.dtr.single_punch_list.length > 0){
        for(var item in nextProps.dtr.single_punch_list){
          console.log(nextProps.dtr.single_punch_list[item].date_time_in);
          new_punch_data[item] ={
              start_time :nextProps.dtr.single_punch_list[item].date_time_in != undefined ? new Date( nextProps.dtr.single_punch_list[item].date_time_in ) : ( nextProps.location.start_time != undefined ? new Date(  nextProps.location.start_time ) : null ), 
              end_time : nextProps.dtr.single_punch_list[item].date_time_out != undefined ? new Date( nextProps.dtr.single_punch_list[item].date_time_out ) : ( nextProps.location.end_time != undefined ? new Date(  nextProps.location.end_time ) : null ),
              project_name : nextProps.dtr.single_punch_list[item].project_name != undefined ? ( nextProps.dtr.single_punch_list[item].project_name ) : ( nextProps.location.end_time != undefined ? (  nextProps.location.project_name ) : null ), 
              remarks :  nextProps.dtr.single_punch_list[item].remarks != undefined ? ( nextProps.dtr.single_punch_list[item].remarks ) : ( nextProps.location.end_time != undefined ? (  nextProps.location.remarks ) : null ),
            }
        }
       
        this.setState({
      
          ...this.state,
          records : nextProps.dtr.single_punch_list,
          new_punch :  new_punch_data
          
        })
      
      }else{
        this.setState({
      
          ...this.state,
          records : [],
          new_punch :  []
          
        })
      }
    }
    
  }
  
  componentWillMount(){
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearRecentPunches2();
      this.props.clearAlterLogPunchInstance();
      

      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {

        this.props.fetchAlterLogPunch( this.props.params.id )
      }

  }

  render = () => {  


    // Checks if the Instance is On Approval state.
    const onApproval = this.props.instance?.is_under_supervisee ? this.props.instance.is_under_supervisee : false;

    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    const   owner_offset = this.props.instance.offset_difference != undefined ? this.props.instance.offset_difference : null;
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance.id != undefined ? this.props.instance.id : null, 
        date:               this.state.date != ""?this.state.date :this.props.instance.date != undefined ? new Date( this.props.instance.date ) : ( this.props.location.date != undefined ? new Date(  this.props.location.date ) : null ),
        employee_note:      this.state.employee_note != ""?this.state.employee_note :this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        user_id:            this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(), 
      
        approver_note:      this.state.approver_note != ""?this.state.approver_note :this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null,
        new_punch:           this.state.new_punch,
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = initialValue.date != undefined ? 'Alter Log - ' + moment(initialValue.date).format("MMMM D YYYY") : '';
 

    let isReadOnly = false;
		const { single_punch_list, isSingleListPunchLoaded } = this.props.dtr;
    let punchList = single_punch_list;
    // console.log(punchList);
    // if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
        if( (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded)){
          punchList = this.props.instance.old_punch
          isReadOnly =  true;
        }
        let content = [];
      
        // console.log(this.props.user.user_server_date);
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
          
        
            <Row>
            <Content col="8" title={title} subtitle={<RequestSubtitle method={method}   user={this.props.instance.user}/>}>
        
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
                              maxDate={ this.props.user.user_server_date != undefined ? new Date(this.props.user.user_server_date) : false }
                              readOnly={ isReadOnly != undefined ? isReadOnly : false }
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
                      <th className="dtr-log">Project</th>
                </tr>
            </thead>
            <tbody>
            {punchList.slice().map((punch, index) => {
                
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
                            <td className="dtr-log"> { (punch.project_name)}</td>
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
                 <ErrorMessage component="div" name={"employee_note"} className="input-feedback" />
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
                <ErrorMessage component="div" name={"approver_note"} className="input-feedback" />
            </Form.Control.Feedback> 
          </div> 
          </span>
          :
          null 
        }

        
        
      </Content>
      <Content col="8" title={"EDIT"} subtitle={<RequestSubtitle method={method} />}>

    {values.date !== null ? 
      <>
        <div>
          <Button className="btn btn-primary-2" onClick={(e) => {this.addRecordHandler(values);}} ><i className="fa   fa-plus" /> </Button> &nbsp;
          <Button className="btn btn-primary-2" disabled={this.state.records.length === 0} onClick={(e) => {this.minusRecordHandler(values);}} ><i className="fa   fa-minus" /> </Button> &nbsp;
        </div>
    
              <Form.Control.Feedback type="invalid">
                <ErrorMessage component="div" name="new_punch"className="input-feedback">{msg => <div>{"One of the time logs conflict with another or it is not optimized or missing a remakrs and prject name."}</div>}</ErrorMessage> 
              </Form.Control.Feedback> 
        {/* <Button className="btn btn-primary-2" ><i className="fa  is-green fa-car" /> </Button> &nbsp; */}
 
        {this.state.records?.map((item,index)=>{
                    return <div className="alter-punch-rows">

<Row >  
                <Col size="12">
                  <Row>
                  <Col size="4">   
                        <div className="form-group">
                          <label>On Duty {index+1}: </label>
                          <InputDateTimeIndex name="start_time"   popperPlacement="right-start"  value={values.date} minDate={values.date} maxDate={index != 0 ?DateFormatter.add_day_to_datetime( values.date, 1 ):values.date } type="indexing" indexid={index}/>
                        </div>
                      </Col> 
                      <Col size="4"> 
                      <div className="form-group">
                          <label>Off Duty: </label>
                          <InputDateTimeIndex name="end_time"   popperPlacement="right-start"  value={values.date} minDate={values.date} maxDate={DateFormatter.add_day_to_datetime( values.date, 1 )} type="indexing" indexid={index}/>
                        </div> 
                      </Col> 
                      {/* <Col size="3" >

                      </Col> */}
                      <Col size="1" >
                        <div className="rmv-records-btn">
                        <Button className="btn btn-primary-2 "  onClick={(e) => {this.minusSelectedHandler(values,index);}} ><i className="fa   fa-times" /> </Button>
                        </div>
                        
                      </Col>
                  </Row>
                  <Row>
        

                <Col size="3">   
                    <div className="form-group">
                      <label>Project Name: </label>
                      <Form.Control 
                        as="select"
                        name={`new_punch.${index}.project_name`} 
                        value={values.new_punch && values.new_punch[index] && values.new_punch[index].project_name} 
                        onChange={handleChange}
                      >

                      {/* <Form.Control  as="select" required onChange={(e) => onProjectNameChange(e.target.value)}> */}
                              <option value="">Select a project</option>
                            
                              <option value="EVOX">EVOX</option>
                              <option value="ODOO">ODOO</option>
                              <option value="LMS">LMS</option>
                          {/* <option value="OPTIMY">OPTIMY</option> */}
                            </Form.Control >
                    </div>
                  </Col> 
                  <Col size="9"> 
                    <div className="form-group">
                      <label>Remarks: </label>
                      <Form.Control 
                        type="text" 
                        name={`new_punch.${index}.remarks`} 
                        value={values.new_punch && values.new_punch[index] && values.new_punch[index].remarks} 
                        onChange={handleChange}
                      />
                    </div> 
                  </Col> 
                  
                  </Row>
                </Col>
                    
                  </Row>
                   </div>
                })}
                </>:
                  
                <>
                <div className="no-previous-dtr">No Date Selected</div>
                </>
     
    }
    <br/>
    {(this.state.records.length > 0 || method == 'approval')&&<> <RequestButtons method={method} {...this} /></>}
       
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
  
    date:                     Yup.date().required("This field is required").nullable(),
    employee_note:            Yup.string().nullable(),
    approver_note:            Yup.string().nullable(),
    new_punch:    Yup.array().of(
                      Yup.object().shape({
                        start_time:  Yup.date().required("This field is required").nullable().max( Yup.ref('end_time') , 'Please select a valid Time-In.')
                        ,
                        end_time:  Yup.date().required("This field is required").nullable().min( Yup.ref('start_time') , 'Please select a valid Time-out.'),
                        project_name: Yup.string().required("Project worked should be stated"),
                        remarks: Yup.string().required("Remarks are required"),
                      })
                     
                    ) .test(
                      "date_optimize",
                      "One of the time logs conflict with another or your missing a project name and remarks.",
                      (value) => {
                        for (var key in value){
                        
                          if(key !== "0"){
                            // console.log(key,value[Number(key)])
                           
                              if(value[Number(key)].start_time < value[Number(key)-1].end_time){
                                return false;
                              }
                         
                          }
                          
                        }
                       return true
                      }
                    )
                    
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
      clearRecentPunches2 : () => dispatch( clearRecentPunches2() ),

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AlterLogPunch);








