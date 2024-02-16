import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchNewDtrSummary,exportDtrSummary, exportNewDtrSummary, exportNewDtrSummary1, fetchDtrConflict } from '../../../store/actions/dtr/dtrSummaryActions';
import { Form  } from 'react-bootstrap';
import Authenticator from "../../../services/Authenticator.js";
import DtrFormatter from '../../../services/DtrFormatter';

class DtrConflictReport extends Component {

  constructor(props){
    super(props);
    //Added status filter for employment status
    this.state = {
      initialState : {
        valid_from: ( this.props.settings?.current_payroll_cutoff?.start_date ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
        valid_to:   ( this.props.settings?.current_payroll_cutoff?.end_date ? new Date( this.props.settings.current_payroll_cutoff.end_date) : null),
        department_id: null,
        name: null,
        is_active: 1,
        export: false
      }
    }; 
  }
  componentDidMount() {
    //console.log(this.props.user);
    // if ((this.props.user) && (this.props.user.departments_handled.length > 0)) {
    //   //console.log(this.state.initialState);
    //   if (!this.state.initialState.department_id) {
    //     this.setState({ initialState: {
    //       ...this.state.initialState,
    //       department_id: this.props.user.departments_handled[0].id
    //     }}, () => {
    //       //console.log(this.state.initialState);
    //       if (this.state.initialState.valid_from && this.state.initialState.valid_to)
    //       this.onSubmitHandler(this.state.initialState);
    //     });
    //   }
    // }
  }
	onSubmitHandler = (values) => {
    var formData = {};
    formData['page'] = (this.props.dtrSummary?.pagination?.current_page ? this.props.dtrSummary?.pagination?.current_page : 1);
    if (this.props.dtrSummary?.pagination?.has_next_page == true)
    formData['page'] = formData['page'] + 1;

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
    
   if(values.export == "dtr_conflict"){

      this.props.exportNewDtrSummary1( formData );

    }    
    else{


	  this.props.fetchDtrConflict( formData );

    }
	}
  

	render = () => {  
    console.log(this.props.dtrSummary)
    var column = [];
 
    // if(this.props.isListLoaded){

    //   let pagination = [];  
    //   for (let number = 1; number <= request_list.last_page; number++) {
    //     pagination.push(
    //       <Field>
    //         {({ field, form }) => (
    //           <div>
    //             <Button type="submit" className="pagination_btn text-center" active={number === request_list.current_page} onClick={() =>{resetValues(form.setFieldValue,number) }}>{number}</Button>
    //           </div>
    //         )}
    //       </Field>
    //     );
    //   }
    // }
    return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={this.state.initialState}>
		{
		({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		<Wrapper {...this.props} >
			  <ContainerWrapper>  
        <h2 className="page-title">DTR Conflict Report </h2>
        <Row className="filters filter-dtr"> 
              <Col className="date-range"> 
                      <div className="form-group">
                        <label>Date Range:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>  
                    
     
               
                    <Col className="btns filter-button">   
                      <div className="form-group">
                      <label> </label>
                        <Button id="btn-generate" variant="primary" type="submit" onClick={() => setFieldValue("export", false)}><i className="fa fa-newspaper-o" /> Generate & Export</Button>&nbsp;&nbsp;
                        
                        { Authenticator.scanFeature("export_dtr_summary") &&
                          <Dropdown className="export-drop-down">
                            <Dropdown.Toggle variant="success" id="dropdown-basic">
                              <i className="fa fa-download" /> Export
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Item id="btn-export-all"  as="button" type="submit" onClick={() => setFieldValue("export", "dtr_conflict")}>Export DTR Conflict</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        }
                      </div>

                     
                    </Col>
                    </Row>     
				  <div className="content-table">
				  

                      { this.props.dtrSummary.isListLoaded? (<Row><div className="dtr-summary-table">
                         
  <table class="table dtrSummary">
    <thead class="thead-light">
      <tr>
        <th scope="col" class="th-id">Employee Number</th>
        <th scope="col" class="th-name">Employee Name</th>
        <th scope="col" class="th-dept">Department</th>
        <th scope="col">Date</th>
        <th scope="col">Clock IN</th>
        <th scope="col">Clock Out</th>
        <th scope="col">Leave Type</th>
        <th scope="col">Amount</th>
        <th scope="col">Status</th>
        <th scope="col">Employee Note</th>
        <th scope="col">Created at</th>
        <th scope="col">Updated at</th>
       
      </tr>
    </thead>
    <tbody>
    {this.props.dtrSummary.dtrItems.map((list, index) => {
        var holiday = [];
  return <tr >
        <td>{list.EmployeeNumber}</td>
        <td>{list.EmployeeName}</td>
        <td>{list.Department}</td>
        <td>{list.Date}</td>
        <td>{DtrFormatter.displayLog(list.TimeIN)}</td>
        <td>{DtrFormatter.displayLog(list.TimeOut)}</td>
        <td>{list.LeaveType}</td>
        <td>{list.Amount}</td>
        <td>{list.Status}</td>
        <td>{list.EmployeeNote}</td>
        <td>{list.CreatedAt}</td>
        <td>{list.UpdatedAt}</td>
        </tr>
  })}

  </tbody>
</table>
{/* <Paginate pagination={request_list} /> */}
</div></Row>) : (<div className="pd20">Sorry , no record found</div>)}    
				  </div>
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
  });
  
  const mapStateToProps = (state) => {
    return {
      dtrSummary  : state.dtrConflict,
      settings  : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    exportNewDtrSummary1 : ( params ) => dispatch( exportNewDtrSummary1( params ) ),
    fetchDtrConflict : ( params ) => dispatch( fetchDtrConflict( params ) ),
    
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrConflictReport);

  