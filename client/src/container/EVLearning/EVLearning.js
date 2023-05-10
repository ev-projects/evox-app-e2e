import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./EVLearning.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';

class EVLearning extends Component {
  render() {
    return  <ContainerWrapper> 

<div className="evlearning_content">

	<div className="el-title">Guidelines</div>
	<img src="/images/ev-learning.png" alt="User Image"/>
	<ol>
	  <li>Make sure to register via your work email address before working on a course.</li>
	  <li>Once the course is completed, please send the total hours spent plus the screenshot for completion per completed course or&nbsp;forward the email notification that the e-learning site will send you after completing the course to happiness@eastvantage.com</li>
	  <li>The targeted hours of completion is 10 hours until December 31 - spend a minimum of 1&nbsp;hour&nbsp;per month.</li>
	  <li>If you are unable to access the website because it is generating errors, or if&nbsp;the video is blocked,&nbsp;please send an email to happiness@eastvantage.com </li>
	</ol>
	<p>&nbsp;</p>
	<ul className="el-nav">
	  <li><a href="#general">General</a></li>
	  <li><a href="#happiness">Happiness</a></li>
	  <li><a href="#crm">CRM/Business Support</a></li>
	  <li><a href="#tech">Tech/ICT</a></li>
	  <li><a href="#sales">Sales &amp; Marketing</a></li>
	  <li><a href="#recruitment">Recruitment</a></li>
	  <li><a href="#ops">Operations</a></li>
	  <li><a href="#finance">Finance</a></li>
	  <li><a href="#project">Project Management</a></li>
	  <li><a href="#leadership">Leadership</a></li>
	</ul>
	{/* start list */}
	<div className="list">
	<a id="general" name="general" />
	  <div className="el-title">General</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/uva-darden-design-thinking-innovation" target="_blank">Design Thinking for Innovation</a></li>
			<li><a href="https://www.coursera.org/learn/negotiation-skills" target="_blank">Negotiation Skills and Strategies</a></li>
			<li><a href="https://www.coursera.org/learn/understanding-arguments" target="_blank">Critical Thinking</a></li>
			<li><a href="https://www.coursera.org/learn/inductive-reasoning?recoOrder=11&utm_medium=email&utm_source=recommendations&utm_campaign=juWqgKzNEempyReieZALEQ">Inductive Reasoning</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/creative-problem-solving?recoOrder=23&utm_medium=email&utm_source=recommendations&utm_campaign=L-H_kO1EEemHRdu0lvjSqg">Creative Problem Solving</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/mindfulness" target="_blank">Mindfulness</a></li>
			<li><a href="https://www.coursera.org/learn/mindshift?recoOrder=10&utm_medium=email&utm_source=recommendations&utm_campaign=4EV2EIu5EemdOAf9ya7Q1g">Mindshift: Overcoming Obstacles</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/learn-chinese" target="_blank">Chinese for Beginners</a></li>
			<li><a href="https://www.coursera.org/learn/learn-korean" target="_blank">Korean for Beginners</a></li>
			<li><a href="https://www.coursera.org/learn/etudier-en-france" target="_blank">French - Intermediate</a></li>
			<li><a href="https://www.coursera.org/learn/communicate-with-impact?utm_medium=email&utm_source=marketing&utm_campaign=A8asML8OEempyReieZALEQ" target="_blank">Communicate with Impact</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/resume/courses/1471" target="_blank">Effective Business Writing</a></li>
			<li><a href="https://alison.com/resume/courses/1438" target="_blank">Critical Thinking for Managers</a></li>
			<li><a href="https://alison.com/resume/courses/1351" target="_blank">Introduction to Supply Chain Management</a></li>
			<li><a href="https://alison.com/resume/courses/336" target="_blank">All About the Customer</a></li>
			<li><a href="https://alison.com/resume/courses/1472" target="_blank">Improve Your Business Writing and Presentation Skills</a></li>
			<li><a href="https://alison.com/topic/learn/36321/engage-in-informational-interviews" target="_blank">Planning your Career Path</a></li>
			<li><a href="https://alison.com/topic/learn/77683/welcome-to-motivation" target="_blank">Motivating Yourself and Others</a></li>
			<li><a href="https://alison.com/courses/language" target="_blank">B</a><a href="https://alison.com/topic/learn/50644/basic-spanish-learning-outcomes" target="_blank">asic Spanish</a></li>
			<li><a href="https://alison.com/topic/learn/55409/learning-outcomes" target="_blank">Introduction to French</a></li>
			<li><a href="https://alison.com/topic/learn/41296/all-my-colours-part-1" target="_blank">Basic German</a></li>
			<li><a href="https://alison.com/topic/learn/50634/basic-spanish-learning-outcomes" target="_blank">Introduction to Spanish</a></li>
			<li><a href="https://alison.com/topic/learn/65395/module-1-learning-outcomes" target="_blank">Introduction to Japanese</a></li>
			<li><a href="https://alison.com/topic/learn/65533/module-1-learning-outcomes" target="_blank">Basic Japanese</a></li>
			<li><a href="https://alison.com/topic/learn/50298/basic-chinese-first-contact-learning-outcomes" target="_blank">Introduction to Chinese</a></li>
			<li><a href="https://alison.com/courses/german" target="_blank">Conversational German</a></li>
			<li><a href="https://alison.com/courses/photography" target="_blank">Photography</a></li>
			<li><a href="https://alison.com/courses/entrepreneurship" target="_blank">Toolkit for Entrepreneurship</a></li>
			<li><a href="https://alison.com/topic/learn/76944/dealing-with-difficult-people-learning-outcomes" target="_blank">How to deal with difficult people</a></li>
			<li><a href="https://alison.com/topic/learn/75022/introduction-to-persuasion-learning-outcomes" target="_blank">How to be an Influencer</a></li>
			<li><a href="https://alison.com/course/microsoft-excel-2013-for-beginners-start-your-excel-journey">Learn how to use Basic MS excel</a></li>
			<li><a href="https://alison.com/course/introduction-to-excel-2013-power-business-intelligence">Business Intelligence through MS excel</a></li>
			<li><a href="https://alison.com/course/data-analysis-with-tables-and-pivottables-in-microsoft-excel-2013">Learn Data Analysis and Pivot Table on MS excel</a></li>
			<li><a href="https://alison.com/topic/learn/75887/prerequisites-of-excel-2013-advanced-course">MS Excel&nbsp;Advanced&nbsp;Worksheets&nbsp;<em>(new)</em></a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/successful-negotiation?utm_campaign=Courses+feed&utm_medium=courses-feed&utm_source=courses-feed&utm_source=RakutenMarketing&utm_medium=Affiliate&utm_campaign=3347507:Class+Central&utm_content=10:1&utm_term=USNetwork&ranMID=44015&ranEAID=SAyYsTvLiGQ&ranSiteID=SAyYsTvLiGQ-Vygt7AMn3FWb8zO0q2V5xQ">Successful Negotiations Strategies</a> <em>(new)</em></li>
			<li><a href="https://www.futurelearn.com/courses/planning-your-personal-development" target="_blank">Planning Your Growth</a></li>
			<li><a href="https://www.futurelearn.com/courses/creative-problem-solving" target="_blank">Using Creative Problem Solving for everyday life</a></li>
			<li><a href="https://www.futurelearn.com/courses/mindfulness-life" target="_blank">Achieving&nbsp;Mindfulness</a></li>
			<li><a href="https://www.futurelearn.com/programs/italian-for-beginners" target="_blank">Italian for Beginners</a></li>
			<li><a href="https://www.futurelearn.com/programs/spanish-for-beginners" target="_blank">Spanish for Beginners</a></li>
			<li><a href="https://www.futurelearn.com/courses/introduction-to-korean" target="_blank">Korean for Beginners</a></li>
			<li><a href="https://www.futurelearn.com/courses/german-intermediate-1" target="_blank">German - Intermediate</a></li>
			<li><a href="https://www.futurelearn.com/courses/education-for-all" target="_blank">Diversity and Inclusion</a></li>
			<li><a href="https://www.futurelearn.com/courses/logical-and-critical-thinking" target="_blank">Improving&nbsp;your Logical and Critical Thinking Skills</a></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="happiness" name="happiness" />
	  <div className="el-title">Happiness</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/the-science-of-well-being" target="_blank">The Science of Well-Being</a></li>
			<li><a href="https://www.coursera.org/learn/learning-how-to-learn" target="_blank">Powerful Mental Tools</a></li>
			<li><a href="https://www.coursera.org/learn/positive-psychiatry" target="_blank">Positive Mental Health</a></li>
			<li><a href="https://www.coursera.org/learn/happiness" target="_blank">Achieve Happiness and Fulfillment</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/resume/courses/109" target="_blank">Workstation Ergonomics</a></li>
			<li><a href="https://alison.com/course/drug-free-workplace" target="_blank">A Drug-Free Workplace</a></li>
			<li><a href="https://alison.com/course/stress-management-techniques-for-coping-with-stress-revised">Stress Management: Techniques in coping with stress</a> <em>(new)</em></li>
			<li><a href="https://alison.com/course/achieving-personal-success">Achieving Personal Success</a><em> (new)</em></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/introduction-to-work-and-wellbeing-at-work" target="_blank">Well-being at Work</a></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="crm" name="crm" />
	  <div className="el-title">CRM / Business Support</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li>&nbsp;</li>
			<li><a href="https://www.thetrainingbank.com/customer-focus/online-training/the-basics/" target="_blank">Basic CS Training</a></li>
			<li><a href="http://www.crmlearning.com/Handling-Difficult-Customers-C8830.aspx" target="_blank">Handling Difficult Customers</a></li>
			<li><a href="https://www.coursera.org/learn/negotiation-skills-conflict?ranMID=40328&ranEAID=SAyYsTvLiGQ&ranSiteID=SAyYsTvLiGQ-.GU.4g6W9lWuCUXpgWlI_Q&siteID=SAyYsTvLiGQ-.GU.4g6W9lWuCUXpgWlI_Q&utm_content=10&utm_medium=partners&utm_source=linkshare&utm_campaign=SAyYsTvLiGQ">Resolving Conflict in the Team</a>&nbsp;<em>(new)</em></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/resume/courses/1471" target="_blank">Effective Business Writing</a></li>
			<li><a href="https://alison.com/resume/courses/1438" target="_blank">Critical Thinking for Managers</a></li>
			<li><a href="https://alison.com/resume/courses/1351" target="_blank">Introduction to Supply Chain Management</a></li>
			<li><a href="https://alison.com/resume/courses/336" target="_blank">All About the Customer</a></li>
			<li><a href="https://alison.com/resume/courses/1472" target="_blank">Improve Your Business Writing and Presentation Skills</a></li>
			<li><a href="https://alison.com/courses/language" target="_blank">Foreign Language Learning</a></li>
			<li><a href="https://www.classcentral.com/course/futurelearn-digital-skills-retail-9781" target="_blank">Digital Skills for Retail&nbsp;</a></li>
			<li><a href="https://www.classcentral.com/course/futurelearn-digital-skills-grow-your-career-9776" target="_blank">Growing your career in Technology</a></li>
			<li><a href="https://alison.com/course/microsoft-excel-2013-for-beginners-start-your-excel-journey">Learn how to use Basic MS excel</a></li>
			<li><a href="https://alison.com/course/introduction-to-excel-2013-power-business-intelligence">Business Intelligence through MS excel</a></li>
			<li><a href="https://alison.com/course/data-analysis-with-tables-and-pivottables-in-microsoft-excel-2013">Learn Data Analysis and Pivot Table on MS excel</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/intercultural-communication" target="_blank">Intercultural Communication</a></li>
			<li><a href="https://www.futurelearn.com/courses/fashion-innovation" target="_blank">Innovations in the Fashion Industry</a></li>
			<li><a href="https://www.futurelearn.com/courses/growing-as-a-manager" target="_blank">Growing as a Manager</a></li>
			<li><a href="https://www.futurelearn.com/courses/planning-your-personal-development" target="_blank">Planning Your Growth</a></li>
			<li><a href="https://www.futurelearn.com/programs/blended-learning-essentials" target="_blank">Blended Manager's Toolkit</a></li>
			<li><a href="https://www.futurelearn.com/courses/logical-and-critical-thinking">Logic and Critical Thinking</a> <em>(new)</em></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="tech" name="tech" />
	  <div className="el-title">ICT / Technology</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/2-speed-it" target="_blank">Two Speed IT: How Companies Can Surf the Digital Wave</a></li>
			<li><a href="https://www.coursera.org/learn/security-safety-globalized-world" target="_blank">Information Security</a></li>
			<li><a href="https://www.coursera.org/learn/cyber-conflicts" target="_blank">International Cyber Conflicts</a></li>
			<li><a href="https://www.coursera.org/learn/security-safety-globalized-world" target="_blank">Security &amp; Safety Challenges</a></li>
			<li><a href="https://www.coursera.org/learn/preparing-cloud-associate-cloud-engineer-exam?utm_medium=email&utm_source=marketing&utm_campaign=A8asML8OEempyReieZALEQ" target="_blank">Preparation for Google Cloud Associate Cloud Engineer Exam</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/course/adobe-photoshop-cs6-essential-tools-revised">Adobe Photoshop CS6 Essential Tools</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/resume/courses/384">Google Apps for Business</a> <em>(new)</em></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/gdpr" target="_blank">Understanding GDPR</a></li>
			<li><a href="https://www.futurelearn.com/degrees/deakin-university/cyber-security">Cyber Security</a><em> (new)</em></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}
{/* start list */}
	<div className="list"><a id="sales" name="sales" />
	  <div className="el-title">Sales and Marketing</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"> <span><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></span></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/negotiation" target="_blank">Introduction to Negotiations</a></li>
			<li><a href="https://www.coursera.org/browse/business/marketing" target="_blank">Marketing Learning</a></li>
			<li><a href="https://www.coursera.org/learn/uva-darden-market-analytics" target="_blank">Marketing Analytics</a></li>
			<li><a href="https://www.coursera.org/learn/brand" target="_blank">Brand Management</a></li>
			<li><a href="https://www.coursera.org/learn/bcg-uva-darden-digital-transformation" target="_blank">Digital Transformation</a></li>
			<li><a href="https://www.coursera.org/learn/gamification" target="_blank">Gamification: Marketing tool</a></li>
			<li><a href="https://www.coursera.org/learn/wharton-contagious-viral-marketing" target="_blank">Viral Marketing and How to Craft Contagious Content</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"> <span><a href="https://alison.com/" target="_blank">Alison Online Courses</a></span></div>
		  <ul className="el-list-link">
			<li><a href="https://www.classcentral.com/course/futurelearn-digital-skills-digital-marketing-9778" target="_blank">Growing your Career in Digital Marketing</a></li>
			<li><a href="https://www.futurelearn.com/courses/social-media-analytics" target="_blank">Understanding Social Media Analytics</a></li>
			<li><a href="https://www.futurelearn.com/courses/data-science-google-analytics" target="_blank">Introduction to Data Science with Google Analytics</a></li>
			<li><a href="https://www.futurelearn.com/courses/uva-darden-marketing-analytics" target="_blank">Marketing Analytics</a></li>
			<li><a href="https://www.futurelearn.com/programs/digital-media-analytics" target="_blank">Digital Media Analytics</a></li>
			<li><a href="http://Online Business Success" target="_blank">Success in Online Business</a></li>
			<li><a href="https://www.futurelearn.com/courses/social-media-analytics" target="_blank">Social Media Analytics: Using Data to Understand Public Conversations</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.open.ac.uk/account/createaccount?URL=https://www.open.edu/openlearn/free-courses/full-catalogue" target="_blank">The Open University</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.open.edu/openlearn/money-business/business-strategy-studies/marketing-communications-strategic-function/content-section-0?active-tab=description-tab" target="_blank">Marketing Communications as a Strategic Function</a></li>
			<li><a href="https://www.open.edu/openlearn/money-business/marketing-the-21st-century/content-section-0?active-tab=description-tab" target="_blank">Marketing in the 21st Century</a></li>
			<li><a href="https://www.open.edu/openlearn/money-business/business-strategy-studies/products-services-and-branding/content-section-0?active-tab=description-tab" target="_blank">Products, Services and Branding</a></li>
			<li><a href="https://www.open.edu/openlearn/money-business/business-strategy-studies/social-marketing/content-section-0?active-tab=description-tab" target="_blank">Social Marketing</a></li>
			<li><a href="https://www.open.edu/openlearn/money-management/management/technology-innovation-and-management/content-section-0?active-tab=description-tab" target="_blank">Technology, Innovation and Management</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <p className="el-link-title"> <span><a href="https://app.hubspot.com/signup-v2/crm/step/user-info" target="_blank">HubSpot Academy</a>&nbsp;</span></p>
		  <ul className="el-list-link">
			<li><a href="https://www.open.edu/openlearn/money-business/business-strategy-studies/marketing-communications-strategic-function/content-section-0?active-tab=description-tab" target="_blank">C</a><a href="https://app.hubspot.com/academy/6298623/tracks?categories=MARKETING&status=ALL" target="_blank">ontent Strategy</a></li>
		  </ul>
		</div>
		<div className="el-links">
		<p className="el-link-title"> <span><a href="https://www.clickminded.com/mc-registration-seo-keyword-strategy-2/" target="_blank">ClickMinded</a></span></p>
			<ul className="el-list-link">
			  <li><a href="https://www.clickminded.com/mc-registration-seo-keyword-strategy-2/" target="_blank">SEO Mini-Course</a></li>
			
