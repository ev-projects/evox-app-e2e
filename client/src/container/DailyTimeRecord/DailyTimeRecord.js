import React, { Component } from "react";
import "./DailyTimeRecord.css";
import { viewEmployeeDtr } from '../../store/actions/dtrActions';
import { Container,Row,Col,Table,Image, Spinner } from 'react-bootstrap';
import { connect } from 'react-redux'
import { fetchUser } from '../../store/actions/userActions'

class DailyTimeRecord extends Component {
    constructor(props){
      super(props)
    }

  componentWillMount(){
    this.props.viewEmployeeDtr();
  }

  convertDate(dateStr){
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    var d = new Date(dateStr);

    return monthNames[d.getMonth()] + ' ' + d.getDay() ;
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
        schedule = this.convertToTime(dtr.start_datetime)+ ' - '+this.convertToTime(dtr.end_datetime);
    }
    return schedule;
  }

  convertToTime(dateStr){
    var d = new Date(dateStr);
    return  ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) +':'+   ('0' + d.getSeconds()).slice(-2) ;
  }

    render(){
        if(this.props.dtr.isDtrLoaded){
            console.log(this.props);
    return (
      <Container>
        <Row>
            <div>
                <h1>&nbsp;</h1>
            </div>
        </Row>
        <Row>
            <Col sm={12} >
                <div className="header">
                    <h1>
                      <i class="fa fa-clock-o"></i> Recent Daily Time Records
                    </h1>
                </div>
                <Table striped responsive hover>
                    <thead>
                        <tr>
                            <th><i class="fa fa-calendar"></i> Date</th>
                            <th><i class="fa fa-calendar"></i> Schedule</th>
                            <th><i class="fa fa-clock-o"></i> Clock</th>
                            <th><i class="fa fa-hourglass-end"></i> Late</th>
                            <th><i class="fa fa-hourglass-start"></i> Undertime</th>
                            <th><i class="fa fa-moon-o"></i> NightDiff</th>
                            <th><i class="fa fa-hourglass"></i> Overtime</th>
                            <th><i class="fa fa-hourglass"></i> OT w/ ND</th>
                        </tr>
                    </thead>
                    <tbody>
            {this.props.dtr.list.map((dtr, index) => {
                  return <tr><td>{this.convertDate(dtr.date)}</td><td><div>{this.stdSchedule(dtr)}</div><div>{this.flexySchedule(dtr)}</div></td><td>{dtr.time_in} {dtr.time_out}</td><td></td><td></td><td></td><td></td><td></td></tr>
            })}
                    </tbody>
                </Table>
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
    viewEmployeeDtr : () => dispatch( viewEmployeeDtr() ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DailyTimeRecord);
