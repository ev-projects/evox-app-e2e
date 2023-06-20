import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./OpsSchedule.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class OpsSchedule extends Component {
  render() {
    return  <ContainerWrapper> 

	<h2 className="header_text">EV Support Team Schedule</h2>
	
	<div className="ops-schedule header_text">
		<div className="row">
			<div className="col-6 col-lg-6 col-md-6 col-sm-12">
				<div className="row card">
					<div className="col-11 card-body">
						<div className="h3">IT Department</div>
						<p>For IT concerns please send an email or chat us via google chat at helpdesk@eastvantage.com</p>
						<img src="/images/ITSched.png" width="100%" />
					</div><br/>

					<div className="col-11 card-body">
						<div className="h3">Finance Department</div>
						<p>For finance-related concerns, please refer to the email addresses indicated in the table below.</p>
						<table width="100%" cellpadding="5" border="1">
							<thead>
								<tr>
									<th>Domain</th>
									<th>Email Address</th>
									<th>Scope</th>
									<th>Support</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td><b>Billing and Collection</b></td>
									<td>billing@eastvantage.com</td>
									<td>
										<ul className="margin-hrem">
											<li>Invoicing</li>
											<li>Billing Computation</li>
										</ul>
									</td>
									<td>
										<ul className="margin-hrem">
											<li>Susan Calderon</li>
											<li>Jeanny Alarcon</li>
										</ul>
									</td>
								</tr>

								<tr>
									<td><b>Accounts Payable</b></td>
									<td>payable@eastvantage.com</td>
									<td>
										<ul className="margin-hrem">
											<li>Payments</li>
										</ul>
									</td>
									<td>
										<ul className="margin-hrem">
											<li>Monet Villanueva</li>
											<li>Anthony Ida</li>
										</ul>
									</td>
								</tr>

								<tr>
									<td><b>Administration</b></td>
									<td>admin@eastvantage.com</td>
									<td>
										<ul className="margin-hrem">
											<li>Mobile Plans</li>
											<li>Bookings</li>
											<li>Business Trips</li>
											<li>Visa</li>
										</ul>
									</td>
									<td>
										<ul className="margin-hrem">
											<li>Pam Sanchez</li>
										</ul>
									</td>
								</tr>

								<tr>
									<td><b>Procurement</b></td>
									<td>procurement@eastvantage.com</td>
									<td>
										<ul className="margin-hrem">
											<li>Procurement</li>
										</ul>
									</td>
									<td rowspan="2">
										<ul className="margin-hrem">
											<li>Ivan Batle</li>
										</ul>
									</td>
								</tr>

								<tr>
									<td><b>Facilities</b></td>
									<td>facilities@eastvantage.com</td>
									<td>
										<ul className="margin-hrem">
											<li>Office Concerns</li>
										</ul>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="col-6 col-lg-6 col-md-6 col-sm-12">

				<div className="row card">
					<div className="col-11 card-body">
						<div className="h3">Shared Services</div>
						<p>For issues, inquiries or requests, please reach us via email below.</p>
						<table width="100%" cellpadding="5" border="1">
							<thead>
								<tr>
									<th>Department</th>
									<th>POC</th>
									<th>Schedule</th>
									<th>Contact Info</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td rowspan="7">HR</td>
									<td>Hardy Jacob<br/><small>HR Head</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
									<td rowspan="7">happiness@eastvantage.com</td>
								</tr>
								<tr>
									<td>Precious Delos Reyes<br/><small>HR Manager</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>
								<tr>
									<td>Justin Loayon<br/><small>HR Service Delivery Officer</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>
								<tr>
									<td>Jengel Perez<br/><small>HR Generalist</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>
								<tr>
									<td>Joemark Delima<br/><small>HR Project and Service Delivery Officer</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>
								<tr>
									<td>Patrick Pineda<br/><small>Learning and Development Lead</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>
								<tr>
									<td>Yong Mustard<br/><small>Happiness Ambassador</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>

								<tr>
									<td rowspan="2">Recruitment</td>
									<td>Precious Balbedina<br/><small>CRM Recruitment Lead</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
									<td rowspan="2">recruit@eastvantage.com</td>
								</tr>
								<tr>
									<td>MJ Visitacion<br/><small>Tech Recruitment Lead</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
								</tr>

								<tr>
									<td>Procurement</td>
									<td>Ivan Batle<br/><small>Senior Procurement Officer</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
									<td>procurement@eastvantage.com</td>
								</tr>

								<tr>
									<td rowspan="3">Facilities</td>
									<td>Ivan Batle<br/><small>Senior Procurement Officer</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
									<td rowspan="3">facilities@eastvantage.com</td>
								</tr>
								<tr>
									<td>Jonathan Dogillo<br/><small>Facilities/Messenger</small></td>
									<td><small>M-F <br/>8am-5pm</small></td>
								</tr>
								<tr>
									<td>Wilma Español<br/><small>Facilities</small></td>
									<td><small>M-F <br/>7am-4pm</small></td>
								</tr>

								<tr>
									<td>Projects<br/><small>(EVOX & NEO)</small></td>
									<td>Vishnu Padmanabhan<br/><small>Global Software Lead</small></td>
									<td><small>M-F <br/>9am-6pm</small></td>
									<td>evox@eastvantage.com</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>

	</ContainerWrapper>;
  }
}

export default OpsSchedule;








