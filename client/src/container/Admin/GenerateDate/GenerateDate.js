import React, { Component, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Container, Col, Tabs, Tab, Badge, Table, Button, Pagination, FormControl, Row, ToggleButton, ButtonGroup } from 'react-bootstrap';
import { ContainerHeader, Content, ContainerWrapper, ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./GenerateDate.css";
import { Formik, FieldArray, Field, ErrorMessage, getIn } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate, InputTime } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchDtrLogs, exportDtrLogs } from '../../../store/actions/dtr/dtrLogsAction';
import { Form } from 'react-bootstrap';
import Paginate from "../../../components/Template/Paginate/index.js";
import MultiSelect from "react-multi-select-component";
import Formatter from "../../../services/Formatter";
import { fetchUserList } from '../../../store/actions/lookup/lookupListActions';
import { generateDtrDate } from '../../../store/actions/admin/generateDtrDateActions'

class GenerateDate extends Component {

  constructor(props) {
    super(props);

    this.state = {
      initialState: {
        start_date: (this.props.settings?.current_payroll_cutoff?.start_date ? new Date(this.props.settings.current_payroll_cutoff.start_date) : null),
        end_date: (this.props.settings?.current_payroll_cutoff?.end_date ? new Date(this.props.settings.current_payroll_cutoff.end_date) : null),
        
      },
      selectedEmployees: [],
    };
  }

  setselectedEmployees = (values) => {
    this.setState({
      selectedEmployees: values
    });
  }

  componentWillMount = async () => {

    await this.props.fetchUserList('employee', { page: 'all' });

  }

  generate = async (values) => {

    var data = {
      start_date: moment(values.start_date).format("YYYY-MM-DD")  ,
      end_date: moment(values.end_date).format("YYYY-MM-DD")  ,
      ids: this.state.selectedEmployees
    }
    

    if (window.confirm("Are you sure you want to add dtr to this employee(s)?")) {
      await this.props.generateDtrDate( data );
    }

  }

  render = () => {
    let employee_list = Formatter.array_to_multiselect_array(this.props?.employee, 'full_name', 'id');
    // const result = employee_list.find( ({ is_active }) => is_active === 'cherries' )
    return (<Formik
      enableReinitialize
      onSubmit={this.onSubmitHandler}
      validationSchema={validationSchema}
      initialValues={this.state.initialState}>
      {
        ({ values, errors, setFieldValue, field, touched, handleSubmit, handleReset, handleChange }) => (
          <form onSubmit={handleSubmit}>
            <Wrapper {...this.props} >
              <ContainerWrapper>
                <h2 className="page-title">GENERATE DTR DATE</h2>
                <Row className="filters filter-dtr">
                  <Col className="date-range">
                    <div className="form-group">
                      <label>Date range:</label>
                      <InputDate name="start_date" value={values.start_date} />
                      <InputDate name="end_date" value={values.end_date} />
                    </div>
                  </Col>

                  <Col className="btns filter-button">
                    <div className="form-group">
                      <Button variant="primary" type="submit" onClick={() => this.generate(values)}><i className="fa fa-newspaper-o" /> Generate</Button>&nbsp;&nbsp;
                      {/* <Button variant="secondary" onClick={() => setFieldValue("export", true)} type="submit">Export</Button> */}
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col>
                    <div className="form-group" style={{ 'width': '100%', 'paddingLeft': '12.5px' }}>
                      <label>Employee List:</label>
                      <MultiSelect
                        name="employee_user_id[]"
                        options={employee_list}
                        value={this.state.selectedEmployees}
                        onChange={this.setselectedEmployees}
                        labelledBy={"Select Employee(s)"}
                      />
                      <ErrorMessage component="div" name="supervisor" className="input-feedback" />
                    </div>
                  </Col>
                </Row>

              </ContainerWrapper>
            </Wrapper>
          </form>
        )}

    </Formik>);
  }
}



const validationSchema = Yup.object().shape({
  start_date: Yup.date().required("This field is required").nullable().max(Yup.ref('start_date'), 'Please select a Valid From date.'),
  end_date: Yup.date().required("This field is required").nullable().min(Yup.ref('end_date'), 'Please select a Valid To date.'),
  department_id: Yup.string().required("This field is required").nullable(),
  name: Yup.string().nullable()

});

const mapStateToProps = (state) => {
  return {
    dtrLogs: state.dtrLogs,
    settings: state.settings,
    employee: state.lookup.employee,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDtrLogs: (params) => dispatch(fetchDtrLogs(params)),
    exportDtrLogs: (params) => dispatch(exportDtrLogs(params)),
    fetchUserList: (role, params) => dispatch(fetchUserList(role, params)),
    generateDtrDate: ( data ) => dispatch( generateDtrDate( data ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(GenerateDate);

