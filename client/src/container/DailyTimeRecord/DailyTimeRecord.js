import { viewEmployeeDtr } from '../../store/actions/dtrActions';
import { fetchUser } from '../../store/actions/userActions'

import React, { Component } from "react";
import "./DailyTimeRecord.css";

import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';
import { connect } from 'react-redux';
import DtrFormatter from '../../services/DtrFormatter';

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
            <Container>
                <Row>
                    <div>
                    <h1>&nbsp;</h1>
                    </div>
                </Row>
                <Row>
                <Col sm={12} >
                <div className="white_bg">
                    <div className="header">
                        <h1>
                            <i class="fa fa-clock-o"></i> Recent Daily Time Records
                        </h1>
                    </div>
                <div className="body">
                <Table striped responsive hover>
                    <thead>
                        <tr>
                            <th><i class="fa fa-calendar"></i> Date</th>
                            <th><i class="fa fa-calendar"></i> Status</th>
                            <th><i class="fa fa-calendar"></i> Schedule</th>
                            <th><i class="fa fa-clock-o"></i> Clock In</th>
                            <th><i class="fa fa-clock-o"></i> Clock Out</th>
                            <th><i class="fa fa-hourglass-end"></i> Late</th>
                            <th><i class="fa fa-hourglass-start"></i> Undertime</th>
                            <th><i class="fa fa-moon-o"></i> NightDiff</th>
                            <th><i class="fa fa-hourglass"></i> Overtime</th>
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.dtr.list.map((dtr, index) => {
                          return <tr className="center">
                          <td>{DtrFormatter.displayDate(dtr.date)}</td> 
                          <td><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div></td>
                          <td><div>{DtrFormatter.displaySchedule(dtr)}</div></td>
                          <td><div>{DtrFormatter.displayLog(dtr.time_in)}</div></td>
                          <td><div>{DtrFormatter.displayLog(dtr.time_out)}</div></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          </tr>
                    })}
                    </tbody>
                </Table>
                </div>
                </div>
                </Col>
                </Row>
            </Container>          
        );
        }
        return <div></div>;
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
