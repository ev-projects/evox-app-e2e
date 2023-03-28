import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl,Collapse   } from 'react-bootstrap';
import Select from "react-select";
import moment from 'moment';

import "./ChangeSchedule.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { Scheduledetails, ScheduledetailsWithTimezone,onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,SchedulePolicy,WorkDays,StandardSchedDetailsForm,FlexibleSchedDetailsForm, ScheduleHolidayPolicy} from '../../../components/Schedule/ScheduleDetails.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchChangeSchedule, 
         addChangeSchedule, 
         updateChangeSchedule, 
         updateChangeScheduleStatus, 
         resetChangeScheduleInstance, 
         clearChangeScheduleInstance } from '../../../store/actions/requests/changeScheduleActions';

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import Formatter from '../../../services/Formatter'
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";

class ChangeSchedule extends Component {
	
	handleShow = () => {    
		    this.setState({
		    //   messageInfo: data,
		      isShowModelNsd: true
		    });
		  }
		
		  handleOnhide = () => {
		    this.setState({
		        isShowModelNsd: false
		    });
		  }
		  handleShow2 = () => {    
		    this.setState({
		    //   messageInfo: data,
		      isShowModelBeforeFlex: true
		    });
		  }
		
		  handleOnhide2 = () => {
		    this.setState({
		        isShowModelBeforeFlex: false
		    });
		  }
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {

	values.schedule_details = Formatter.format_schedule_details(values);

    // Setting of Form Data to be passed in the submission Not using the Form Data object of Javascript since it does not support objects.
	var formData = {};
	let newValues = {};
	let nsdAlertCall =false;
	let beforeFlexAlertCall =false;
	
	
	let i = 0;
    for (var key in values) {

		
// -------------create new dates depending on timezone -------------
	  if(key =='cst_schedule_details'){
		
		for(var keyList in  values[key]){
			newValues[key] = newValues[key]!=  undefined ? newValues[key] : {};
			
			for(var keyDate in  values[key][keyList]){
				newValues[key][keyList] =newValues[key][keyList]!=  undefined ? newValues[key][keyList] : {};
				if(keyDate != 'break_time'){
					
					newValues[key][keyList][keyDate] = values[key][keyList][keyDate];

				}
				
			}
			if(parseInt(moment(newValues[key][keyList]['start_time']).format('HH')) > parseInt(moment(newValues[key][keyList]['end_time']).format('HH')) || 
			parseInt(moment(newValues[key][keyList]['start_flexy_time']).format('HH')) > parseInt(moment(newValues[key][keyList]['end_flexy_time']).format('HH'))){
				nsdAlertCall = true;
				// console.log("1a");
				
			}
			if(parseInt(moment(newValues[key][keyList]['start_time']).format('HH')) < 7 || parseInt(moment(newValues[key][keyList]['start_flexy_time']).format('HH')) < 7 ){
				nsdAlertCall = true;
				// console.log("1b");
			
			}
			if(parseInt(moment(newValues[key][keyList]['end_time']).format('HHmm')) > 2200 || parseInt(moment(newValues[key][keyList]['end_flexy_time']).format('HHmm')) > 2200 ){
				nsdAlertCall = true;
				// console.log("1c");
				
			}
			
			

			if(parseInt(moment(newValues[key][keyList]['start_time']).format('HHmm'))  >  parseInt(moment(newValues[key][keyList]['start_flexy_time']).format('HHmm'))  ){
				beforeFlexAlertCall = true;
				// console.log(beforeFlexAlertCall);
				// console.log("1");
			}else if(parseInt(moment(newValues[key][keyList]['start_time']).format('HHmm'))  <  parseInt(moment(newValues[key][keyList]['start_flexy_time']).format('HHmm')) - 1200){
				beforeFlexAlertCall = true;
				// console.log(beforeFlexAlertCall);
				// console.log("2");
			}
		
		}
	  }
	  
	  
        if( values[key] != null ) {
            switch( key ) {
                case "valid_from":
                case "valid_to":
					formData[key] = moment( values[key] ).format("YYYY-MM-DD")
					break;
                default:
					formData[key] = values[key];
                    break;
            }
        } 
    }
    // console.log(newValues,nsdAlertCall, formData.schedule_policies.allow_night_diff == 0);
	if((!nsdAlertCall || !(formData.schedule_policies.allow_night_diff == 0)) && (!beforeFlexAlertCall)){
		switch( values.action ) { 

			// If action is NULL, it means it's either store/update
			case null:
				if (window.confirm("Are you sure you want to submit/update this request?")) {
					switch( values.method ) {
	
						case "store":
							this.props.addChangeSchedule( formData );
							break;
					
						case "update":
							formData['_method'] = 'PUT';
							this.props.updateChangeSchedule( values.id, formData );
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
					formData['_method'] = 'PUT';
					this.props.updateChangeScheduleStatus( values.id, formData, values.action );
				}
				break;
		}
	}else{
		// console.log(nsdAlertCall && formData.schedule_policies.allow_night_diff == 0, nsdAlertCall, (formData.schedule_policies.allow_night_diff == 0));
		if((nsdAlertCall && (formData.schedule_policies.allow_night_diff == 0))){
			this.handleShow();
		}
		if(beforeFlexAlertCall){
			this.handleShow2();
		}
	
	}
    // Checks on what action to use depending on the values.action
   
  }

  
  
  componentWillMount(){
	this.setState({
		open_contrast:		true,
		isShowModelNsd: false,
		isShowModelBeforeFlex: false
	});
      // Clear the Instance of Change Schedule before rendering new Instance (If applicable)
    this.props.clearChangeScheduleInstance();

      // If the ID is defined, load the Change Schedule Instance base on the ID Parameter in Route.
		if( this.props.params.id != undefined ) {

        this.props.fetchChangeSchedule( this.props.params.id )
		}
	}

  	render = () => {  

	
		// Checks if the Instance is On Approval state.
		const onApproval = this.props.instance?.is_under_supervisee && Authenticator.check('supervisor', 'manage_employee_request') ? this.props.instance.is_under_supervisee : false;

		// Sets the Method of the current state.
		const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

		const   owner_offset = this.props.instance.offset_difference != undefined ? this.props.instance.offset_difference : null;

		// Sets the Initial Value for customized schedule details
		var cst_schedule_details = [];
		var index = 0;
		if( this.props.instance?.schedule?.schedule_details != undefined ) {
			for (var key in this.props.instance.schedule.schedule_details) {
				cst_schedule_details[index] = {
					start_time: 		new Date("2020-01-01 " + eval('this.props.instance.schedule.schedule_details.' +key+'.start_time')), 
					end_time : 			new Date("2020-01-01 " + eval('this.props.instance.schedule.schedule_details.' +key+'.end_time')), 
					start_flexy_time: 	new Date("2020-01-01 " + eval('this.props.instance.schedule.schedule_details.' +key+'.start_flexy_time')), 
					end_flexy_time : 	new Date("2020-01-01 " + eval('this.props.instance.schedule.schedule_details.' +key+'.end_flexy_time')), 
					break_time: 		new Date("2020-01-01 " + eval('this.props.instance.schedule.schedule_details.' +key+'.break_time')) }; 
				index++;
			}
		}

		var pov_schedule_details = [];
		var index = 0;
		if( this.props.instance?.schedule?.pov_schedule_details != undefined ) {
			for (var key in this.props.instance.schedule.pov_schedule_details) {
				pov_schedule_details[index] = {
					start_time: 		new Date("2020-01-01 " + eval('this.props.instance.schedule.pov_schedule_details.' +key+'.start_time')), 
					end_time : 			new Date("2020-01-01 " + eval('this.props.instance.schedule.pov_schedule_details.' +key+'.end_time')), 
					start_flexy_time: 	new Date("2020-01-01 " + eval('this.props.instance.schedule.pov_schedule_details.' +key+'.start_flexy_time')), 
					end_flexy_time : 	new Date("2020-01-01 " + eval('this.props.instance.schedule.pov_schedule_details.' +key+'.end_flexy_time')), 
					break_time: 		new Date("2020-01-01 " + eval('this.props.instance.schedule.pov_schedule_details.' +key+'.break_time')) }; 
				index++;
			}
		}
		const pov_timezone_info =  this.props.instance.user?.pov_timezone != undefined ? this.props.instance.user?.pov_timezone : null;
		// Sets Initial Value of the current Formik form.
		const initialValue = {
			action:             null,
			method:             method,
			id:                 this.props.instance.id != undefined ? this.props.instance.id : null, 
			valid_from: 		this.props.instance.valid_from != undefined ? new Date( this.props.instance.valid_from ) : null,
			valid_to: 			this.props.instance.valid_to != undefined ? new Date( this.props.instance.valid_to ) : null,
			employee_note:      this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
			approver_note:      this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null,
			name:      			this.props.instance?.schedule?.name != undefined ? this.props.instance.schedule.name : "[CHANGE SCHEDULE REQUEST] - " + this.props.user.full_name,
			cst_schedule_details: cst_schedule_details,
			
			pov_schedule_details: pov_schedule_details,
			sorted_week_days: ['mon','tue','wed','thu','fri','sat','sun'],
			schedule_policies : {
				allow_late : 			( Validator.isNumeric(this.props.instance?.schedule?.schedule_policies?.allow_late) ? parseInt(this.props.instance.schedule.schedule_policies.allow_late) : 0 ), 
				allow_undertime : 		( Validator.isNumeric(this.props.instance?.schedule?.schedule_policies?.allow_undertime) ? parseInt(this.props.instance.schedule.schedule_policies.allow_undertime) : 0 ), 
				allow_night_diff: 		( Validator.isNumeric(this.props.instance?.schedule?.schedule_policies?.allow_night_diff) ? parseInt(this.props.instance.schedule.schedule_policies.allow_night_diff) : 0 ), 
				allow_special_holiday: 	( Validator.isNumeric(this.props.instance?.schedule?.schedule_policies?.allow_special_holiday) ? parseInt(this.props.instance.schedule.schedule_policies.allow_special_holiday) : 1 ), 
				allow_legal_holiday: 	( Validator.isNumeric(this.props.instance?.schedule?.schedule_policies?.allow_legal_holiday) ? parseInt(this.props.instance.schedule.schedule_policies.allow_legal_holiday) : 1 ), 
			},
			work_days: this.props.instance.schedule?.work_days != undefined ? this.props.instance.schedule.work_days : [],
			wd: {
				mon:{ index:null },
				tue:{ index:null },
				wed:{ index:null },
				thu:{ index:null },
				fri:{ index:null },
				sat:{ index:null },
				sun:{ index:null }
			},
			source_type: 'change_schedule',
			schedule_type : 'customize',
			bind_to : 'user',
			bind_id :  this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(),

			nsdAlertMsg : false,
			
		}


		// Sets the default title for the Request. Checks aswell if it's for approval.
		let title = 'Change Schedule';
		/** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
		if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){

			return <Wrapper {...this.props}>
				<Formik 
					enableReinitialize
					onSubmit={this.onSubmitHandler} 
					validationSchema={validationSchema} 
					initialValues={initialValue}
				>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
					<form onSubmit={handleSubmit}>
						<input type="hidden" name="action" value={values.action} />
						<input type="hidden" name="method" value={method} />
						<input type="hidden" name="source_type" value={values.source_type} />
						<input type="hidden" name="schedule_type" value={values.schedule_type} />
						<input type="hidden" name="id"  value={values.id} />
            { onApproval ? <input type="hidden" name="status"  value={values.status} /> : null}
						<ContainerWrapper>
							
							<ContainerBody>
						
								<Content col="7" title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
								{
								this.state.isShowModelNsd &&
								<NightShiftModal 
								messageInfo = { this.state.messageInfo }
								showModel = {this.state.isShowModelNsd}
								handleModalClose = {() => {this.handleOnhide()}}
								/>
								}

								{
								this.state.isShowModelBeforeFlex &&
								<BeforeFlex 
								messageInfo = { this.state.messageInfo }
								showModel = {this.state.isShowModelBeforeFlex}
								handleModalClose = {() => {this.handleOnhide2()}}
								/>
								}
									<Row>
										<Col size="4">
											<div className="form-group">
												<label for="valid_to">Valid From:</label>
												<InputDate name="valid_from" />
											</div>
										</Col>
										<Col size="4">
											<div className="form-group">
												<label for="valid_to">Valid To:</label>
												<InputDate name="valid_to" />
											</div>
										</Col>
									</Row>
									<Row>
										<Col size="12">
											<div className="form-group">
												<label for="valid_to">Holiday Policy:</label>
												<ScheduleHolidayPolicy/> 
											</div>
										</Col> 
									</Row>
									<Row>
										<Col size="12">
											<div className="form-group">
												<label for="valid_to">Payroll Policy:</label>
												<SchedulePolicy/>
											</div>
										</Col> 
									</Row>
									<Row>
										<Col size="12">
											<div className="form-group">
												<label for="valid_to">Work Days:</label>
													<WorkDays/>
											</div>
										</Col>
									</Row>
									
									{  /** Shows Approver Note if on Approval   */
										onApproval ? 
	
										<Row>
										<Col size="6">
											<Button
												onClick={() => this.setState({
													open_contrast: !this.state.open_contrast
												})}
												// aria-controls="example-collapse-text"
												// aria-expanded={open}
											>
												Hide Employee's Outlook
											</Button>
											</Col>
											<Col size="3">
												<p>{this.props.user.pov_timezone}   -</p>
											</Col>
											<Col size="3">
												<p>{pov_timezone_info}</p>
											</Col>
										</Row>
									
										:null 
									}
									{values.sorted_week_days.map((day, index) => {
										if(values.work_days.includes(day)==true){
											return <ScheduledetailsWithTimezone day={day} index={values.work_days.indexOf(day)} 
													offset_data={owner_offset}
													on_approval = {onApproval}
													open_contrast = {this.state.open_contrast}
													// pov_timezone_info = {pov_timezone_info}
											/>
										}
									})}

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
							</ContainerBody>
						</ContainerWrapper>
					</form>
				)}
				
				</Formik>
			</Wrapper>;
		
		}
		return <PageLoading/>;
	}
}

