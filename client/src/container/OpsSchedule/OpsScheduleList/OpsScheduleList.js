import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./OpsScheduleList.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchOpsSchedulesList, deleteOpsSchedule } from '../../../store/actions/opsschedule/opsScheduleActions';
import { Form  } from 'react-bootstrap';
import Authenticator from "../../../services/Authenticator.js";

class OpsScheduleList extends Component {

    constructor(props){
        super(props);
        //Added status filter for employment status
        this.state = {
            department_id: '',
            initialState : {
                id: null,
            }
        }; 
    }

    componentDidMount() {
        // get list of ops schedule
        this.props.fetchOpsSchedulesList( this.state.department_id );
    }
	
    onSubmitHandler = (values) => {
        if (values.action === 'delete') {
            const ops_sched_id = values.ops_sched_id != undefined ? values.ops_sched_id : '';

            // Confirmation before deleting the schedule
            if (window.confirm("Are you sure you want to delete this schedule?")) {
                this.props.deleteOpsSchedule( ops_sched_id );
            }
        } else {
            const department_id = values.department_id != undefined ? values.department_id : '';
            this.props.fetchOpsSchedulesList( department_id );
        }
    }

	render = () => {
        const opsDepts = this.props.constant.OPS_DEPTS != undefined ? this.props.constant.OPS_DEPTS : [];

        return(<Formik 
            enableReinitialize
            onSubmit={this.onSubmitHandler} 
            initialValues={this.state.initialState}>
            {
            ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
            <form onSubmit={handleSubmit}>
            <Wrapper {...this.props} >
                <ContainerWrapper>  
                    <h2 className="page-title">OPS Schedule List</h2>
                    <Row className="filters filter-dtr">
                        <Col className="dept"> 
                            <div className="form-group">
                                <select
                                className="form-control" 
                                    name="department_id"
                                    value={values.id}
                                    onChange={handleChange}
                                    style={{ display: 'block' }}
                                >
                                <option label="- OPS Department -" />
                                {opsDepts.map(function(item){
                                    return <option value={item.id} label={item.name} />;
                                })}
                                </select>
                            </div>
                        </Col>
                        <Col className="btns filter-button">   
                            <div className="form-group">
                                <label> </label>
                                <Button id="btn-generate" variant="primary" type="submit" onClick={() => setFieldValue("action", "filter")}><i className="fa fa-filter" /> Filter</Button>&nbsp;&nbsp;
                                <Button id="btn-generate" variant="primary" type="submit" onClick={() => { this.props.history.push(global.links.ops_schedule_form) }}><i className="fa fa-plus" /> Add OPS Schedule</Button>
                            </div>
                        </Col>
                    </Row>

                    <div className="content-table">
                        { this.props.opsScheduleList.isListInstanceLoaded ? (<Row><div className="dtr-summary-table">
                            <table className="table">
                                <thead className="thead-light">
                                    <tr>
                                        <th scope="col" className="th-id">Department</th>
                                        <th scope="col" className="th-id">Image</th>
                                        <th scope="col" className="th-id">Name(POC)</th>
                                        <th scope="col" className="th-name">Position</th>
                                        <th scope="col" className="th-dept">Email</th>
                                        <th scope="col">Domain</th>
                                        <th scope="col">Scope</th>
                                        <th scope="col">Schedule</th>
                                        <th scope="col" className="ta-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {this.props.opsScheduleList.listInstance.map((list, index) => {
                                    return <tr>
                                        <td>{list.department}</td>
                                        <td className="ta-center">{(list.path) ? <img src={list.path} width="300px" height="200px" /> : '' }</td>
                                        <td>{list.name}</td>
                                        <td>{list.position}</td>
                                        <td>{list.email}</td>
                                        <td>{list.domain}</td>
                                        <td>
                                            <ul>
                                                {list.scope?.map((scope, index3) => {
                                                    return <li>{scope}</li>;
                                                })}
											</ul>
                                        </td>
                                        <td>{list.work_days}<br/>{list.start_end_time} {list.timezone}</td>
                                        <td className="ta-center">
                                            <Button id="btn-generate" className="ops-sched-btn" type="submit" onClick={() => { this.props.history.push(global.links.ops_schedule_form + list.id) }}><i className="fa fa-pencil-square-o ev-color" /></Button>&nbsp;&nbsp;
                                            <Button id="btn-generate" className="ops-sched-btn" type="submit" onClick={() => { setFieldValue("action", "delete"); setFieldValue("ops_sched_id", list.id); }}><i className="fa fa-times ev-color" /></Button>
                                        </td>
                                    </tr>
                                })}
                                </tbody>
                            </table>
                            </div></Row>) : (<div className="pd20">Sorry, no record found</div>)}
                    </div>
                </ContainerWrapper>
                </Wrapper>
            </form>
		)}</Formik>);
	}
}

const mapStateToProps = (state) => {
    return {
        settings          : state.settings,
        opsScheduleList   : state.opsSchedule,
        constant          : state.constant,
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        fetchOpsSchedulesList   : ( params ) => dispatch( fetchOpsSchedulesList( params ) ),
        deleteOpsSchedule       : ( params ) => dispatch( deleteOpsSchedule( params ) ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OpsScheduleList);