import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./WorkFromHome.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";

class WorkFromHome extends Component {
  render() {
    return  <Wrapper>
      <ContainerWrapper>       
    		  <Content col="8" title="Work From Home">
              </Content>
      </ContainerWrapper>
    </Wrapper>;
  }
}

export default WorkFromHome;








