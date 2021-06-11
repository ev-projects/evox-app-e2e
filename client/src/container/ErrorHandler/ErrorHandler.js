import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./ErrorHandler.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import { Link } from "react-router-dom";

class ErrorHandler extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	  }
	
	  componentDidCatch(error, info) {
		this.setState({ hasError: true });
	  }

	  render() {
		if (this.state.hasError) {
			return  <ContainerWrapper>
						<ContainerHeader>
						<div className="page-not-found-box">
							<span className="page-not-found-code"> 500 </span>
							<br/>
							<span className="page-not-found-message">Something went wrong. Please contact the administrator</span>
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
		return <div>{this.props.children}</div>;
	  }
	}

export default ErrorHandler;