/** other functions */
function NightShiftModal(props) {
	return (
	  <div id="myModal" className="modal-main">
		<div className="modal-content">
		  <div className="modal-header">
			<span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
		  </div>

		  <div className="modal-body">
			<h5>Night Shift Applicable</h5>
			<p>One of the days is "Night Differential" applicable and should be toggled on.</p>
			<p>Having it on would assist the system on calculating  night shift hours and allow clock out on next day or early clock in.</p>
			<p>Conditions for this to apply is only if one or more of your days has:</p>
				<ul>
					<li>a schedule that has time in and time out after after 10 PM</li>
					<li>or before 7 AM</li>
				</ul>
			<></>
		  </div>
		</div>
	  </div>    
	)
  }

  /** other functions */
function BeforeFlex(props) {
	return (
	  <div id="myModal" className="modal-main">
		<div className="modal-content">
		  <div className="modal-header">
			<span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
		  </div>

		  <div className="modal-body">
			<h5>Incorrect Flex Time</h5>
			<p>One of your days has an incorrect flex time where the flex time is earlier than the standard flex.</p>
			<p>Please change it to prevent to prevent DTR miscalculation.</p>
			<p>Conditions for this to apply is only if one or more of your days has :</p>
				<ul>
					<li> A flex time is earlier than scheduled on-duty time   </li>	
				</ul>
			<p>Unacceptable examples of schedules are: </p>
				<ul>
					<li> 1:00 AM On DUTY |  23:00 PM On DUTY FLEX - previous Day </li>	
					<li> 9:00 AM On DUTY |  8:00  AM  On DUTY FLEX</li>	
				</ul>
			<p>Keep the flexibility extension of hour a maximum of 1-4 hours, acceptable examples of schedules are: </p>
				<ul>
					<li> 8:00 AM On DUTY  |  10:00 AM On DUTY FLEX </li>	
					<li> 11:00 AM On DUTY |  12:00 AM On DUTY FLEX </li>	
				</ul>
			<></>
		  </div>
		</div>
	  </div>    
	)
  }

