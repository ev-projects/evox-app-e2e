import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./DtrSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchDtrSummary,exportDtrSummary } from '../../../store/actions/dtr/dtrSummaryActions';
import { Form  } from 'react-bootstrap';
import Authenticator from "../../../services/Authenticator.js";

class DtrSummary extends Component {

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
    
    if(values.export == "department"){
      this.props.exportDtrSummary( formData );
    }else if(values.export == "all"){

      var formData = {};
      
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            case "export":
            case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
    
      
      this.props.exportDtrSummary( formData );
    }
    else{


	  this.props.fetchDtrSummary( formData );

    }
	}
  

	render = () => {  

    var column = [];
    for (var key in this.props.dtrSummary.instance.column) {
      column.push(
        <React.Fragment>
        <th class={key.toUpperCase()}>{key.toUpperCase()}</th>
        <th class={key.toUpperCase()}>{key.toUpperCase()} ND</th>
        <th class={key.toUpperCase()}>{key.toUpperCase()} OT</th>
        <th class={key.toUpperCase()}>{key.toUpperCase()} ND w/ OT</th>
        </React.Fragment>
      ); 
    }

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
        <h2 className="page-title">DTR SUMMARY </h2>
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
                    <Col className="search-name"> 
                      <div className="form-group">
                          
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    
                    </Col> 
                    <Col className="btns filter-button">   
                      <div className="form-group">
                      <label> </label>
                        <Button variant="primary" type="submit" onClick={() => setFieldValue("export", false)}><i className="fa fa-newspaper-o" /> Generate</Button>&nbsp;&nbsp;
                        
                        { Authenticator.check('supervisor', 'allow_dtr_summary_export') &&
                          <Dropdown className="export-drop-down">
                            <Dropdown.Toggle variant="success" id="dropdown-basic">
                              <i className="fa fa-download" /> Export
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Item  as="button" type="submit" onClick={() => setFieldValue("export", "department")}>Export</Dropdown.Item>
                              <Dropdown.Item  as="button" type="submit" onClick={() => setFieldValue("export", "all")}>Export All</Dropdown.Item>
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
        <th scope="col" class="th-id"># ID</th>
        <th scope="col" class="th-name">Name</th>
        <th scope="col" class="th-dept">Department</th>
        <th scope="col">Leaves</th>
        <th scope="col">UL</th>
        <th scope="col">Late</th>
        <th scope="col">UT</th>
        <th scope="col">NSD</th>
        <th scope="col">OT</th>
        <th scope="col">OTND</th>
        {column}
      </tr>
    </thead>
    <tbody>
    {this.props.dtrSummary.instance.summary.map((list, index) => {
        var holiday = [];
        console.log(this.props.dtrSummary.instance.column);

      for (var key in this.props.dtrSummary.instance.column) {

        if(eval("list.summary").hasOwnProperty(key)===true){
          holiday.push(
            <React.Fragment>
              <td>{ eval("list.summary."+key+".rendered_hours") }</td>
              <td>{ eval("list.summary."+key+".night_diff") }</td>
              <td>{ eval("list.summary."+key+".overtime") }</td>
              <td>{ eval("list.summary."+key+".overtime_night_diff")}</td>
              </React.Fragment>
          ); 
        }else{
          holiday.push(
            <React.Fragment>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            </React.Fragment>
          ); 
        }
    }

  return <tr >
          <td>{list.employee_info.employee_id}</td>
          <td>{list.employee_info.name}</td>
          <td>{list.employee_info.department}</td> 
          <td>{list.summary.reg.vl_sl}</td>
          <td>{list.summary.reg.ul}</td>
          <td>{list.summary.reg.late}</td>
          <td>{list.summary.reg.undertime}</td>
          <td>{list.summary.reg.night_diff}</td>
          <td>{list.summary.reg.overtime}</td>
          <td>{list.summary.reg.overtime_night_diff}</td>

          {holiday}
        </tr>
  })}

  </tbody>
</table>
</div></Row>) : (<div className="pd20">Sorry, no record found</div>)}    
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
    department_id:  		Yup.string().nullable().when('export', {
      is: 'department',
      then:   Yup.string().required("This field is required").nullable()
    }),
  });
  
  const mapStateToProps = (state) => {
    return {
      dtrSummary  : state.dtrSummary,
      settings  : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    fetchDtrSummary : ( params ) => dispatch( fetchDtrSummary(  params ) ),
    exportDtrSummary : ( params ) => dispatch( exportDtrSummary( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrSummary);

  