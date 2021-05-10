import React, { Component } from "react";
import { Link } from "react-router-dom";
import "./PageNotFound.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class PageNotFound extends Component {
  render() {
    return  <ContainerWrapper>
                <ContainerHeader>
                  <div className="page-not-found-box">
                    <span className="page-not-found-code"> 404 </span>
                    <br/>
                    <span className="page-not-found-message">We can't seem to find the page you're looking for.</span>
                    <br/>
                    <br/>
                        <Link className="btn btn-primary" to={ global.links.dashboard }>
                          <i className="fa fa-arrow-circle-left" />
                          &nbsp; Go back to Dashboard
                        </Link>
                    <br/>
                    <br/>
                  </div>
                </ContainerHeader>                
            </ContainerWrapper>;
  }
}

export default PageNotFound;








