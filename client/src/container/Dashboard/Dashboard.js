import React, { Component } from "react";
import "./Dashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import ReactPlayer from 'react-player/lazy';
import * as yup from "yup";
import EmployeeDashboard from "../../components/Dashboard/EmployeeDashboard";
import Authenticator from "../../services/Authenticator";
import HandlerDashboard from "../../components/Dashboard/HandlerDashboard";
class Dashboard extends Component {
    constructor(props){
      super(props);
    }
    
    render(){
     
      const { user } = this.props;

        return  <Wrapper {...this.props} >
                    <ContainerWrapper className="full-wrapper">
                      <ContainerBody>
                        
                        {Authenticator.check(['employee'], ['employee_access']) ? 
                            <EmployeeDashboard {...this.props} />
                            :
                            (null)
                        }
                        {/* { Authenticator.check(['supervisor', 'team_leader', 'client'], ['supervisor_access', 'team_leader_access', 'client_access']) ? 
                          <HandlerDashboard {...this.props} />
                          :
                          null
                        } */}
                      </ContainerBody>
                  </ContainerWrapper>
                </Wrapper>;
    }
};

const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}

export default connect(mapStateToProps, null)(Dashboard);
