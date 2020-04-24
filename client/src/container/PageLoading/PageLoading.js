import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./PageLoading.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class PageLoading extends Component {
  render() {
    return  <ContainerWrapper>
    			<Col sm={10}>
	                <div className="linear-background header-loader"></div>
					<div className="linear-background"></div>
					<div className="linear-background"></div>
					<div className="linear-background"></div>       
				</Col>        
            </ContainerWrapper>;
  }
}

export default PageLoading;








