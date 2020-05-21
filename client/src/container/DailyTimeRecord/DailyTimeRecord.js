import { viewEmployeeDtr } from '../../store/actions/dtrActions';
import { fetchUser } from '../../store/actions/userActions'

import React, { Component } from "react";
import "./DailyTimeRecord.css";

import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';
import { connect } from 'react-redux';
import DtrFormatter from '../../services/DtrFormatter';
import { Link } from "react-router-dom"; 
import { ContainerHeader,Content,ContainerWrapper } from '../../components/GridComponent/AdminLte.js';
import PageLoading from "../PageLoading";

class DailyTimeRecord extends Component {

    constructor(props){
        super(props)
    }

    componentWillMount(){
        this.props.viewEmployeeDtr(this.props.params.id,this.props.params.from,this.props.params.to);
    }

    render(){
        if(this.props.dtr.isDtrLoaded){
        return (
            <ContainerWrapper>
              <Content col="12" title="Daily Time Record">
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th><i className="fa fa-calendar"></i> Date</th>
                            <th><i className="fa fa-calendar"></i> Status</th>
                            <th><i className="fa fa-calendar"></i> Schedule</th>
                            <th><i className="fa fa-clock-o"></i> Clock In</th>
                            <th><i className="fa fa-clock-o"></i> Clock Out</th>
                            <th><i className="fa fa-hourglass-end"></i> Late</th>
                            <th><i className="fa fa-hourglass-start"></i> Undertime</th>
                            <th><i className="fa fa-moon-o"></i> NightDiff</th>
                            <th><i className="fa fa-hourglass"></i> Overtime</th>
                            <th><i className="fa fa-hourglass"></i> OT w/ Nightdiff</th>
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.dtr.list.map((dtr, index) => {
                          return <tr className={"center "+dtr.attendance_status.slug+"-bg-color"}>
                                  <td>{DtrFormatter.displayDate(dtr.date)}</td> 
                                  <td><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></td>
                                  <td><div>{DtrFormatter.displaySchedule(dtr)}</div></td>
                                  <td><div>{DtrFormatter.displayLog(dtr.time_in)}</div></td>
                                  <td><div>{DtrFormatter.displayLog(dtr.time_out)}</div></td>
                                  <td>{dtr?.payroll_items?.late}</td>
                                  <td>{dtr?.payroll_items?.undertime}</td>
                                  <td>{dtr?.payroll_items?.night_diff}</td>
                                  <td>{dtr?.payroll_items?.overtime}</td>
                                  <td>{dtr?.payroll_items?.overtime_night_diff}</td>
                                  <td><Link className="btn btn-primary" 
                                            title="Alter Log"
                                            to={{
                                              pathname: global.base_url +'request/AlterLog/', 
                                              date: dtr.date,
                                              current_time_in: dtr.time_in,
                                              current_time_out: dtr.time_out
                                            }}
                                      >
                                        <i className="fa fa-edit" 
                                           style={{color : "white" }}></i>
                                        </Link></td>
                                </tr>
                    })}
                    </tbody>
                </Table>
              </Content>
            </ContainerWrapper>          
        );
        }
        return <PageLoading/>;
    }
};

const mapStateToProps = (state) => {
  return {
      dtr : state.dtr
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() ),
    viewEmployeeDtr : (id,from,to) => dispatch( viewEmployeeDtr(id,from,to) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DailyTimeRecord);
