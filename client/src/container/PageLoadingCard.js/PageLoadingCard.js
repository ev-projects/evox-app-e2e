import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./PageLoadingCard.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class PageLoadingCard extends Component {
  render() {
    return<Col sm={10} className="mt-3">
	                <div className="linear-background1 header-loader1"></div>
					<div className="linear-background1"></div>
                    <div className="linear-background1"></div>
			</Col>        
     
  }
}

export default PageLoadingCard;