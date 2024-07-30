import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./DtrMultiLogsSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper/index.js";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchDtrMultiLogsSummary, exportDtrMultiLogsSummary } from '../../../store/actions/dtr/dtrSummaryActions.js';
import { Form  } from 'react-bootstrap';
import Authenticator from "../../../services/Authenticator.js";

class DtrMultiLogsSummary extends Component {

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
    if ((this.props.user) && (this.props.user.departments_handled.length > 0)) {
      //console.log(this.state.initialState);
      if (!this.state.initialState.department_id) {
        this.setState({ initialState: {
          ...this.state.initialState,
          department_id: this.props.user.departments_handled[0].id
        }}, () => {
          //console.log(this.state.initialState);
          if (this.state.initialState.valid_from && this.state.initialState.valid_to)
          this.onSubmitHandler(this.state.initialState);
        });
      }
    }
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
    
    if(values.export == "all_new"){

      var formData = {};
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            //case "export":
            case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
      this.props.exportDtrMultiLogsSummary( formData );
    }else if(values.export == "department_new"){

      var formData = {};
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            //case "export":
            // case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
      this.props.exportDtrMultiLogsSummary( formData );
    }
    else{


	  this.props.fetchDtrMultiLogsSummary( formData );

    }
	}
  

	render = () => {  
    console.log(this.props.dtrMultiLogsSummary)
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
        <h2 className="page-title">DTR MULTI-CLOCK IN SUMMARY </h2>
        <Row className="filters filter-dtr"> 
              <Col className="date-range"> 
                      <div className="form-group">
                        <label>Date Range:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>  
                    
                    <Col className="dept"> 
                    <div className="form-group">
                          
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                          <option    label="- Department -" />
                          {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                          <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name="department_id" className="input-feedback" />
                  </Form.Control.Feedback> 
                      </div>

                    
                    </Col>
                    <Col className="btns filter-button">   
                      <div className="form-group">
                      <label> </label>
                        <Button id="btn-generate" variant="primary" type="submit" onClick={() => setFieldValue("export", false)}><i className="fa fa-newspaper-o" /> Generate</Button>&nbsp;&nbsp;
                        
                        { Authenticator.scanFeature('export_dtr_summary') &&
                          <Button id="btn-generate" variant="primary" type="submit" onClick={() => setFieldValue("export", "department_new")}><i className="fa fa-download" /> Export</Button>
                        }
                      </div>

                     
                    </Col>
                    </Row>     
				  <div className="content-table">
				  

                      { this.props.dtrMultiLogsSummary.isListLoaded? (<Row><div className="dtr-summary-table">
                         
  <table class="table dtrSummary">
    <thead class="thead-light">
      <tr>
        <th scope="col" class="th-id">Employee Number</th>
        <th scope="col" class="th-name">Employee Name</th>
        <th scope="col" class="th-dept">Department</th>
        <th scope="col">Date</th>
        <th scope="col">Total Hours</th>
        <th scope="col">Rendered Hours</th>
        <th scope="col">Night Diff Hours</th>
        <th scope="col">Project Name</th>
       
      </tr>
    </thead>
    <tbody>
    {this.props.dtrMultiLogsSummary.dtrItems.map((list, index) => {
        var holiday = [];
  return <tr >
        <td>{list.Employee_Number}</td>
        <td>{list.Employee_Name}</td>
        <td>{list.Department}</td>
        <td>{list.Date}</td>
        <td>{list.Total_Hours}</td>
        <td>{list.Rendered_Hr}</td>
        <td>{list.Night_Diff}</td>
        <td>{list.Project_Name}</td>
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
    department_id:  		Yup.string().required("This field is required"),
  });
  
  const mapStateToProps = (state) => {
    return {
      dtrMultiLogsSummary  : state.dtrMultiLogsSummary,
      settings  : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    fetchDtrMultiLogsSummary : ( params ) => dispatch( fetchDtrMultiLogsSummary(  params ) ),
    exportDtrMultiLogsSummary : ( params ) => dispatch( exportDtrMultiLogsSummary( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrMultiLogsSummary);

  