/** Form Validation */

const validationSchema = Yup.object().shape({

    valid_from:      		Yup.date().required("This field is required").nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
    valid_to:     			Yup.date().required("This field is required").nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
    employee_note:  		Yup.string().nullable(),
    approver_note:  		Yup.string().nullable(),
	cst_schedule_details: Yup.array().of(
			Yup.object().shape({
				start_time: 		Yup.date().required("This field is required").nullable(),
				end_time: 			Yup.date().required("This field is required").nullable(),
				start_flexy_time: 	Yup.date().required("This field is required").nullable(),
				end_flexy_time: 	Yup.date().required("This field is required").nullable(),
				break_time: 		Yup.date().required("This field is required").nullable().max( DateFormatter.get_specific_datetime( null, '01:00:59' ) , 'Please select valid break time.'),
			})
	   )
});

const mapStateToProps = (state) => {
	return {
		constant          : state.constant,
		instance          : state.changeSchedule.instance,
		isInstanceLoaded  : state.changeSchedule.isInstanceLoaded,
		user			  : state.user
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
	fetchChangeSchedule         : ( id ) => dispatch( fetchChangeSchedule( id ) ),
	addChangeSchedule           : ( post_data ) => dispatch( addChangeSchedule( post_data ) ),
	updateChangeSchedule        : ( id, post_data ) => dispatch( updateChangeSchedule( id, post_data ) ),
	updateChangeScheduleStatus  : ( id, post_data, status ) => dispatch( updateChangeScheduleStatus( id, post_data, status ) ),
	setRedirect           		: ( link ) => dispatch( setRedirect( link ) ),
	resetChangeScheduleInstance : () => dispatch( resetChangeScheduleInstance() ),
	clearChangeScheduleInstance : () => dispatch( clearChangeScheduleInstance() )
	}
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangeSchedule);








