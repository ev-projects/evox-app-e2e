import React, { Component } from "react";
import "./Dashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { fetchUser } from '../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import QuickPunch from "../../container/QuickPunch";

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
                      <Row>
                      
                        <div className="col-lg-4" >
                            <QuickPunch/>
                        </div>
                        </Row>
                        <Row>
                            
                        </Row>
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
