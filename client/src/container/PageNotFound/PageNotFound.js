import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./PageNotFound.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class PageNotFound extends Component {
  render() {
    return  <ContainerWrapper>
                <ContainerHeader>
                    Error 404
                </ContainerHeader>                
            </ContainerWrapper>;
  }
}

export default PageNotFound;