		</ul>
	  </div>
	  <div className="el-links">
	  <p className="el-link-title"> <span><a href="https://courses.edx.org/register?next=%2Flogout" target="_blank">edX</a></span></p>
	<ul className="el-list-link">
			  
		<li><a href="https://www.open.edu/openlearn/money-business/business-strategy-studies/social-marketing/content-section-0?active-tab=description-tab" target="_blank">M</a><a href="https://www.edx.org/course/marketing-management-1" target="_blank">arketing Management 1</a></li>
		<li><a href="https://www.edx.org/course/marketing-analytics-competitive-analysis-and-market-segmentation-0" target="_blank">Marketing Analytics: Competative Analysis and Market Segmentation</a></li>
		<li><a href="https://www.edx.org/course/marketing-analytics" target="_blank">Marketing Analytics</a></li>
	  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list">
	  
	  <a id="recruitment" name="recruitment" />
	  <div className="el-title">HR / Recruitment</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title">
			<a href="https://www.open.edu/openlearn/free-courses/full-catalogue" target="_blank">The Open University</a>
		  </div>
		  <ul className="el-list-link">
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-management/what-strategic-human-resource-management/content-section-0?intro%3D1&source=gmail&ust=1569662027984000&usg=AFQjCNEHdykP30QplmhOr8oQGkRdyn6Rpw" href="https://www.open.edu/openlearn/money-management/what-strategic-human-resource-management/content-section-0?intro=1" target="_blank">What is Strategic HR?</a>&nbsp;</li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://alison.com/resume/courses/1487&source=gmail&ust=1569662027991000&usg=AFQjCNGG2Tnv_sxbQhVKUowo6rasPclJuQ" href="https://alison.com/resume/courses/1487" target="_blank">Introduction to Modern Human Resource Management</a>&nbsp;</li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/facilitating-group-discussions/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNH30gZpVU7qEjT0FBJy1i8Pdy9Mgg" href="https://www.open.edu/openlearn/money-business/facilitating-group-discussions/content-section-0" target="_blank">Facilitating FGD's</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/education-development/key-skill-assessment-unit-problem-solving/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNE8ZLbU3QzjPqKK1DXm7uLymnVDUw" href="https://www.open.edu/openlearn/education-development/key-skill-assessment-unit-problem-solving/content-section-0" target="_blank">Problem Solving</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/education-development/key-skill-assessment-unit-working-others/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNFmR-JLfooBTWqAzytxR_CvzRzLIw" href="https://www.open.edu/openlearn/education-development/key-skill-assessment-unit-working-others/content-section-0" target="_blank">Working with Others</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/education-development/key-skills-making-difference/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNELD7TWH2EsFYQ2B95f8c67rMXPXA" href="https://www.open.edu/openlearn/education-development/key-skills-making-difference/content-section-0" target="_blank">Making a difference</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/education-development/succeed-the-workplace/content-section-overview&source=gmail&ust=1569662027984000&usg=AFQjCNHjdlKX4oOijQ2KBwJygJ8QgQdeHg" href="https://www.open.edu/openlearn/education-development/succeed-the-workplace/content-section-overview" target="_blank">Succeed in the workplace</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/business-communication-writing-swot-analysis/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNF1f6eayzTJhE-LVfaxlIdwzG-qcw" href="https://www.open.edu/openlearn/money-business/business-communication-writing-swot-analysis/content-section-0" target="_blank">Writing SWOT Analysis</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/languages/learning-second-language/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNE0xjA5d_nMfycvN_CBYwun8a88ag" href="https://www.open.edu/openlearn/languages/learning-second-language/content-section-0" target="_blank">Learning a second language</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/business-strategy-studies/business-organisations-and-their-environments-culture/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNGAeLFasKuSoPNISPhjw0w1DK0uOw" href="https://www.open.edu/openlearn/money-business/business-strategy-studies/business-organisations-and-their-environments-culture/content-section-0" target="_blank">Business environment and Culture</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/business-strategy-studies/conversations-and-interviews/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNEQg7dQni-6fVW1bIzCaWGsH0em7A" href="https://www.open.edu/openlearn/money-business/business-strategy-studies/conversations-and-interviews/content-section-0" target="_blank">Interviewing skills</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/human-resources/human-resources-recruitment-and-selection/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNFF1LreYmu1vLBTtayVXoEcZuQvxg" href="https://www.open.edu/openlearn/money-business/human-resources/human-resources-recruitment-and-selection/content-section-0" target="_blank">Recruitment and Selection</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/developing-career-resilience/content-section-overview&source=gmail&ust=1569662027984000&usg=AFQjCNGoNeds6bElLiQFm8F9ako4GJUeGQ" href="https://www.open.edu/openlearn/money-business/developing-career-resilience/content-section-overview" target="_blank">Developing Career resilience</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/developing-your-skills-hr-professional/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNGk8vdSezFO1RhqwGZo3zeKx5WsKQ" href="https://www.open.edu/openlearn/money-business/developing-your-skills-hr-professional/content-section-0" target="_blank">Developing your skills as an HR Professiona</a><a href="https://www.open.edu/openlearn/money-business/developing-your-skills-hr-professional/content-section-0">l</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-management/discovering-development-management/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNFJ_MrhWhsPVTNK_uIY26H-u49B6g" href="https://www.open.edu/openlearn/money-management/discovering-development-management/content-section-0" target="_blank">Development Management</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/leadership-management/difference-and-challenge-teams/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNGky-3vxYILN_gscd1hbpIqVlsLAA" href="https://www.open.edu/openlearn/money-business/leadership-management/difference-and-challenge-teams/content-section-0" target="_blank">Differences and Conflict management</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/employee-engagement/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNH1dWcL8SrATRCNqUDKVFUJRonV9Q" href="https://www.open.edu/openlearn/money-business/employee-engagement/content-section-0" target="_blank">Employee Engagement</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-management/employment-relations-and-employee-engagement/content-section-0&source=gmail&ust=1569662027984000&usg=AFQjCNELxkEGhekVwv3d9StoCxSdv_HBag" href="https://www.open.edu/openlearn/money-management/employment-relations-and-employee-engagement/content-section-0" target="_blank">Employment Relations and Employee Engagement</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/exploring-career-mentoring-and-coaching/content-section-overview&source=gmail&ust=1569662027985000&usg=AFQjCNHWJZ-_0mlWoGWBLHNfx-CSisJgxA" href="https://www.open.edu/openlearn/money-business/exploring-career-mentoring-and-coaching/content-section-overview" target="_blank">Career mentoring and coaching</a></li>
			<li><a data-saferedirecturl="https://www.google.com/url?q=https://www.open.edu/openlearn/money-business/leadership-management/managing-relationships/content-section-0&source=gmail&ust=1569662027985000&usg=AFQjCNFMUK52WjUCS__qpP0w_HGSVC4TpA" href="https://www.open.edu/openlearn/money-business/leadership-management/managing-relationships/content-section-0" target="_blank">Managing Relationships</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/course/documenting-business-processes-and-information-systems-revised" target="_blank">Documenting Business Processes</a></li>
			<li><a href="https://alison.com/courses/management-and-administration" target="_blank">Operations Management Certification</a></li>
			<li><a href="https://alison.com/course/microsoft-excel-2013-for-beginners-start-your-excel-journey">Learn how to use Basic MS excel</a></li>
			<li><a href="https://alison.com/course/introduction-to-excel-2013-power-business-intelligence">Business Intelligence through MS excel</a></li>
			<li><a href="https://alison.com/course/data-analysis-with-tables-and-pivottables-in-microsoft-excel-2013">Learn Data Analysis and Pivot Table on MS excel</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/fundamentals-of-project-planning-and-management" target="_blank">Fundamentals of Project Management</a></li>
			<li><a href="https://www.futurelearn.com/courses/project-management-principles-practices-systems" target="_blank">Principles of Project Management</a></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="finance" name="finance" />
	  <div className="el-title">Finance</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/uva-darden-financial-accounting">Financial Accounting Fundamentals</a> <em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/financial-accounting-basics">Financial Accounting Foundations</a><em> (new)</em></li>
			<li><a href="https://www.coursera.org/learn/income-statement">Understanding Financial Statements: Company Performance</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/business-assessment">Accounting for Business Decision Making: Strategy Assessment and Control</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/interest-rate-models">Interest Rate&nbsp;Models</a><em> (new)</em></li>
			<li><a href="https://www.coursera.org/learn/erasmus-econometrics">Econometrics: Methods and Applications</a> <em>(new)</em></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/topic/learn/78236/introduction-to-quickbooks-pro-learning-outcomes">Diploma in Quick Books Pro 2017</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/diploma-in-accounting-advanced-controls-and-transactions">Diploma in Accounting: Advanced Controls and Transactions</a> <em>(new)</em></li>
			<li><a href="https://alison.com/course/diploma-in-accounting-core-practices-and-theory">Diploma in Accounting: Core Practices and Thoeries</a> <em>(new)</em></li>
			<li><a href="https://alison.com/course/completing-the-accounting-cycle">Compelting the Accounting Cycle</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/accounting-control-and-monitoring-of-cash">Cash Control Monitoring</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/accounting-understanding-receivables-and-payables">Understanding Payables and Recievables</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/introduction-to-cash-accounting-revised">Introduction to Cash Accounting</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/accounting-merchandising-transactions">Merchandising Transactions</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/accounting-and-its-use-in-business-decisions">Accounting and It's Use for Business Decisions</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://alison.com/course/adjustments-for-financial-reporting">Financial Reporting</a>&nbsp;<em>(new)</em></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/programs/business-finance" target="_blank">Business and Finance Course</a></li>
			<li><a href="https://www.futurelearn.com/courses/personal-financial-planning-and-budgeting">Financial Planning and Budgeting</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.futurelearn.com/courses/understanding-financial-statements">Understanding Financial Statements</a><em> (new)</em></li>
			<li><a href="https://www.futurelearn.com/courses/bookkeeping-financial-accounting">Bookkeeping for Personal and&nbsp;Business Accounting</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.futurelearn.com/courses/what-is-economics-in-the-world-of-global-logistics">Economics in&nbsp;Global Logistics</a>&nbsp;<em>(new)</em></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="project" name="project" />
	  <div className="el-title">Project Management</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/specializations/pwc-analytics" target="_blank">Digital Product Management</a></li>
			<li><a href="https://www.coursera.org/specializations/agile-development" target="_blank">Agile Product Development</a></li>
			<li><a href="https://www.coursera.org/specializations/product-management" target="_blank">Software Product Development</a></li>
			<li><a href="https://www.coursera.org/learn/project-risk-management" target="_blank">Managing Project Risks</a></li>
			<li><a href="https://www.coursera.org/learn/uva-darden-getting-started-agile" target="_blank">Agile Design Thinking</a></li>
			<li><a href="https://www.coursera.org/learn/uva-darden-running-design-sprints" target="_blank">Running Design Sprints</a></li>
		  </ul>
		</div>
	  </div>
	</div>
	{/* end list */}{/* start list */}
	<div className="list"><a id="leadership" name="leadership" />
	  <div className="el-title">Leadership</div>
	  <div className="el-content">
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.coursera.org/?authMode=signup" target="_blank">Coursera</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.coursera.org/learn/people-management?recoOrder=24&utm_medium=email&utm_source=recommendations&utm_campaign=THbLIO7REemHRdu0lvjSqg">The Manager's Toolkit: Managing Effectivel</a><a href="http://www.coursera.org/learn/people-management?recoOrder=24&utm_medium=email&utm_source=recommendations&utm_campaign=THbLIO7REemHRdu0lvjSqg">y</a>&nbsp;<em>(new)</em></li>
			<li><a href="https://www.coursera.org/learn/mindfulness" target="_blank">Mindfulness</a></li>
			<li><a href="https://www.coursera.org/learn/mindshift" target="_blank">Paradigm Shift</a></li>
			<li><a href="https://www.coursera.org/learn/motivate-people-teams" target="_blank">How to Inspire and Motivate</a></li>
			<li><a href="https://www.coursera.org/learn/influencing-people" target="_blank">Influencing People</a></li>
			<li><a href="https://www.coursera.org/learn/motivate-people-teams" target="_blank">Inspiring and Motivating</a></li>
			<li><a href="https://www.coursera.org/learn/personality-types-at-work?recoOrder=19&utm_medium=email&utm_source=recommendations&utm_campaign=Gix78Le0EempyReieZALEQ" target="_blank">Personality Types at Work</a></li>
			<li><a href="https://www.coursera.org/learn/feedback" target="_blank">Giving Helpful Feedback</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://alison.com/" target="_blank">Alison Online Courses</a></div>
		  <ul className="el-list-link">
			<li><a href="https://alison.com/resume/courses/1223" target="_blank">Managing Employee Performance</a></li>
			<li><a href="https://alison.com/resume/courses/1214" target="_blank">Effective Communication Skills as a Leader</a></li>
			<li><a href="https://alison.com/resume/courses/1228" target="_blank">Team Collaboration</a></li>
		  </ul>
		</div>
		<div className="el-links">
		  <div className="el-link-title"><a href="https://www.futurelearn.com" target="_blank">Future Learn</a></div>
		  <ul className="el-list-link">
			<li><a href="https://www.futurelearn.com/courses/introduction-to-engagement-and-motivation-at-work" target="_blank">Happiness for Your Teams</a></li>
			<li><a href="https://www.futurelearn.com/courses/growing-as-a-manager" target="_blank">Growing as a Manager</a></li>
			<li><a href="https://www.futurelearn.com/courses/planning-your-personal-development" target="_blank">Planning Your Growth</a></li>
			<li><a href="https://www.futurelearn.com/programs/blended-learning-essentials" target="_blank">Blended Manager's Toolkit</a></li>
		  </ul>
		</div>
	  </div>
	</div>
	</div>
	</ContainerWrapper>;
  }
}

export default EVLearning;








