import { viewEmployeeDtr } from '../../store/actions/dtrActions';
import { fetchUser } from '../../store/actions/userActions'

import React, { Component } from "react";
import "./DailyTimeRecord.css";

import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';
import { connect } from 'react-redux'

class DailyTimeRecord extends Component {
    constructor(props){
        super(props)
    }

    componentWillMount(){
        this.props.viewEmployeeDtr(this.props.params.id,this.props.params.from,this.props.params.to);
    }

    convertDate(dateStr){
        var date = '';

        if(dateStr!=null){
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var d = new Date(dateStr);
            date = monthNames[d.getMonth()] + ' ' + d.getDate() ;
        }

        return date;
    }

    stdSchedule(dtr){
        var schedule = '';
        if(dtr.start_datetime!=null&&dtr.end_datetime!=null){
            schedule = this.convertToTime(dtr.start_datetime)+ ' - '+this.convertToTime(dtr.end_datetime);
        }
        return schedule;
    }

    flexySchedule(dtr){
        var schedule = '';
        if(dtr.start_flexy_datetime!=null&&dtr.end_flexy_datetime!=null){
            schedule = this.convertToTime(dtr.start_flexy_datetime)+ ' - '+this.convertToTime(dtr.end_flexy_datetime);
        }
        return schedule;
    }

    convertToTime(dateStr){
        var time = '';

        if(dateStr!=null){
            var d = new Date(dateStr);
            time =   ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) +':'+   ('0' + d.getSeconds()).slice(-2) ;
        }
        return time;
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
                            <th><i class="fa fa-calendar"></i> Schedule</th>
                            <th><i class="fa fa-clock-o"></i> Clock In</th>
                            <th><i class="fa fa-clock-o"></i> Clock Out</th>
                            <th><i class="fa fa-hourglass-end"></i> Late</th>
                            <th><i class="fa fa-hourglass-start"></i> Undertime</th>
                            <th><i class="fa fa-moon-o"></i> NightDiff</th>
                            <th><i class="fa fa-hourglass"></i> Overtime</th>
                            <th><i class="fa fa-hourglass"></i> OT w/ ND</th>
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.dtr.list.map((dtr, index) => {
                          return <tr className="center"><td>{this.convertDate(dtr.date)}</td><td><div>{this.stdSchedule(dtr)}</div><div>{this.flexySchedule(dtr)}
                          </div></td><td><div>{this.convertToTime(dtr.time_in)}</div><div>{this.convertDate(dtr.time_in)}</div></td>
                          <td><div>{this.convertToTime(dtr.time_out)}</div><div>{this.convertDate(dtr.time_out)}</div></td><td></td><td></td><td></td><td></td><td></td></tr>
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
