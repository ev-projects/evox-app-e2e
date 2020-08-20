import React, { Component } from "react";
import "./Dashboard.css";
import { Container,Row,Col,Table,Image, Spinner } from 'react-bootstrap';
import { connect } from 'react-redux';
import { fetchUser } from '../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";

class Dashboard extends Component {
    constructor(props){
      super(props)
    }
    
    render(){
      const { user } = this.props;
      const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

        return (
            <Wrapper>
               <ContainerWrapper>
                  <ContainerHeader>
                      Dashboard
                  </ContainerHeader>
                  <ContainerBody>
                      <Content col="12" title="Daily Time Record">
                          <Table striped responsive hover>
                              <thead>
                                  <tr>
                                      <th><i className="fa fa-calendar"></i> Date</th>
                                      <th><i className="fa fa-calendar"></i> Schedule</th>
                                      <th><i className="fa fa-clock-o"></i> Clock</th>
                                      <th><i className="fa fa-hourglass-end"></i> Late</th>
                                      <th><i className="fa fa-hourglass-start"></i> Undertime</th>
                                      <th><i className="fa fa-moon-o"></i> NightDiff</th>
                                      <th><i className="fa fa-hourglass"></i> Overtime</th>
                                      <th><i className="fa fa-hourglass"></i> OT w/ ND</th>
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
                                      <td>Jan 22</td>
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
                      </Content>
                      <Content col="12" title="Pending Request">
                          <Table striped responsive hover>
                              <tbody>
                                  <tr>
                                      <td>Jan 22</td>
                                      <td><i className="fa fa-user"></i> Breggie Pasatiempo</td>
                                      <td>ACE - Ace Displays</td>
                                      <td><i className="fa fa-pencil-square-o"></i> Alteration</td>
                                  </tr>
                                  <tr>
                                      <td>Jan 21</td>
                                      <td><i className="fa fa-user"></i> Aaron Colina</td>
                                      <td>BDG - Boondoggle</td>
                                      <td><i className="fa fa-calendar-check-o"></i> Change of Sched</td>
                                  </tr>
                                  <tr>
                                      <td>Jan 21</td>
                                      <td><i className="fa fa-user"></i> Ritchie Soriano</td>
                                      <td>GfM - Gesellschaft für</td>
                                      <td><i className="fa fa-pencil-square-o"></i> Alteration</td>
                                  </tr>
                                  <tr>
                                      <td>Jan 21</td>
                                      <td><i className="fa fa-user"></i> Carmela Garcia</td>
                                      <td>HTF - Hard To Find</td>
                                      <td><i className="fa fa-calendar-check-o"></i> Change of Sched</td>
                                  </tr>
                                  <tr>
                                      <td>Jan 21</td>
                                      <td><i className="fa fa-user"></i> John Doe</td>
                                      <td>OTM - Optimy</td>
                                      <td><i className="fa fa-pencil-square-o"></i> Rest Day Work</td>
                                  </tr>
                              </tbody>
                          </Table>
                      </Content>
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
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
