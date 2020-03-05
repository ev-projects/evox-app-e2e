import React, { Component } from "react";
import "./Dashboard.css";
import { Container,Row,Col,Table,Image, Spinner } from 'react-bootstrap';
import { connect } from 'react-redux'
import { fetchUser } from '../../store/actions/userActions'

class Dashboard extends Component {
    constructor(props){
      super(props)
    }
    
    render(){
      const { user } = this.props;
      const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

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
                        <tr>
                            <td>Jan 22</td>
                            <td>00:00:00 00:00:00</td>
                            <td>00:00:00 00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                        </tr>
                        <tr>
                            <td>Jan 21</td>
                            <td>00:00:00 00:00:00</td>
                            <td>00:00:00 00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                            <td>00:00:00</td>
                        </tr>
                    </tbody>
                </Table>
            </Col>
        </Row>
        <Row>
            <Col sm={9}>
                <div className="header">
                    <h1>
    	    		<i class="fa fa-history"></i> Recent Pending Requests
    	  			</h1>
                </div>
                <Table striped responsive hover>
                    <tbody>
                        <tr>
                            <td>Jan 22</td>
                            <td><i class="fa fa-user"></i> Breggie Pasatiempo</td>
                            <td>ACE - Ace Displays</td>
                            <td><i class="fa fa-pencil-square-o"></i> Alteration</td>
                        </tr>
                        <tr>
                            <td>Jan 21</td>
                            <td><i class="fa fa-user"></i> Aaron Colina</td>
                            <td>BDG - Boondoggle</td>
                            <td><i class="fa fa-calendar-check-o"></i> Change of Sched</td>
                        </tr>
                        <tr>
                            <td>Jan 21</td>
                            <td><i class="fa fa-user"></i> Ritchie Soriano</td>
                            <td>GfM - Gesellschaft für</td>
                            <td><i class="fa fa-pencil-square-o"></i> Alteration</td>
                        </tr>
                        <tr>
                            <td>Jan 21</td>
                            <td><i class="fa fa-user"></i> Carmela Garcia</td>
                            <td>HTF - Hard To Find</td>
                            <td><i class="fa fa-calendar-check-o"></i> Change of Sched</td>
                        </tr>
                        <tr>
                            <td>Jan 21</td>
                            <td><i class="fa fa-user"></i> John Doe</td>
                            <td>OTM - Optimy</td>
                            <td><i class="fa fa-pencil-square-o"></i> Rest Day Work</td>
                        </tr>
                    </tbody>
                </Table>
            </Col>
            <Col sm={3}>
                <div className="header">
                    <h1>
    		    	<i class="fa fa-book"></i> Evox Manual
    		  		</h1>
                </div>
            </Col>
        </Row>
    </Container>          
        );
    }
};

const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
