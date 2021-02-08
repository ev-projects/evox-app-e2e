import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./DtrLogs.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchDtrLogs, exportDtrLogs } from '../../../store/actions/dtr/dtrLogsAction';
import { Form  } from 'react-bootstrap';
import Paginate from "../../../components/Template/Paginate/index.js";

class DtrLogs extends Component {

  constructor(props){
    super(props);
    
    this.state = {
      initialState : {
        valid_from: ( this.props.settings?.current_payroll_cutoff?.start_date ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
        valid_to:   ( this.props.settings?.current_payroll_cutoff?.end_date ? new Date( this.props.settings.current_payroll_cutoff.end_date) : null),
        department_id: null,
        name: null,
        export: false,
      }
    }; 
  }

	onSubmitHandler = (values) => {
    var formData = {};

		for (var key in values) {
		  if( values[key] != null && values[key] != ""  ) {
			  switch( key ) {
				case "valid_from":
				case "valid_to":
				  formData[key] = moment( values[key] ).format("YYYY-MM-DD")
        break;
        case "export":
				break;
				default:
				  formData[key] = values[key];
				break;
			  }
		  } 
	  }
    
    if(values.export){
      this.props.exportDtrLogs( formData );
    }else{
      this.props.fetchDtrLogs( formData );
    }

	}
  

	render = () => {  

    return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={this.state.initialState}>
		{
		({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		<Wrapper>
			  <ContainerWrapper>       
				  <Content col="12" title="DTR Logs">
				  <Row>  
                    <Col className="col-2"> 
                      <div className="form-group">
                        <label>Date From:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                      </div>
                    </Col> 
                    <Col  className="col-2">   
                      <div className="form-group">
                        <label>Date To:</label>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>
                    <Col className="col-2"> 
                    <div className="form-group">
                          <label>Department:</label>
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                          <option    label="Select a Department" />
                          {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                          <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name="department_id" className="input-feedback" />
                  </Form.Control.Feedback> 
                      </div>

                    
                    </Col> 
                    <Col className="col-2"> 
                      <div className="form-group">
                          <label>Name:</label>
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    
                    </Col> 
					          <Col className="btns">   
                    	<div className="form-group">
						          <label> </label>
							          <Button variant="primary" type="submit" onClick={() => setFieldValue("export", false)}>Submit</Button>&nbsp;&nbsp;
                        {/* <Button variant="secondary" onClick={() => setFieldValue("export", true)} type="submit">Export</Button> */}
                      </div>
                    </Col>
                    </Row>

                      { this.props.dtrLogs?.isListLoaded? (
                        <div className="dtr-table">
                            <table class="table dtrSummary">
                              <thead class="thead-light">
                                <tr>
                                  <th scope="col" class="th-id"># ID</th>
                                  <th scope="col" class="th-name">Name</th>
                                  <th scope="col" class="th-dept">Department</th>
                                  <th scope="col">Date</th>
                                  <th scope="col">Time In</th>
                                  <th scope="col">Time Out</th>
                                  <th scope="col">On Duty</th>
                                  <th scope="col">Off Duty</th>
                                  <th scope="col">On Flexy Duty</th>
                                  <th scope="col">Off Flexy Duty</th>
                                  <th scope="col">Break</th>
                                  <th scope="col">Rendered Time</th>
                                  <th scope="col">SL</th>
                                  <th scope="col">VL</th>
                                  <th scope="col">UL</th>
                                  <th scope="col">Late</th>
                                  <th scope="col">Undertime</th>
                                  <th scope="col">ND</th>
                                  <th scope="col">OT</th>
                                  <th scope="col">OT ND</th>
                                </tr>
                              </thead>
                              <tbody>
                                  {this.props.dtrLogs?.instance?.data?.map((list, index) => {
                                    console.log(list, index)
                                    return <tr >
                                            <td>{list.emp_num}</td>
                                            <td>{list.full_name}</td>
                                            <td>{list.department}</td> 
                                            <td>{list.date}</td>
                                            <td>{list.time_in}</td>
                                            <td>{list.time_out}</td>
                                            <td>{list.start_datetime}</td>
                                            <td>{list.end_datetime}</td>
                                            <td>{list.start_flexy_datetime}</td>
                                            <td>{list.end_flexy_datetime}</td>
                                            <td>{list.break_time}</td>
                                            <td>{list.payroll_items?.rendered_hours}</td>
                                            <td>{list.payroll_items?.sl}</td>
                                            <td>{list.payroll_items?.vl}</td>
                                            <td>{list.payroll_items?.ul}</td>
                                            <td>{list.payroll_items?.late}</td>
                                            <td>{list.payroll_items?.undertime}</td>
                                            <td>{list.payroll_items?.night_diff}</td>
                                            <td>{list.payroll_items?.overtime}</td>
                                            <td>{list.payroll_items?.overtime_night_diff}</td>
                                          </tr>
                                    })
                                  }
                              </tbody>
                            </table>
                            <Paginate pagination={this.props.dtrLogs?.instance?.pagination} />
                        </div>) 
                        : 
                        (<div> No Record to be displayed</div>)}    
				  </Content>
			  </ContainerWrapper>
			</Wrapper>
		</form>
		)}
	  
		</Formik>);
	}
}



  const validationSchema = Yup.object().shape({
    valid_from:      		Yup.date().required("This field is required").nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
    valid_to:     			Yup.date().required("This field is required").nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
    department_id:  		Yup.string().required("This field is required").nullable(),
    name:  		          Yup.string().nullable()

});
  
  const mapStateToProps = (state) => {
    return {
      dtrLogs   : state.dtrLogs,
      settings  : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    fetchDtrLogs : ( params ) => dispatch( fetchDtrLogs(  params ) ),
    exportDtrLogs : ( params ) => dispatch( exportDtrLogs( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrLogs);

  